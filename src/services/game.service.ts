import { Chess, type Move as ChessMove, type Square } from 'chess.js';
import type { Game, Prisma } from '@prisma/client';
import { normalizeLobbyTimeControl } from '../constants/time-controls';
import {
  ratingFormatEloOnUser,
  timeControlToRatingFormat,
} from '../constants/rating-format';
import { prisma } from '../models';
import { HttpError } from '../types';
import type {
  BoardCell,
  BoardStateResponse,
  GameHistoryPageResponse,
  GameHistoryPageRow,
  GameHistorySort,
  GameResponse,
  GameSessionResponse,
  MoveHistoryEntry,
  ProfileGameHistoryRow,
  RecentGameSummary,
  ValidMoveEntry,
} from '../types';
import { getSocketServer } from '../sockets/io';
import { activeGames } from '../sockets/active-games';
import { applyFinishedGameStats } from './stats.service';
import { OPEN_SEAT_USER_ID } from '../constants/openSeat';
import { predictMoves } from './ai.service';

async function callTournamentHook(gameId: string): Promise<void> {
  try {
    const { onTournamentGameFinished } = await import('./tournament.service');
    await onTournamentGameFinished(gameId);
  } catch (e) {
    console.error('[tournament hook]', e);
  }
}

function detachSocketsFromGame(gameId: string): void {
  const io = getSocketServer();
  if (!io) {
    return;
  }
  for (const s of io.sockets.sockets.values()) {
    if (s.data.activeGameId === gameId) {
      delete s.data.activeGameId;
      delete s.data.activeColor;
    }
  }
}

/** gameId → userId of the player who offered a draw (agreement pending). */
const pendingDrawOfferByGame = new Map<string, string>();

export function clearDrawOffer(gameId: string): void {
  pendingDrawOfferByGame.delete(gameId);
}

export function setDrawOffer(gameId: string, fromUserId: string): void {
  pendingDrawOfferByGame.set(gameId, fromUserId);
}

export function getDrawOffer(gameId: string): string | undefined {
  return pendingDrawOfferByGame.get(gameId);
}

function toGameResponse(game: Game): GameResponse {
  return {
    id: game.id,
    fen: game.fen,
    pgn: game.pgn,
    status: game.status,
    winner: game.winner,
    whitePlayerId: game.whitePlayerId,
    blackPlayerId: game.blackPlayerId,
    startedAt: game.startedAt.toISOString(),
    endedAt: game.endedAt?.toISOString() ?? null,
    timeControl: game.timeControl ?? '10+0',
  };
}

function chessFromFen(fen: string): Chess {
  return new Chess(fen);
}

function mapOutcome(chess: Chess): {
  finished: boolean;
  winner: string | null;
} {
  if (chess.isCheckmate()) {
    const winner = chess.turn() === 'w' ? 'black' : 'white';
    return { finished: true, winner };
  }
  if (chess.isStalemate() || chess.isDraw()) {
    return { finished: true, winner: null };
  }
  return { finished: false, winner: null };
}

function assertParticipant(game: Game, userId: string): void {
  if (game.whitePlayerId !== userId && game.blackPlayerId !== userId) {
    throw new HttpError(403, 'You are not a player in this game');
  }
}

function assertTurn(game: Game, userId: string, chess: Chess): void {
  const turn = chess.turn();
  if (turn === 'w' && game.whitePlayerId !== userId) {
    throw new HttpError(403, 'White to move');
  }
  if (turn === 'b' && game.blackPlayerId !== userId) {
    throw new HttpError(403, 'Black to move');
  }
}

export async function loadGameOrThrow(gameId: string): Promise<Game> {
  const game = await prisma.game.findUnique({ where: { id: gameId } });
  if (!game) {
    throw new HttpError(404, 'Game not found');
  }
  return game;
}

