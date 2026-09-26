import { Chess } from 'chess.js';
import type { Server, Socket } from 'socket.io';
import { normalizeLobbyTimeControl } from '../constants/time-controls';
import {
  ratingFormatEloOnUser,
  timeControlToRatingFormat,
} from '../constants/rating-format';
import { verifyAccessToken } from '../utils/jwt';
import { prisma } from '../models';
import * as gameService from '../services/game.service';
import * as tournamentService from '../services/tournament.service';
import { HttpError } from '../types';
import { activeGames, type ActiveGameEntry } from './active-games';
import {
  onSocialConnect,
  onSocialDisconnect,
  registerSocialChatHandlers,
} from './social.socket';

/** ELO difference allowed for auto-matchmaking (env MATCHMAKING_ELO_RANGE). */
const ELO_RANGE = (() => {
  const n = Number(process.env.MATCHMAKING_ELO_RANGE ?? 400);
  return Number.isFinite(n) ? Math.min(2000, Math.max(50, Math.floor(n))) : 400;
})();

export type { ActiveGameEntry };
export { activeGames };

export type QueueEntry = {
  userId: string;
  socketId: string;
  elo: number;
  timeControl: string;
};

export const waitingQueue: QueueEntry[] = [];

const DISCONNECT_GRACE_MS = 8000;
const disconnectGraceTimers = new Map<string, ReturnType<typeof setTimeout>>();

function graceKey(gameId: string, uid: string): string {
  return `${gameId}:${uid}`;
}

function clearDisconnectGrace(gameId: string, uid: string): void {
  const k = graceKey(gameId, uid);
  const t = disconnectGraceTimers.get(k);
  if (t) {
    clearTimeout(t);
    disconnectGraceTimers.delete(k);
  }
}

let matchmakingInterval: ReturnType<typeof setInterval> | null = null;
let matchmakingBusy = false;

function shuffleWhiteBlack(
  a: QueueEntry,
  b: QueueEntry
): [QueueEntry, QueueEntry] {
  return Math.random() < 0.5 ? [a, b] : [b, a];
}

function findMatchablePair(queue: QueueEntry[]): [number, number] | null {
  for (let i = 0; i < queue.length; i++) {
    for (let j = i + 1; j < queue.length; j++) {
      if (
        queue[i].timeControl === queue[j].timeControl &&
        Math.abs(queue[i].elo - queue[j].elo) <= ELO_RANGE
      ) {
        return [i, j];
      }
    }
  }
  return null;
}

function removeQueueIndices(queue: QueueEntry[], i: number, j: number): void {
  const hi = Math.max(i, j);
  const lo = Math.min(i, j);
  queue.splice(hi, 1);
  queue.splice(lo, 1);
}

function clearActiveGameMeta(socket: Socket | undefined): void {
  if (!socket) return;
  delete socket.data.activeGameId;
  delete socket.data.activeColor;
}

/** Start the grace period that forfeits an unfinished game if the player does not rejoin. */
function scheduleDisconnectForfeit(
  io: Server,
  gameId: string,
  userId: string
): void {
  const dk = graceKey(gameId, userId);
  const prev = disconnectGraceTimers.get(dk);
  if (prev) {
    clearTimeout(prev);
    disconnectGraceTimers.delete(dk);
  }

  io.to(`game:${gameId}`).emit('game:opponent-away', {
    gameId,
    userId,
    graceMs: DISCONNECT_GRACE_MS,
  });

  const t = setTimeout(() => {
    disconnectGraceTimers.delete(dk);
    const reconnected = [...io.sockets.sockets.values()].some(
      (s) =>
        s.connected &&
        s.data.userId === userId &&
        s.data.activeGameId === gameId
    );
    if (reconnected) {
      return;
    }
    void (async () => {
      const final = await gameService.abortGameByDisconnect(gameId, userId);
      if (final) {
        io.to(`game:${gameId}`).emit('game:end', {
          winner: final.winner,
          reason: 'disconnect',
          game: final,
        });
      }
      activeGames.delete(gameId);
      for (const s of io.sockets.sockets.values()) {
        if (s.data.activeGameId === gameId) {
          clearActiveGameMeta(s);
        }
      }
    })();
  }, DISCONNECT_GRACE_MS);
  disconnectGraceTimers.set(dk, t);
}

