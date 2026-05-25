import type { Server } from 'socket.io';
import { prisma } from '../models';
import { getSocketServer } from '../sockets/io';
import { HttpError } from '../types';
import type {
  BracketMatchDto,
  BracketResponse,
  TournamentListItem,
  TournamentMatchDto,
  TournamentMessageDto,
} from '../types';
import * as gameService from './game.service';

export const SINGLE_ELIM_SIZES = [4, 8, 16, 32] as const;

export type TournamentType = 'single_elimination' | 'round_robin';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/** Berger / circle method — even player count only. */
export function buildRoundRobinSchedule(
  playerIds: string[]
): { round: number; matchIndex: number; white: string; black: string }[] {
  const n = playerIds.length;
  if (n < 2 || n % 2 !== 0) {
    throw new HttpError(400, 'Round robin requires an even number of players (2–16)');
  }
  let arr = [...playerIds];
  const numRounds = arr.length - 1;
  const half = arr.length / 2;
  const out: { round: number; matchIndex: number; white: string; black: string }[] =
    [];
  for (let r = 0; r < numRounds; r++) {
    let mi = 0;
    for (let i = 0; i < half; i++) {
      const a = arr[i]!;
      const b = arr[arr.length - 1 - i]!;
      out.push({ round: r + 1, matchIndex: mi++, white: a, black: b });
    }
    arr = [arr[0]!, arr[arr.length - 1]!, ...arr.slice(1, arr.length - 1)];
  }
  return out;
}

/** First round of single elimination — `players.length` must be power of 2. */
export function pairSingleEliminationRound1(
  playerIds: string[]
): { white: string; black: string }[] {
  if (playerIds.length < 2 || (playerIds.length & (playerIds.length - 1)) !== 0) {
    throw new HttpError(
      400,
      'Single elimination requires 4, 8, 16, or 32 players'
    );
  }
  const pairs: { white: string; black: string }[] = [];
  for (let i = 0; i < playerIds.length; i += 2) {
    pairs.push({ white: playerIds[i]!, black: playerIds[i + 1]! });
  }
  return pairs;
}

function emitMatchReady(
  io: Server | null,
  tournamentId: string,
  payload: {
    matchId: string;
    gameId: string;
    round: number;
    whitePlayerId: string;
    blackPlayerId: string;
  }
): void {
  io?.to(`tournament:${tournamentId}`).emit('tournament:match-ready', {
    tournamentId,
    ...payload,
  });
}

function emitNewRound(
  io: Server | null,
  tournamentId: string,
  round: number,
  matches: {
    matchId: string;
    gameId: string;
    whitePlayerId: string;
    blackPlayerId: string;
  }[]
): void {
  io?.to(`tournament:${tournamentId}`).emit('tournament:new-match', {
    tournamentId,
    round,
    matches,
  });
}

async function activateMatchesForRound(
  tournamentId: string,
  round: number
): Promise<void> {
  const io = getSocketServer();
  const pending = await prisma.tournamentMatch.findMany({
    where: { tournamentId, round, status: 'pending' },
    orderBy: { matchIndex: 'asc' },
  });
  const batch: {
    matchId: string;
    gameId: string;
    whitePlayerId: string;
    blackPlayerId: string;
  }[] = [];

  for (const m of pending) {
    const game = await gameService.createGame(m.whitePlayerId, m.blackPlayerId);
    await prisma.tournamentMatch.update({
      where: { id: m.id },
      data: { gameId: game.id, status: 'live' },
    });
    emitMatchReady(io, tournamentId, {
      matchId: m.id,
      gameId: game.id,
      round,
      whitePlayerId: m.whitePlayerId,
      blackPlayerId: m.blackPlayerId,
    });
    batch.push({
      matchId: m.id,
      gameId: game.id,
      whitePlayerId: m.whitePlayerId,
      blackPlayerId: m.blackPlayerId,
    });
  }

  if (batch.length > 0) {
    emitNewRound(io, tournamentId, round, batch);
  }
}