export async function createGame(
  whitePlayerId: string,
  blackPlayerId: string,
  options?: { timeControl?: string }
): Promise<GameResponse> {
  if (whitePlayerId === blackPlayerId) {
    throw new HttpError(400, 'White and black players must be different');
  }

  const [white, black] = await Promise.all([
    prisma.user.findUnique({ where: { id: whitePlayerId } }),
    prisma.user.findUnique({ where: { id: blackPlayerId } }),
  ]);
  if (!white || !black) {
    throw new HttpError(400, 'One or both players do not exist');
  }

  const timeControl = normalizeLobbyTimeControl(options?.timeControl);

  const chess = new Chess();
  const game = await prisma.game.create({
    data: {
      whitePlayerId,
      blackPlayerId,
      fen: chess.fen(),
      pgn: null,
      status: 'active',
      timeControl,
    },
  });

  return toGameResponse(game);
}

export async function createBotGame(
  userId: string,
  options?: { color?: 'white' | 'black'; timeControl?: string; difficulty?: 'easy' | 'medium' | 'hard' }
): Promise<GameResponse> {
  const color = options?.color ?? 'white';
  const whitePlayerId = color === 'white' ? userId : OPEN_SEAT_USER_ID;
  const blackPlayerId = color === 'white' ? OPEN_SEAT_USER_ID : userId;
  const g = await createGame(whitePlayerId, blackPlayerId, { timeControl: options?.timeControl });
  // Persist difficulty on the Game row for bot move generation.
  const diff = options?.difficulty ?? 'medium';
  await prisma.game.update({
    where: { id: g.id },
    data: { botDifficulty: diff },
  });
  return g;
}

function pickPromotionForFromTo(chess: Chess, from: string, to: string): 'q' | 'r' | 'b' | 'n' {
  const legal = chess.moves({ verbose: true }) as ChessMove[];
  const matches = legal.filter((m) => String(m.from) === from && String(m.to) === to);
  if (!matches.length) {
    return 'q';
  }
  const prefer = matches.find((m) => m.promotion === 'q');
  const any = prefer ?? matches[0]!;
  return (any.promotion as 'q' | 'r' | 'b' | 'n' | undefined) ?? 'q';
}

export async function makeMove(
  gameId: string,
  from: string,
  to: string,
  promotion: 'q' | 'r' | 'b' | 'n' = 'q',
  actingUserId: string
): Promise<GameResponse> {
  const game = await loadGameOrThrow(gameId);
  assertParticipant(game, actingUserId);

  if (game.status === 'finished') {
    throw new HttpError(400, 'Game is already finished');
  }

  const chess = chessFromFen(game.fen);
  assertTurn(game, actingUserId, chess);

  const result = chess.move({
    from,
    to,
    promotion,
  });

  if (!result) {
    throw new HttpError(400, 'Illegal move');
  }

  const outcome = mapOutcome(chess);
  const moveCount = await prisma.move.count({ where: { gameId } });

  await prisma.move.create({
    data: {
      gameId,
      moveNumber: moveCount + 1,
      fromSquare: String(result.from),
      toSquare: String(result.to),
      piece: result.piece,
      promotion: result.promotion ?? null,
      fen: chess.fen(),
    },
  });

  let nextStatus: string;
  if (outcome.finished) {
    nextStatus = 'finished';
  } else if (game.status === 'waiting') {
    nextStatus = 'active';
  } else {
    nextStatus = game.status;
  }

  const updated = await prisma.game.update({
    where: { id: gameId },
    data: {
      fen: chess.fen(),
      pgn: chess.pgn() || null,
      status: nextStatus,
      ...(outcome.finished
        ? { winner: outcome.winner, endedAt: new Date() }
        : {}),
    },
  });

  if (outcome.finished) {
    await applyFinishedGameStats({
      whitePlayerId: updated.whitePlayerId,
      blackPlayerId: updated.blackPlayerId,
      winner: updated.winner,
      timeControl: updated.timeControl ?? '10+0',
    });
    void callTournamentHook(gameId);
  }

  clearDrawOffer(gameId);

  const response = toGameResponse(updated);
  getSocketServer()?.to(`game:${gameId}`).emit('game:state', response);

  // If this is a bot game (open-seat) and the human just played, auto-play bot reply.
  const isBotGame =
    updated.whitePlayerId === OPEN_SEAT_USER_ID ||
    updated.blackPlayerId === OPEN_SEAT_USER_ID;
  const humanJustPlayed = actingUserId !== OPEN_SEAT_USER_ID;
  if (!outcome.finished && isBotGame && humanJustPlayed) {
    try {
      const chessNow = chessFromFen(updated.fen);
      const gameRow = await prisma.game.findUnique({
        where: { id: gameId },
        select: { botDifficulty: true },
      });
      const difficulty = gameRow?.botDifficulty ?? 'medium';
      // Current implementation: use stockfish/heuristic suggestions.
      // Difficulty control:
      // - hard: always best (request 1 suggestion)
      // - medium: best (request 3 suggestions)
      // - easy: sometimes 2nd best (request 3 suggestions)
      const suggestions = await predictMoves(
        chessNow.fen(),
        difficulty === 'hard' ? 1 : 3
      );
      const best = suggestions[0];
      const pick =
        difficulty === 'easy' && suggestions.length > 1
          ? suggestions[1]!
          : best;
      if (pick) {
        const prom = pickPromotionForFromTo(chessNow, pick.from, pick.to);
        // Apply bot move as OPEN_SEAT player.
        const botResult = await makeMove(
          gameId,
          pick.from,
          pick.to,
          prom,
          OPEN_SEAT_USER_ID
        );
        return botResult;
      }
    } catch (e) {
      console.error('[bot] move generation failed', e);
      // Fall back to returning human move result.
    }
  }

  return response;
}