async function tryMatch(io: Server): Promise<void> {
  if (matchmakingBusy || waitingQueue.length < 2) return;
  const pair = findMatchablePair(waitingQueue);
  if (!pair) return;

  matchmakingBusy = true;
  const [i, j] = pair;
  const entryA = waitingQueue[i];
  const entryB = waitingQueue[j];

  removeQueueIndices(waitingQueue, i, j);

  const [whiteEntry, blackEntry] = shuffleWhiteBlack(entryA, entryB);

  try {
    const [whiteUser, blackUser] = await Promise.all([
      prisma.user.findUnique({
        where: { id: whiteEntry.userId },
        select: { username: true },
      }),
      prisma.user.findUnique({
        where: { id: blackEntry.userId },
        select: { username: true },
      }),
    ]);
    const opponentNameForWhite = blackUser?.username ?? 'Opponent';
    const opponentNameForBlack = whiteUser?.username ?? 'Opponent';

    const game = await gameService.createGame(
      whiteEntry.userId,
      blackEntry.userId,
      { timeControl: whiteEntry.timeControl }
    );

    const chess = new Chess(game.fen);
    activeGames.set(game.id, {
      gameId: game.id,
      white: {
        userId: whiteEntry.userId,
        socketId: whiteEntry.socketId,
      },
      black: {
        userId: blackEntry.userId,
        socketId: blackEntry.socketId,
      },
      gameInstance: chess,
      startTime: Date.now(),
    });

    const sockW = io.sockets.sockets.get(whiteEntry.socketId);
    const sockB = io.sockets.sockets.get(blackEntry.socketId);

    await Promise.all([
      sockW?.join(`game:${game.id}`),
      sockB?.join(`game:${game.id}`),
    ]);

    if (sockW) {
      sockW.data.activeGameId = game.id;
      sockW.data.activeColor = 'white';
    }
    if (sockB) {
      sockB.data.activeGameId = game.id;
      sockB.data.activeColor = 'black';
    }

    sockW?.emit('match:found', {
      gameId: game.id,
      color: 'white',
      opponentUsername: opponentNameForWhite,
      game,
    });
    sockB?.emit('match:found', {
      gameId: game.id,
      color: 'black',
      opponentUsername: opponentNameForBlack,
      game,
    });
  } catch (err) {
    console.error('[matchmaking] createGame failed:', err);
  } finally {
    matchmakingBusy = false;
  }
}

function ackError(
  ack: ((r: unknown) => void) | undefined,
  message: string,
  status?: number
): void {
  ack?.({ ok: false, error: message, status });
}