export async function startTournament(tournamentId: string): Promise<void> {
  const tour = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      registrations: { include: { user: { select: { id: true } } } },
    },
  });
  if (!tour || tour.status !== 'waiting') {
    return;
  }
  if (tour.registrations.length !== tour.maxPlayers) {
    return;
  }

  const players = shuffle(tour.registrations.map((r) => r.userId));
  const io = getSocketServer();

  if (tour.type === 'single_elimination') {
    const pairs = pairSingleEliminationRound1(players);
    const batch: {
      matchId: string;
      gameId: string;
      whitePlayerId: string;
      blackPlayerId: string;
    }[] = [];

    for (let i = 0; i < pairs.length; i++) {
      const { white, black } = pairs[i]!;
      const game = await gameService.createGame(white, black);
      const m = await prisma.tournamentMatch.create({
        data: {
          tournamentId,
          round: 1,
          matchIndex: i,
          whitePlayerId: white,
          blackPlayerId: black,
          gameId: game.id,
          status: 'live',
        },
      });
      emitMatchReady(io, tournamentId, {
        matchId: m.id,
        gameId: game.id,
        round: 1,
        whitePlayerId: white,
        blackPlayerId: black,
      });
      batch.push({
        matchId: m.id,
        gameId: game.id,
        whitePlayerId: white,
        blackPlayerId: black,
      });
    }

    await prisma.tournament.update({
      where: { id: tournamentId },
      data: { status: 'ongoing', currentRound: 1 },
    });
    emitNewRound(io, tournamentId, 1, batch);
    return;
  }

  if (tour.type === 'round_robin') {
    const schedule = buildRoundRobinSchedule(players);
    await prisma.tournamentMatch.createMany({
      data: schedule.map((s) => ({
        tournamentId,
        round: s.round,
        matchIndex: s.matchIndex,
        whitePlayerId: s.white,
        blackPlayerId: s.black,
        status: 'pending',
      })),
    });
    await prisma.tournament.update({
      where: { id: tournamentId },
      data: { status: 'ongoing', currentRound: 1 },
    });
    await activateMatchesForRound(tournamentId, 1);
  }
}

function winnerUserIdFromGame(
  winner: string | null,
  whitePlayerId: string,
  blackPlayerId: string
): string {
  if (winner === 'white') {
    return whitePlayerId;
  }
  if (winner === 'black') {
    return blackPlayerId;
  }
  /** Partie nulle (tournoi) : départage arbitraire pour faire avancer le bracket. */
  return blackPlayerId;
}

async function advanceSingleElimination(tournamentId: string): Promise<void> {
  const matches = await prisma.tournamentMatch.findMany({
    where: { tournamentId },
  });
  const maxRound = Math.max(0, ...matches.map((m) => m.round));
  const roundMatches = matches.filter((m) => m.round === maxRound);
  if (roundMatches.length === 0) {
    return;
  }
  if (!roundMatches.every((m) => m.status === 'done')) {
    return;
  }

  if (roundMatches.length === 1) {
    await prisma.tournament.update({
      where: { id: tournamentId },
      data: { status: 'finished', currentRound: maxRound },
    });
    return;
  }

  const sorted = [...roundMatches].sort((a, b) => a.matchIndex - b.matchIndex);
  const winners = sorted.map((m) => m.winnerId!);
  const nextRound = maxRound + 1;
  const io = getSocketServer();
  const batch: {
    matchId: string;
    gameId: string;
    whitePlayerId: string;
    blackPlayerId: string;
  }[] = [];

  for (let i = 0; i < winners.length; i += 2) {
    const w = winners[i]!;
    const b = winners[i + 1]!;
    const game = await gameService.createGame(w, b);
    const m = await prisma.tournamentMatch.create({
      data: {
        tournamentId,
        round: nextRound,
        matchIndex: i / 2,
        whitePlayerId: w,
        blackPlayerId: b,
        gameId: game.id,
        status: 'live',
      },
    });
    emitMatchReady(io, tournamentId, {
      matchId: m.id,
      gameId: game.id,
      round: nextRound,
      whitePlayerId: w,
      blackPlayerId: b,
    });
    batch.push({
      matchId: m.id,
      gameId: game.id,
      whitePlayerId: w,
      blackPlayerId: b,
    });
  }

  await prisma.tournament.update({
    where: { id: tournamentId },
    data: { currentRound: nextRound },
  });
  emitNewRound(io, tournamentId, nextRound, batch);
}

async function advanceRoundRobin(tournamentId: string): Promise<void> {
  const tour = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: { matches: true },
  });
  if (!tour || tour.status !== 'ongoing') {
    return;
  }

  const maxR = Math.max(0, ...tour.matches.map((m) => m.round));
  const currentR = tour.currentRound;
  const thisRound = tour.matches.filter((m) => m.round === currentR);
  if (!thisRound.every((m) => m.status === 'done')) {
    return;
  }

  if (currentR >= maxR) {
    await prisma.tournament.update({
      where: { id: tournamentId },
      data: { status: 'finished' },
    });
    return;
  }

  const nextR = currentR + 1;
  await activateMatchesForRound(tournamentId, nextR);
  await prisma.tournament.update({
    where: { id: tournamentId },
    data: { currentRound: nextR },
  });
}