function boardToResponse(
  board: ReturnType<Chess['board']>
): BoardCell[][] {
  return board.map((row) =>
    row.map((cell) =>
      cell === null
        ? null
        : {
            square: cell.square,
            type: cell.type,
            color: cell.color,
          }
    )
  );
}

export async function getBoardState(
  gameId: string,
  viewerId: string
): Promise<BoardStateResponse> {
  const game = await loadGameOrThrow(gameId);
  assertParticipant(game, viewerId);

  const chess = chessFromFen(game.fen);
  return {
    fen: chess.fen(),
    board: boardToResponse(chess.board()),
  };
}

export async function isGameOver(
  gameId: string,
  viewerId: string
): Promise<boolean> {
  const game = await loadGameOrThrow(gameId);
  assertParticipant(game, viewerId);
  return chessFromFen(game.fen).isGameOver();
}

export async function getWinner(
  gameId: string,
  viewerId: string
): Promise<'white' | 'black' | null> {
  const game = await loadGameOrThrow(gameId);
  assertParticipant(game, viewerId);
  const chess = chessFromFen(game.fen);
  if (!chess.isGameOver()) {
    return null;
  }
  if (chess.isCheckmate()) {
    return chess.turn() === 'w' ? 'black' : 'white';
  }
  return null;
}

export interface ChessStatusPayload {
  isGameOver: boolean;
  winner: 'white' | 'black' | null;
  inCheck: boolean;
  isCheckmate: boolean;
  isStalemate: boolean;
  isDraw: boolean;
  turn: 'white' | 'black';
}

export async function getChessStatus(
  gameId: string,
  viewerId: string
): Promise<ChessStatusPayload> {
  const game = await loadGameOrThrow(gameId);
  assertParticipant(game, viewerId);
  const chess = chessFromFen(game.fen);
  const winner = chess.isCheckmate()
    ? chess.turn() === 'w'
      ? 'black'
      : 'white'
    : null;
  return {
    isGameOver: chess.isGameOver(),
    winner,
    inCheck: chess.isCheck(),
    isCheckmate: chess.isCheckmate(),
    isStalemate: chess.isStalemate(),
    isDraw: chess.isDraw(),
    turn: chess.turn() === 'w' ? 'white' : 'black',
  };
}

const playerPreview = {
  id: true,
  username: true,
  elo: true,
  eloBullet: true,
  eloBlitz: true,
  eloRapid: true,
} as const;

function toGamePlayerPreview(
  p: {
    id: string;
    username: string;
    elo: number;
    eloBullet: number;
    eloBlitz: number;
    eloRapid: number;
  },
  timeControl: string
): import('../types').GamePlayerPreview {
  const fmt = timeControlToRatingFormat(timeControl);
  return {
    id: p.id,
    username: p.username,
    elo: ratingFormatEloOnUser(p, fmt),
    eloBullet: p.eloBullet,
    eloBlitz: p.eloBlitz,
    eloRapid: p.eloRapid,
  };
}