export function registerGameSockets(io: Server): void {
  io.use((socket, next) => {
    const raw = socket.handshake.auth as { token?: string } | undefined;
    const tokenFromAuth = typeof raw?.token === 'string' ? raw.token : '';
    const cookieHeader = socket.handshake.headers.cookie ?? '';
    const tokenFromCookie = (() => {
      const parts = cookieHeader.split(';');
      for (const p of parts) {
        const [k, ...rest] = p.trim().split('=');
        if (k === 'square_one_access_token') {
          return decodeURIComponent(rest.join('='));
        }
      }
      return '';
    })();
    const token = tokenFromAuth || tokenFromCookie;
    if (!token) {
      next(new Error('Unauthorized: missing token'));
      return;
    }
    try {
      const payload = verifyAccessToken(token);
      socket.data.userId = payload.sub;
      next();
    } catch {
      next(new Error('Unauthorized: invalid token'));
    }
  });

  if (!matchmakingInterval) {
    matchmakingInterval = setInterval(() => {
      void tryMatch(io);
    }, 2000);
  }

  io.on('connection', (socket: Socket) => {
    const userId = socket.data.userId;

    void onSocialConnect(io, socket, userId).catch((err) =>
      console.error('[social connect]', err)
    );
    registerSocialChatHandlers(io, socket);

    socket.on('queue:join', async (...args: unknown[]) => {
      let payload: { timeControl?: string } = {};
      let ack: ((r: unknown) => void) | undefined;
      const last = args[args.length - 1];
      if (typeof last === 'function') {
        ack = last as (r: unknown) => void;
        if (
          args.length >= 2 &&
          typeof args[0] === 'object' &&
          args[0] !== null &&
          !Array.isArray(args[0])
        ) {
          payload = args[0] as { timeControl?: string };
        }
      }
      try {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            elo: true,
            eloBullet: true,
            eloBlitz: true,
            eloRapid: true,
          },
        });
        if (!user) {
          ackError(ack, 'User not found', 404);
          return;
        }

        const idx = waitingQueue.findIndex((q) => q.userId === userId);
        if (idx >= 0) {
          waitingQueue.splice(idx, 1);
        }

        const timeControl = normalizeLobbyTimeControl(payload?.timeControl);
        const format = timeControlToRatingFormat(timeControl);
        const queueElo = ratingFormatEloOnUser(user, format);

        waitingQueue.push({
          userId,
          socketId: socket.id,
          elo: queueElo,
          timeControl,
        });

        const position = waitingQueue.length;

        ack?.({
          ok: true,
          queueSize: waitingQueue.length,
          position,
        });
      } catch (e) {
        console.error('[queue:join]', e);
        ackError(ack, 'Failed to join queue', 500);
      }
    });

    socket.on('queue:leave', (ack?: (r: unknown) => void) => {
      const idx = waitingQueue.findIndex((q) => q.socketId === socket.id);
      if (idx >= 0) {
        waitingQueue.splice(idx, 1);
      }
      ack?.({ ok: true });
    });

    socket.on('queue:status', (ack?: (r: unknown) => void) => {
      const idx = waitingQueue.findIndex((q) => q.socketId === socket.id);
      ack?.({
        ok: true,
        queueSize: waitingQueue.length,
        inQueue: idx >= 0,
        position: idx >= 0 ? idx + 1 : null,
      });
    });

    socket.on(
      'game:join',
      async (
        payload: { gameId?: string },
        ack?: (r: unknown) => void
      ) => {
        try {
          const gameId = payload?.gameId;
          if (!gameId) {
            ackError(ack, 'gameId is required', 400);
            return;
          }
          const game = await prisma.game.findUnique({
            where: { id: gameId },
          });
          if (!game) {
            ackError(ack, 'Game not found', 404);
            return;
          }
          if (
            game.whitePlayerId !== userId &&
            game.blackPlayerId !== userId
          ) {
            ackError(ack, 'Forbidden', 403);
            return;
          }
          clearDisconnectGrace(gameId, userId);
          await socket.join(`game:${gameId}`);
          socket.data.activeGameId = gameId;
          socket.data.activeColor =
            game.whitePlayerId === userId ? 'white' : 'black';
          const session = await gameService.getGameSession(gameId, userId);
          ack?.({ ok: true, ...session });
        } catch (e) {
          console.error('[game:join]', e);
          ackError(ack, 'Failed to join game', 500);
        }
      }
    );

    socket.on(
      'game:leave',
      async (payload: { gameId?: string }, ack?: (r: unknown) => void) => {
        const gameId = payload?.gameId ?? socket.data.activeGameId;
        if (!gameId) {
          clearActiveGameMeta(socket);
          ack?.({ ok: true });
          return;
        }

        void socket.leave(`game:${gameId}`);

        try {
          const game = await prisma.game.findUnique({ where: { id: gameId } });
          const stillPlaying =
            !!game &&
            game.status !== 'finished' &&
            (game.whitePlayerId === userId || game.blackPlayerId === userId);

          // Soft leave (navigate away) used to clear activeGameId and skip forfeit.
          // Treat leaving an unfinished game like a disconnect: grace, then abort.
          if (stillPlaying) {
            clearActiveGameMeta(socket);
            scheduleDisconnectForfeit(io, gameId, userId);
          } else {
            clearDisconnectGrace(gameId, userId);
            clearActiveGameMeta(socket);
          }
        } catch (e) {
          console.error('[game:leave]', e);
          clearActiveGameMeta(socket);
        }
        ack?.({ ok: true });
      }
    );

    socket.on(
      'draw:offer',
      async (
        payload: { gameId?: string },
        ack?: (r: unknown) => void
      ) => {
        try {
          const gameId = payload?.gameId;
          if (!gameId) {
            ackError(ack, 'gameId is required', 400);
            return;
          }
          const game = await prisma.game.findUnique({
            where: { id: gameId },
          });
          if (!game) {
            ackError(ack, 'Game not found', 404);
            return;
          }
          if (
            game.whitePlayerId !== userId &&
            game.blackPlayerId !== userId
          ) {
            ackError(ack, 'Forbidden', 403);
            return;
          }
          if (game.status === 'finished') {
            ackError(ack, 'Game is already finished', 400);
            return;
          }
          gameService.setDrawOffer(gameId, userId);
          socket.to(`game:${gameId}`).emit('draw:offered', {
            fromUserId: userId,
          });
          ack?.({ ok: true });
        } catch (e) {
          console.error('[draw:offer]', e);
          ackError(ack, 'Failed to offer draw', 500);
        }
      }
    );

    socket.on(
      'draw:accept',
      async (
        payload: { gameId?: string },
        ack?: (r: unknown) => void
      ) => {
        try {
          const gameId = payload?.gameId;
          if (!gameId) {
            ackError(ack, 'gameId is required', 400);
            return;
          }
          const final = await gameService.acceptAgreedDraw(gameId, userId);
          ack?.({ ok: true, game: final });
        } catch (e) {
          if (e instanceof HttpError) {
            ackError(ack, e.message, e.statusCode);
          } else {
            console.error('[draw:accept]', e);
            ackError(ack, 'Failed to accept draw', 500);
          }
        }
      }
    );

    socket.on(
      'draw:decline',
      async (
        payload: { gameId?: string },
        ack?: (r: unknown) => void
      ) => {
        try {
          const gameId = payload?.gameId;
          if (!gameId) {
            ackError(ack, 'gameId is required', 400);
            return;
          }
          const game = await prisma.game.findUnique({
            where: { id: gameId },
          });
          if (!game) {
            ackError(ack, 'Game not found', 404);
            return;
          }
          if (
            game.whitePlayerId !== userId &&
            game.blackPlayerId !== userId
          ) {
            ackError(ack, 'Forbidden', 403);
            return;
          }
          gameService.clearDrawOffer(gameId);
          socket.to(`game:${gameId}`).emit('draw:declined', {
            byUserId: userId,
          });
          ack?.({ ok: true });
        } catch (e) {
          console.error('[draw:decline]', e);
          ackError(ack, 'Failed to decline draw', 500);
        }
      }
    );

    socket.on(
      'game:move',
      async (
        payload: {
          gameId?: string;
          from?: string;
          to?: string;
          promotion?: 'q' | 'r' | 'b' | 'n';
        },
        ack?: (r: unknown) => void
      ) => {
        try {
          const gameId = payload?.gameId;
          const from = payload?.from;
          const to = payload?.to;
          if (!gameId || !from || !to) {
            ackError(ack, 'gameId, from, and to are required', 400);
            return;
          }

          const promotion = (payload.promotion ?? 'q') as
            | 'q'
            | 'r'
            | 'b'
            | 'n';

          const result = await gameService.makeMove(
            gameId,
            from,
            to,
            promotion,
            userId
          );

          const entry = activeGames.get(gameId);
          if (entry) {
            entry.gameInstance.load(result.fen);
          }

          io.to(`game:${gameId}`).emit('game:moved', {
            gameId,
            from,
            to,
            promotion,
            game: result,
          });

          if (result.status === 'finished') {
            io.to(`game:${gameId}`).emit('game:end', {
              winner: result.winner,
              game: result,
            });
            activeGames.delete(gameId);
            for (const s of io.sockets.sockets.values()) {
              if (s.data.activeGameId === gameId) {
                clearActiveGameMeta(s);
              }
            }
          }

          ack?.({ ok: true, game: result });
        } catch (e) {
          if (e instanceof HttpError) {
            ackError(ack, e.message, e.statusCode);
          } else {
            console.error('[game:move]', e);
            ackError(ack, 'Move failed', 500);
          }
        }
      }
    );

    socket.on(
      'tournament:subscribe',
      async (
        payload: { tournamentId?: string },
        ack?: (r: unknown) => void
      ) => {
        try {
          const tid = payload?.tournamentId;
          if (!tid) {
            ack?.({ ok: false, error: 'tournamentId required' });
            return;
          }
          await tournamentService.assertTournamentMember(userId, tid);
          await socket.join(`tournament:${tid}`);
          ack?.({ ok: true });
        } catch (e) {
          if (e instanceof HttpError) {
            ack?.({ ok: false, error: e.message });
          } else {
            console.error('[tournament:subscribe]', e);
            ack?.({ ok: false, error: 'subscribe failed' });
          }
        }
      }
    );

    socket.on(
      'tournament:chat',
      async (
        payload: { tournamentId?: string; text?: string },
        ack?: (r: unknown) => void
      ) => {
        try {
          const tid = payload?.tournamentId;
          const text = payload?.text;
          if (!tid || text === undefined) {
            ack?.({ ok: false, error: 'tournamentId and text required' });
            return;
          }
          const msg = await tournamentService.postChatMessage(
            userId,
            tid,
            text
          );
          io.to(`tournament:${tid}`).emit('tournament:chat', msg);
          ack?.({ ok: true, message: msg });
        } catch (e) {
          if (e instanceof HttpError) {
            ack?.({ ok: false, error: e.message });
          } else {
            console.error('[tournament:chat]', e);
            ack?.({ ok: false, error: 'chat failed' });
          }
        }
      }
    );

    socket.on('disconnect', () => {
      const disconnectedUserId = userId;

      const qIdx = waitingQueue.findIndex((q) => q.socketId === socket.id);
      if (qIdx >= 0) {
        waitingQueue.splice(qIdx, 1);
      }

      const activeId = socket.data.activeGameId as string | undefined;
      if (activeId) {
        scheduleDisconnectForfeit(io, activeId, disconnectedUserId);
      }

      onSocialDisconnect(io, disconnectedUserId);
    });
  });
}