export async function onTournamentGameFinished(gameId: string): Promise<void> {
  const match = await prisma.tournamentMatch.findFirst({
    where: { gameId },
    include: { tournament: true },
  });
  if (!match || match.status === 'done') {
    return;
  }

  const game = await prisma.game.findUnique({ where: { id: gameId } });
  if (!game || game.status !== 'finished') {
    return;
  }

  const winnerId = winnerUserIdFromGame(
    game.winner,
    match.whitePlayerId,
    match.blackPlayerId
  );

  await prisma.tournamentMatch.update({
    where: { id: match.id },
    data: { winnerId, status: 'done' },
  });

  const { tournament } = match;
  if (tournament.status !== 'ongoing') {
    return;
  }

  if (tournament.type === 'single_elimination') {
    await advanceSingleElimination(tournament.id);
  } else {
    await advanceRoundRobin(tournament.id);
  }
}

const userMini = { id: true, username: true } as const;

function mapMatchToBracketDto(
  m: {
    id: string;
    round: number;
    matchIndex: number;
    whitePlayerId: string;
    blackPlayerId: string;
    winnerId: string | null;
    gameId: string | null;
    status: string;
  },
  users: Map<string, string>
): BracketMatchDto {
  return {
    id: m.id,
    round: m.round,
    matchIndex: m.matchIndex,
    whitePlayerId: m.whitePlayerId,
    blackPlayerId: m.blackPlayerId,
    whiteUsername: users.get(m.whitePlayerId) ?? '?',
    blackUsername: users.get(m.blackPlayerId) ?? '?',
    winnerId: m.winnerId,
    gameId: m.gameId,
    status: m.status,
  };
}

export async function createTournament(
  createdById: string,
  name: string,
  type: string,
  maxPlayers: number
): Promise<TournamentListItem> {
  const t = type as TournamentType;
  if (t !== 'single_elimination' && t !== 'round_robin') {
    throw new HttpError(400, 'type must be single_elimination or round_robin');
  }
  if (!name?.trim()) {
    throw new HttpError(400, 'name is required');
  }

  if (t === 'single_elimination') {
    if (!SINGLE_ELIM_SIZES.includes(maxPlayers as (typeof SINGLE_ELIM_SIZES)[number])) {
      throw new HttpError(400, 'maxPlayers must be 4, 8, 16, or 32 for single elimination');
    }
  } else {
    if (maxPlayers < 2 || maxPlayers > 16 || maxPlayers % 2 !== 0) {
      throw new HttpError(
        400,
        'Round robin: maxPlayers must be an even number between 2 and 16'
      );
    }
  }

  const row = await prisma.tournament.create({
    data: {
      name: name.trim(),
      type: t,
      maxPlayers,
      createdById,
      status: 'waiting',
      currentRound: 0,
    },
  });

  return toListItem(row, 0);
}

export async function joinTournament(
  userId: string,
  tournamentId: string
): Promise<TournamentListItem> {
  const tour = await prisma.tournament.findUnique({
    where: { id: tournamentId },
  });
  if (!tour) {
    throw new HttpError(404, 'Tournament not found');
  }
  if (tour.status !== 'waiting') {
    throw new HttpError(400, 'Tournament is not open for joining');
  }

  const existing = await prisma.tournamentRegistration.findUnique({
    where: {
      userId_tournamentId: { userId, tournamentId },
    },
  });
  if (existing) {
    throw new HttpError(400, 'Already registered');
  }

  const count = await prisma.tournamentRegistration.count({
    where: { tournamentId },
  });
  if (count >= tour.maxPlayers) {
    throw new HttpError(400, 'Tournament is full');
  }

  await prisma.tournamentRegistration.create({
    data: { userId, tournamentId },
  });

  const newCount = count + 1;
  if (newCount >= tour.maxPlayers) {
    await startTournament(tournamentId);
  }

  const updated = await prisma.tournament.findUniqueOrThrow({
    where: { id: tournamentId },
  });
  const finalCount = await prisma.tournamentRegistration.count({
    where: { tournamentId },
  });
  return toListItem(updated, finalCount);
}