export async function getGameSession(
  gameId: string,
  viewerId: string
): Promise<GameSessionResponse> {
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: {
      whitePlayer: { select: playerPreview },
      blackPlayer: { select: playerPreview },
    },
  });
  if (!game) {
    throw new HttpError(404, 'Game not found');
  }
  assertParticipant(game, viewerId);
  const myColor =
    game.whitePlayerId === viewerId ? ('white' as const) : ('black' as const);
  const opponent =
    myColor === 'white' ? game.blackPlayer : game.whitePlayer;
  const self = myColor === 'white' ? game.whitePlayer : game.blackPlayer;
  const tc = game.timeControl ?? '10+0';
  return {
    game: toGameResponse(game),
    myColor,
    opponent: toGamePlayerPreview(opponent, tc),
    self: toGamePlayerPreview(self, tc),
    timeControl: tc,
  };
}

export async function resignGame(
  gameId: string,
  userId: string
): Promise<GameResponse> {
  const game = await loadGameOrThrow(gameId);
  assertParticipant(game, userId);
  if (game.status === 'finished') {
    throw new HttpError(400, 'Game is already finished');
  }
  clearDrawOffer(gameId);
  const winner = game.whitePlayerId === userId ? 'black' : 'white';
  const updated = await prisma.game.update({
    where: { id: gameId },
    data: {
      status: 'finished',
      winner,
      endedAt: new Date(),
    },
  });
  await applyFinishedGameStats({
    whitePlayerId: updated.whitePlayerId,
    blackPlayerId: updated.blackPlayerId,
    winner: updated.winner,
    timeControl: game.timeControl ?? '10+0',
  });
  void callTournamentHook(gameId);
  const response = toGameResponse(updated);
  getSocketServer()?.to(`game:${gameId}`).emit('game:end', {
    winner,
    reason: 'resign',
    game: response,
  });
  activeGames.delete(gameId);
  detachSocketsFromGame(gameId);
  return response;
}

export async function acceptAgreedDraw(
  gameId: string,
  acceptingUserId: string
): Promise<GameResponse> {
  const offererId = pendingDrawOfferByGame.get(gameId);
  if (!offererId || offererId === acceptingUserId) {
    throw new HttpError(400, 'No pending draw offer from your opponent');
  }
  const game = await loadGameOrThrow(gameId);
  assertParticipant(game, acceptingUserId);
  if (
    game.whitePlayerId !== offererId &&
    game.blackPlayerId !== offererId
  ) {
    throw new HttpError(400, 'Stale draw offer');
  }
  if (game.status === 'finished') {
    clearDrawOffer(gameId);
    throw new HttpError(400, 'Game is already finished');
  }
  pendingDrawOfferByGame.delete(gameId);
  const updated = await prisma.game.update({
    where: { id: gameId },
    data: {
      status: 'finished',
      winner: null,
      endedAt: new Date(),
    },
  });
  await applyFinishedGameStats({
    whitePlayerId: updated.whitePlayerId,
    blackPlayerId: updated.blackPlayerId,
    winner: updated.winner,
    timeControl: game.timeControl ?? '10+0',
  });
  void callTournamentHook(gameId);
  const response = toGameResponse(updated);
  getSocketServer()?.to(`game:${gameId}`).emit('game:end', {
    winner: null,
    reason: 'draw',
    game: response,
  });
  activeGames.delete(gameId);
  detachSocketsFromGame(gameId);
  return response;
}

function verboseMoveToEntry(m: ChessMove): ValidMoveEntry {
  return {
    san: m.san,
    from: String(m.from),
    to: String(m.to),
    promotion: m.promotion,
    flags: m.flags,
    piece: m.piece,
    captured: m.captured,
  };
}

export async function getValidMoves(
  gameId: string,
  square: string,
  viewerId: string
): Promise<ValidMoveEntry[]> {
  const game = await loadGameOrThrow(gameId);
  assertParticipant(game, viewerId);

  const chess = chessFromFen(game.fen);
  if (chess.isGameOver()) {
    return [];
  }

  const raw = chess.moves({
    square: square as Square,
    verbose: true,
  }) as ChessMove[];

  return raw.map(verboseMoveToEntry);
}

export async function getMoveHistoryVerbose(
  gameId: string,
  viewerId: string
): Promise<MoveHistoryEntry[]> {
  const gameMeta = await loadGameOrThrow(gameId);
  assertParticipant(gameMeta, viewerId);
  const rows = await prisma.move.findMany({
    where: { gameId },
    orderBy: { moveNumber: 'asc' },
  });

  const chess = new Chess();
  const history: MoveHistoryEntry[] = [];
  for (const r of rows) {
    const m = chess.move({
      from: r.fromSquare,
      to: r.toSquare,
      promotion: r.promotion ?? undefined,
    });
    if (!m) {
      throw new HttpError(
        500,
        'Stored moves do not form a legal sequence; use database repair'
      );
    }
    history.push({
      san: m.san,
      from: r.fromSquare,
      to: r.toSquare,
      promotion: r.promotion,
    });
  }

  const game = await prisma.game.findUniqueOrThrow({ where: { id: gameId } });
  if (chess.fen() !== game.fen) {
    throw new HttpError(500, 'Move history does not match current FEN');
  }

  return history;
}

export async function getMoveHistory(
  gameId: string,
  viewerId: string
): Promise<string[]> {
  const verbose = await getMoveHistoryVerbose(gameId, viewerId);
  return verbose.map((e) => e.san);
}

export async function exportPGN(
  gameId: string,
  viewerId: string
): Promise<string> {
  const game = await loadGameOrThrow(gameId);
  assertParticipant(game, viewerId);
  if (game.pgn && game.pgn.trim() !== '') {
    return game.pgn;
  }
  const chess = chessFromFen(game.fen);
  return chess.pgn();
}

export async function getGamesForUser(userId: string): Promise<GameResponse[]> {
  const games = await prisma.game.findMany({
    where: {
      OR: [{ whitePlayerId: userId }, { blackPlayerId: userId }],
    },
    orderBy: { startedAt: 'desc' },
    take: 100,
  });
  return games.map(toGameResponse);
}

/** Most recent finished games for lesson / mistake analysis. */
export async function getRecentFinishedGamesForUser(
  userId: string,
  take = 5
): Promise<Game[]> {
  const lim = Math.min(Math.max(take, 1), 10);
  return prisma.game.findMany({
    where: {
      status: 'finished',
      OR: [{ whitePlayerId: userId }, { blackPlayerId: userId }],
    },
    orderBy: { endedAt: 'desc' },
    take: lim,
  });
}

export async function getRecentGamesSummary(
  userId: string,
  viewerId: string,
  take = 5
): Promise<RecentGameSummary[]> {
  if (userId !== viewerId) {
    throw new HttpError(403, 'You can only list your own games');
  }
  const lim = Math.min(Math.max(take, 1), 20);
  const games = await prisma.game.findMany({
    where: {
      OR: [{ whitePlayerId: userId }, { blackPlayerId: userId }],
    },
    orderBy: { startedAt: 'desc' },
    take: lim,
    include: {
      whitePlayer: { select: { id: true, username: true } },
      blackPlayer: { select: { id: true, username: true } },
    },
  });

  return games.map((g) => {
    const playedWhite = g.whitePlayerId === userId;
    const opponent = playedWhite ? g.blackPlayer : g.whitePlayer;
    let result: RecentGameSummary['result'];
    if (g.status !== 'finished') {
      result = 'ongoing';
    } else if (!g.winner) {
      result = 'draw';
    } else if (g.winner === (playedWhite ? 'white' : 'black')) {
      result = 'win';
    } else {
      result = 'loss';
    }
    return {
      gameId: g.id,
      opponentUsername: opponent.username,
      playedAs: playedWhite ? 'white' : 'black',
      result,
      winner: g.winner,
      startedAt: g.startedAt.toISOString(),
      endedAt: g.endedAt?.toISOString() ?? null,
    };
  });
}