function toListItem(
  row: {
    id: string;
    name: string;
    type: string;
    maxPlayers: number;
    status: string;
    currentRound: number;
    createdAt: Date;
  },
  currentPlayers: number
): TournamentListItem {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    maxPlayers: row.maxPlayers,
    currentPlayers,
    status: row.status,
    currentRound: row.currentRound,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listActiveTournaments(): Promise<TournamentListItem[]> {
  const rows = await prisma.tournament.findMany({
    where: { status: { in: ['waiting', 'ongoing'] } },
    orderBy: { createdAt: 'desc' },
  });
  const counts = await prisma.tournamentRegistration.groupBy({
    by: ['tournamentId'],
    _count: { id: true },
  });
  const countMap = new Map(counts.map((c) => [c.tournamentId, c._count.id]));
  return rows.map((r) => toListItem(r, countMap.get(r.id) ?? 0));
}

export async function getBracket(tournamentId: string): Promise<BracketResponse> {
  const tour = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      matches: { orderBy: [{ round: 'asc' }, { matchIndex: 'asc' }] },
      registrations: { select: { userId: true } },
    },
  });
  if (!tour) {
    throw new HttpError(404, 'Tournament not found');
  }

  const userIds = new Set<string>();
  for (const m of tour.matches) {
    userIds.add(m.whitePlayerId);
    userIds.add(m.blackPlayerId);
  }
  const users = await prisma.user.findMany({
    where: { id: { in: [...userIds] } },
    select: { id: true, username: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u.username]));

  const roundMap = new Map<number, BracketMatchDto[]>();
  for (const m of tour.matches) {
    const dto = mapMatchToBracketDto(m, userMap);
    const list = roundMap.get(m.round) ?? [];
    list.push(dto);
    roundMap.set(m.round, list);
  }

  const rounds = [...roundMap.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([round, matches]) => ({ round, matches }));

  return {
    tournament: toListItem(tour, tour.registrations.length),
    rounds,
  };
}

export async function getTournamentMatches(
  tournamentId: string
): Promise<TournamentMatchDto[]> {
  const tour = await prisma.tournament.findUnique({
    where: { id: tournamentId },
  });
  if (!tour) {
    throw new HttpError(404, 'Tournament not found');
  }

  const matches = await prisma.tournamentMatch.findMany({
    where: { tournamentId },
    orderBy: [{ round: 'asc' }, { matchIndex: 'asc' }],
  });
  const userIds = new Set<string>();
  for (const m of matches) {
    userIds.add(m.whitePlayerId);
    userIds.add(m.blackPlayerId);
    if (m.winnerId) {
      userIds.add(m.winnerId);
    }
  }
  const users = await prisma.user.findMany({
    where: { id: { in: [...userIds] } },
    select: { id: true, username: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u.username]));

  return matches.map((m) => ({
    id: m.id,
    tournamentId: m.tournamentId,
    round: m.round,
    matchIndex: m.matchIndex,
    whitePlayerId: m.whitePlayerId,
    blackPlayerId: m.blackPlayerId,
    whiteUsername: userMap.get(m.whitePlayerId) ?? '?',
    blackUsername: userMap.get(m.blackPlayerId) ?? '?',
    winnerId: m.winnerId,
    winnerUsername: m.winnerId ? userMap.get(m.winnerId) ?? null : null,
    gameId: m.gameId,
    status: m.status,
  }));
}

export async function assertTournamentMember(
  userId: string,
  tournamentId: string
): Promise<void> {
  const reg = await prisma.tournamentRegistration.findUnique({
    where: { userId_tournamentId: { userId, tournamentId } },
  });
  if (!reg) {
    throw new HttpError(403, 'Not a member of this tournament');
  }
}

export async function getChatMessages(
  tournamentId: string,
  limit = 100
): Promise<TournamentMessageDto[]> {
  const rows = await prisma.tournamentMessage.findMany({
    where: { tournamentId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: { user: { select: { username: true } } },
  });
  return rows.reverse().map((r) => ({
    id: r.id,
    tournamentId: r.tournamentId,
    userId: r.userId,
    username: r.user.username,
    body: r.body,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function postChatMessage(
  userId: string,
  tournamentId: string,
  body: string
): Promise<TournamentMessageDto> {
  await assertTournamentMember(userId, tournamentId);
  const text = body?.trim() ?? '';
  if (!text) {
    throw new HttpError(400, 'Message cannot be empty');
  }
  if (text.length > 2000) {
    throw new HttpError(400, 'Message too long');
  }
  const row = await prisma.tournamentMessage.create({
    data: { tournamentId, userId, body: text },
    include: { user: { select: { username: true } } },
  });
  return {
    id: row.id,
    tournamentId: row.tournamentId,
    userId: row.userId,
    username: row.user.username,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
  };
}