export async function getProfileGameHistory(
  userId: string,
  viewerId: string,
  take = 50
): Promise<ProfileGameHistoryRow[]> {
  if (userId !== viewerId) {
    throw new HttpError(403, 'You can only list your own game history');
  }
  const lim = Math.min(Math.max(take, 1), 100);
  const games = await prisma.game.findMany({
    where: {
      OR: [{ whitePlayerId: userId }, { blackPlayerId: userId }],
    },
    orderBy: { startedAt: 'desc' },
    take: lim,
    include: {
      whitePlayer: { select: { id: true, username: true } },
      blackPlayer: { select: { id: true, username: true } },
      _count: { select: { moves: true } },
    },
  });

  return games.map((g) => {
    const playedWhite = g.whitePlayerId === userId;
    const opponent = playedWhite ? g.blackPlayer : g.whitePlayer;
    let result: ProfileGameHistoryRow['result'];
    if (g.status !== 'finished') {
      result = 'ongoing';
    } else if (!g.winner) {
      result = 'draw';
    } else if (g.winner === (playedWhite ? 'white' : 'black')) {
      result = 'win';
    } else {
      result = 'loss';
    }
    return {
      gameId: g.id,
      opponentUsername: opponent.username,
      playedAs: playedWhite ? 'white' : 'black',
      result,
      startedAt: g.startedAt.toISOString(),
      endedAt: g.endedAt?.toISOString() ?? null,
      moveCount: g._count.moves,
    };
  });
}

const GAME_HISTORY_SORTS: GameHistorySort[] = [
  'date_desc',
  'date_asc',
  'opponent_elo_desc',
  'opponent_elo_asc',
  'game_length_desc',
  'game_length_asc',
];

export function parseGameHistorySort(raw: unknown): GameHistorySort {
  const s = typeof raw === 'string' ? raw : 'date_desc';
  return GAME_HISTORY_SORTS.includes(s as GameHistorySort)
    ? (s as GameHistorySort)
    : 'date_desc';
}

type GameWithPlayersAndCount = Game & {
  whitePlayer: {
    id: string;
    username: string;
    elo: number;
    eloBullet: number;
    eloBlitz: number;
    eloRapid: number;
  };
  blackPlayer: {
    id: string;
    username: string;
    elo: number;
    eloBullet: number;
    eloBlitz: number;
    eloRapid: number;
  };
  _count: { moves: number };
};

function mapFinishedGameToHistoryPageRow(
  g: GameWithPlayersAndCount,
  userId: string
): GameHistoryPageRow {
  const playedWhite = g.whitePlayerId === userId;
  const opponent = playedWhite ? g.blackPlayer : g.whitePlayer;
  let result: GameHistoryPageRow['result'];
  if (!g.winner) {
    result = 'draw';
  } else if (g.winner === (playedWhite ? 'white' : 'black')) {
    result = 'win';
  } else {
    result = 'loss';
  }
  const ended = g.endedAt ?? g.startedAt;
  const durationMs = ended.getTime() - g.startedAt.getTime();
  const tc = g.timeControl ?? '10+0';
  const opponentElo = ratingFormatEloOnUser(
    opponent,
    timeControlToRatingFormat(tc)
  );
  return {
    gameId: g.id,
    opponentUsername: opponent.username,
    opponentElo,
    timeControl: tc,
    opponentUserId: opponent.id,
    playedAs: playedWhite ? 'white' : 'black',
    result,
    startedAt: g.startedAt.toISOString(),
    endedAt: ended.toISOString(),
    moveCount: g._count.moves,
    durationSeconds: Math.max(0, Math.round(durationMs / 1000)),
  };
}

/** Paginated completed games for the game history UI (filters + sort). */
export async function getCompletedGameHistoryPage(
  userId: string,
  viewerId: string,
  opts: {
    page: number;
    pageSize: number;
    result: 'all' | 'win' | 'loss' | 'draw';
    opponent?: string;
    dateFrom?: string;
    dateTo?: string;
    sort: GameHistorySort;
  }
): Promise<GameHistoryPageResponse> {
  if (userId !== viewerId) {
    throw new HttpError(403, 'You can only list your own game history');
  }

  const page = Math.max(1, Math.floor(opts.page));
  const pageSize = Math.min(50, Math.max(1, Math.floor(opts.pageSize)));

  const filters: Prisma.GameWhereInput[] = [{ status: 'finished' }];

  filters.push({
    OR: [{ whitePlayerId: userId }, { blackPlayerId: userId }],
  });

  if (opts.result !== 'all') {
    if (opts.result === 'draw') {
      filters.push({ winner: null });
    } else if (opts.result === 'win') {
      filters.push({
        OR: [
          { AND: [{ whitePlayerId: userId }, { winner: 'white' }] },
          { AND: [{ blackPlayerId: userId }, { winner: 'black' }] },
        ],
      });
    } else {
      filters.push({
        OR: [
          { AND: [{ whitePlayerId: userId }, { winner: 'black' }] },
          { AND: [{ blackPlayerId: userId }, { winner: 'white' }] },
        ],
      });
    }
  }

  if (opts.opponent?.trim()) {
    const q = opts.opponent.trim();
    filters.push({
      OR: [
        {
          AND: [
            { whitePlayerId: userId },
            { blackPlayer: { username: { contains: q } } },
          ],
        },
        {
          AND: [
            { blackPlayerId: userId },
            { whitePlayer: { username: { contains: q } } },
          ],
        },
      ],
    });
  }

  const endedAtFilter: Prisma.DateTimeNullableFilter = {};
  if (opts.dateFrom) {
    const d = new Date(opts.dateFrom);
    d.setHours(0, 0, 0, 0);
    endedAtFilter.gte = d;
  }
  if (opts.dateTo) {
    const d = new Date(opts.dateTo);
    d.setHours(23, 59, 59, 999);
    endedAtFilter.lte = d;
  }
  if (Object.keys(endedAtFilter).length > 0) {
    filters.push({ endedAt: endedAtFilter });
  }

  const where: Prisma.GameWhereInput = { AND: filters };

  const include = {
    whitePlayer: {
      select: {
        id: true,
        username: true,
        elo: true,
        eloBullet: true,
        eloBlitz: true,
        eloRapid: true,
      },
    },
    blackPlayer: {
      select: {
        id: true,
        username: true,
        elo: true,
        eloBullet: true,
        eloBlitz: true,
        eloRapid: true,
      },
    },
    _count: { select: { moves: true } },
  } as const;

  const total = await prisma.game.count({ where });

  if (opts.sort === 'date_desc' || opts.sort === 'date_asc') {
    const games = await prisma.game.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { endedAt: opts.sort === 'date_asc' ? 'asc' : 'desc' },
      include,
    });
    return {
      games: games.map((g) => mapFinishedGameToHistoryPageRow(g, userId)),
      page,
      pageSize,
      total,
    };
  }

  const all = await prisma.game.findMany({
    where,
    include,
  });
  const rows = all.map((g) => mapFinishedGameToHistoryPageRow(g, userId));

  const cmp = (a: GameHistoryPageRow, b: GameHistoryPageRow): number => {
    switch (opts.sort) {
      case 'opponent_elo_desc':
        return b.opponentElo - a.opponentElo;
      case 'opponent_elo_asc':
        return a.opponentElo - b.opponentElo;
      case 'game_length_desc':
        return b.durationSeconds - a.durationSeconds;
      case 'game_length_asc':
        return a.durationSeconds - b.durationSeconds;
      default:
        return 0;
    }
  };
  rows.sort(cmp);
  const games = rows.slice((page - 1) * pageSize, page * pageSize);

  return { games, page, pageSize, total };
}

/** Opponent wins if a player disconnects mid-game (Socket.io cleanup). */
export async function abortGameByDisconnect(
  gameId: string,
  disconnectedUserId: string
): Promise<GameResponse | null> {
  const game = await prisma.game.findUnique({ where: { id: gameId } });
  if (!game || game.status === 'finished') {
    return null;
  }
  if (
    game.whitePlayerId !== disconnectedUserId &&
    game.blackPlayerId !== disconnectedUserId
  ) {
    return null;
  }
  const winner =
    game.whitePlayerId === disconnectedUserId ? 'black' : 'white';
  const updated = await prisma.game.update({
    where: { id: gameId },
    data: {
      status: 'finished',
      winner,
      endedAt: new Date(),
    },
  });

  await applyFinishedGameStats({
    whitePlayerId: updated.whitePlayerId,
    blackPlayerId: updated.blackPlayerId,
    winner: updated.winner,
    timeControl: game.timeControl ?? '10+0',
  });
  void callTournamentHook(gameId);

  return toGameResponse(updated);
}
