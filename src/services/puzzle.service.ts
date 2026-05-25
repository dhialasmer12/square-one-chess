import { Chess } from 'chess.js';
import type { Puzzle } from '@prisma/client';
import { prisma } from '../models';
import { HttpError } from '../types';
import { predictMoves } from './ai.service';
import * as gameService from './game.service';

/** Deserialize `Puzzle.moves` (JSON array of SAN strings). */
export function parsePuzzleMoves(movesJson: string): string[] {
  try {
    const v = JSON.parse(movesJson) as unknown;
    if (!Array.isArray(v)) {
      return [];
    }
    return v.map((x) => String(x));
  } catch {
    return [];
  }
}

export function normalizeSan(s: string): string {
  return String(s)
    .trim()
    .replace(/\+$|#$/g, '')
    .replace(/\s+/g, '');
}

/** Standard chess keeps both kings on the board; chess.js still allows “king capture” in some lines. */
function fenPlacementHasBothKings(fen: string): boolean {
  const placement = fen.split(' ')[0] ?? '';
  return placement.includes('k') && placement.includes('K');
}

export function sanEquivalent(a: string, b: string): boolean {
  return normalizeSan(a) === normalizeSan(b);
}

/**
 * True if both SANs produce the same position when played from `fen`.
 * Needed because chess.js may emit `Rxe1` while a puzzle line stores `Re1+`, etc.
 */
export function sameMoveOnPosition(fen: string, sanA: string, sanB: string): boolean {
  if (sanEquivalent(sanA, sanB)) {
    return true;
  }
  let afterA: string;
  let afterB: string;
  try {
    const g1 = new Chess(fen);
    const m1 = g1.move(sanA);
    if (!m1) {
      return false;
    }
    afterA = g1.fen();
    const g2 = new Chess(fen);
    const m2 = g2.move(sanB);
    if (!m2) {
      return false;
    }
    afterB = g2.fen();
  } catch {
    return false;
  }
  return afterA === afterB;
}

export type PuzzlePublicDto = {
  id: string;
  fen: string;
  theme: string;
  rating: number;
  tries: number;
  successes: number;
  /** Number of plies stored (solution length); first ply is the player move to find. */
  plies: number;
};

function toPublicDto(p: Puzzle): PuzzlePublicDto {
  const moves = parsePuzzleMoves(p.moves);
  return {
    id: p.id,
    fen: p.fen,
    theme: p.theme,
    rating: p.rating,
    tries: p.tries,
    successes: p.successes,
    plies: moves.length,
  };
}

function utcDayStart(d = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

async function userBaselineRating(userId: string): Promise<number> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { elo: true },
  });
  return u?.elo ?? 1200;
}

/** Square the side-to-move piece starts on for this SAN (for hints). */
export function fromSquareForSan(fen: string, san: string): string | null {
  let g: Chess;
  try {
    g = new Chess(fen);
  } catch {
    return null;
  }
  const played = g.move(san);
  if (!played) {
    return null;
  }
  return played.from;
}

export async function getRandomPuzzle(
  userId: string,
  opts: { minRating?: number; maxRating?: number }
): Promise<PuzzlePublicDto> {
  const base = await userBaselineRating(userId);
  const minR = Math.max(300, Math.min(2000, opts.minRating ?? base - 250));
  const maxR = Math.max(minR, Math.min(2000, opts.maxRating ?? base + 250));

  const solvedIds = await prisma.userPuzzleStats.findMany({
    where: { userId, solved: true },
    select: { puzzleId: true },
  });
  const exclude = solvedIds.map((s) => s.puzzleId);

  const pool = await prisma.puzzle.findMany({
    where: {
      rating: { gte: minR, lte: maxR },
      ...(exclude.length ? { id: { notIn: exclude } } : {}),
    },
    take: 80,
  });

  if (!pool.length) {
    const fallback = await prisma.puzzle.findMany({
      where: exclude.length ? { id: { notIn: exclude } } : {},
      take: 80,
    });
    if (!fallback.length) {
      throw new HttpError(404, 'No puzzles available — run prisma db seed');
    }
    return toPublicDto(fallback[Math.floor(Math.random() * fallback.length)]!);
  }

  return toPublicDto(pool[Math.floor(Math.random() * pool.length)]!);
}

async function pickGlobalPuzzleForUtcDay(day: Date): Promise<Puzzle> {
  const n = await prisma.puzzle.count();
  if (!n) {
    throw new HttpError(500, 'No puzzles in database — run prisma db seed');
  }
  const skip = Math.floor(day.getTime() % n);
  const rows = await prisma.puzzle.findMany({
    orderBy: { id: 'asc' },
    skip,
    take: 1,
  });
  const p = rows[0];
  if (!p) {
    throw new HttpError(500, 'Failed to pick daily puzzle');
  }
  return p;
}

export async function getDailyPuzzle(_userId: string): Promise<PuzzlePublicDto> {
  const day = utcDayStart();
  const next = new Date(day.getTime() + 86_400_000);

  const existing = await prisma.dailyPuzzle.findFirst({
    where: { date: { gte: day, lt: next } },
    include: { puzzle: true },
  });
  if (existing) {
    return toPublicDto(existing.puzzle);
  }

  const full = await pickGlobalPuzzleForUtcDay(day);

  await prisma.dailyPuzzle.create({
    data: { puzzleId: full.id, date: day },
  });

  return toPublicDto(full);
}

export async function getPuzzleByIdPublic(id: string): Promise<PuzzlePublicDto> {
  const p = await prisma.puzzle.findUnique({ where: { id } });
  if (!p) {
    throw new HttpError(404, 'Puzzle not found');
  }
  return toPublicDto(p);
}

export async function getPuzzlesByTheme(
  theme: string,
  userId: string,
  limit = 20
): Promise<PuzzlePublicDto[]> {
  const t = theme.trim().toLowerCase();
  const lim = Math.min(Math.max(limit, 1), 50);

  const solved = await prisma.userPuzzleStats.findMany({
    where: { userId, solved: true },
    select: { puzzleId: true },
  });
  const ex = solved.map((s) => s.puzzleId);

  const rows = await prisma.puzzle.findMany({
    where: {
      theme: t,
      ...(ex.length ? { id: { notIn: ex } } : {}),
    },
    take: lim,
    orderBy: { rating: 'asc' },
  });
  return rows.map(toPublicDto);
}

export type SolveResultDto = {
  correct: boolean;
  /** When false, optional normalized expected SAN (still obscured in UI if you prefer). */
  expectedSan?: string;
  alreadySolved: boolean;
  attempts: number;
  puzzle: PuzzlePublicDto;
};

export async function checkAndRecordSolve(
  puzzleId: string,
  userId: string,
  moveSan: string
): Promise<SolveResultDto> {
  const puzzle = await prisma.puzzle.findUnique({ where: { id: puzzleId } });
  if (!puzzle) {
    throw new HttpError(404, 'Puzzle not found');
  }
  if (!fenPlacementHasBothKings(puzzle.fen)) {
    throw new HttpError(500, 'Invalid puzzle position in database');
  }

  const line = parsePuzzleMoves(puzzle.moves);
  const expected = line[0];
  if (!expected) {
    throw new HttpError(500, 'Puzzle has no solution line');
  }

  const proof = new Chess(puzzle.fen);
  const proofMove = proof.move(expected);
  if (!proofMove || !fenPlacementHasBothKings(proof.fen())) {
    throw new HttpError(500, 'Invalid puzzle solution in database — re-run prisma seed');
  }

  const correct = sameMoveOnPosition(puzzle.fen, moveSan, expected);

  const prev = await prisma.userPuzzleStats.findUnique({
    where: { userId_puzzleId: { userId, puzzleId } },
  });

  if (prev?.solved) {
    return {
      correct: true,
      alreadySolved: true,
      attempts: prev.attempts,
      puzzle: toPublicDto(puzzle),
    };
  }

  const attempts = (prev?.attempts ?? 0) + 1;

  await prisma.$transaction([
    prisma.puzzle.update({
      where: { id: puzzleId },
      data: { tries: { increment: 1 } },
    }),
    prisma.userPuzzleStats.upsert({
      where: { userId_puzzleId: { userId, puzzleId } },
      create: {
        userId,
        puzzleId,
        solved: correct,
        attempts,
        solvedAt: correct ? new Date() : null,
      },
      update: {
        attempts,
        solved: correct ? true : undefined,
        solvedAt: correct ? new Date() : undefined,
      },
    }),
  ]);

  if (correct) {
    await prisma.puzzle.update({
      where: { id: puzzleId },
      data: { successes: { increment: 1 } },
    });
  }

  const updated = await prisma.puzzle.findUniqueOrThrow({ where: { id: puzzleId } });
  const st = await prisma.userPuzzleStats.findUniqueOrThrow({
    where: { userId_puzzleId: { userId, puzzleId } },
  });

  let expectedSanOut: string | undefined;
  if (!correct) {
    const g = new Chess(puzzle.fen);
    const m = g.move(expected);
    expectedSanOut = m ? m.san : normalizeSan(expected);
  }

  return {
    correct,
    expectedSan: expectedSanOut,
    alreadySolved: false,
    attempts: st.attempts,
    puzzle: toPublicDto(updated),
  };
}

export type PuzzleStatsDto = {
  /** Heuristic “puzzle rating” shown in the UI (not the same as chess Elo). */
  puzzleRating: number;
  chessElo: number;
  solvedCount: number;
  totalAttempts: number;
  successRate: number;
  currentStreak: number;
  bestStreak: number;
  recentSolved: {
    puzzleId: string;
    theme: string;
    rating: number;
    solvedAt: string;
    attempts: number;
  }[];
  /** Last 14 days — number of puzzles solved per UTC day (for Chart.js). */
  solvedByDay: { day: string; count: number }[];
};

function dayKeyUtc(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function bestStreakFromDayKeys(dayKeys: string[]): number {
  const sorted = [...new Set(dayKeys)].sort();
  if (!sorted.length) {
    return 0;
  }
  let best = 0;
  let run = 0;
  let prevMs: number | null = null;
  for (const dk of sorted) {
    const ms = Date.parse(`${dk}T00:00:00.000Z`);
    if (prevMs !== null && ms - prevMs === 86_400_000) {
      run += 1;
    } else {
      run = 1;
    }
    best = Math.max(best, run);
    prevMs = ms;
  }
  return best;
}

function currentStreakFromDayKeys(dayKeys: string[]): number {
  const set = new Set(dayKeys);
  const today = dayKeyUtc(utcDayStart());
  const yesterday = dayKeyUtc(new Date(utcDayStart().getTime() - 86_400_000));
  let start = today;
  if (!set.has(today) && set.has(yesterday)) {
    start = yesterday;
  } else if (!set.has(today)) {
    return 0;
  }
  let cur = 0;
  let d = new Date(`${start}T00:00:00.000Z`);
  while (set.has(dayKeyUtc(d))) {
    cur += 1;
    d = new Date(d.getTime() - 86_400_000);
  }
  return cur;
}

export async function getPuzzleStats(userId: string): Promise<PuzzleStatsDto> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { elo: true },
  });
  const chessElo = user?.elo ?? 1200;

  const statsRows = await prisma.userPuzzleStats.findMany({
    where: { userId },
  });
  const solvedRows = statsRows.filter((s) => s.solved && s.solvedAt);
  const solvedCount = solvedRows.length;
  const totalAttempts = statsRows.reduce((a, s) => a + s.attempts, 0);
  const successRate =
    totalAttempts === 0 ? 0 : Math.round((solvedCount / totalAttempts) * 1000) / 10;

  const dayKeys = solvedRows.map((s) => dayKeyUtc(s.solvedAt!));
  const best = bestStreakFromDayKeys(dayKeys);
  const current = currentStreakFromDayKeys(dayKeys);

  const recent = [...solvedRows]
    .sort((a, b) => b.solvedAt!.getTime() - a.solvedAt!.getTime())
    .slice(0, 10);

  const puzzleMeta = await prisma.puzzle.findMany({
    where: { id: { in: recent.map((r) => r.puzzleId) } },
    select: { id: true, theme: true, rating: true },
  });
  const metaById = new Map(puzzleMeta.map((m) => [m.id, m]));

  const fourteenDaysAgo = new Date(utcDayStart().getTime() - 13 * 86_400_000);
  const recentForChart = solvedRows.filter((s) => s.solvedAt! >= fourteenDaysAgo);
  const byDay = new Map<string, number>();
  for (let i = 0; i < 14; i += 1) {
    const d = new Date(utcDayStart().getTime() - (13 - i) * 86_400_000);
    byDay.set(dayKeyUtc(d), 0);
  }
  for (const s of recentForChart) {
    const k = dayKeyUtc(s.solvedAt!);
    byDay.set(k, (byDay.get(k) ?? 0) + 1);
  }
  const solvedByDay = [...byDay.entries()].map(([day, count]) => ({ day, count }));

  const ratingById = new Map(
    (
      await prisma.puzzle.findMany({
        where: { id: { in: solvedRows.map((s) => s.puzzleId) } },
        select: { id: true, rating: true },
      })
    ).map((p) => [p.id, p.rating])
  );
  const avgSolvedRating =
    solvedCount === 0
      ? chessElo
      : Math.round(
          solvedRows.reduce(
            (sum, s) => sum + (ratingById.get(s.puzzleId) ?? chessElo),
            0
          ) / solvedCount
        );

  const puzzleRating = Math.round(
    Math.min(2000, Math.max(300, chessElo * 0.85 + avgSolvedRating * 0.15 + solvedCount * 2))
  );

  return {
    puzzleRating,
    chessElo,
    solvedCount,
    totalAttempts,
    successRate,
    currentStreak: current,
    bestStreak: best,
    recentSolved: recent.map((r) => {
      const m = metaById.get(r.puzzleId);
      return {
        puzzleId: r.puzzleId,
        theme: m?.theme ?? '?',
        rating: m?.rating ?? 0,
        solvedAt: r.solvedAt!.toISOString(),
        attempts: r.attempts,
      };
    }),
    solvedByDay,
  };
}

/**
 * Mines a “blunder” puzzle from a finished game: if the played move is not the engine’s
 * best suggestion, store a single-move puzzle for the position before the move.
 * Returns the new puzzle id or null if nothing was created.
 */
export async function generatePuzzleFromGame(
  gameId: string,
  moveNumber: number,
  userId: string
): Promise<string | null> {
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: {
      moves: { orderBy: { moveNumber: 'asc' } },
    },
  });
  if (!game) {
    throw new HttpError(404, 'Game not found');
  }
  if (game.whitePlayerId !== userId && game.blackPlayerId !== userId) {
    throw new HttpError(403, 'Not your game');
  }
  if (game.status !== 'finished') {
    throw new HttpError(400, 'Game must be finished');
  }

  const target = game.moves.find((m) => m.moveNumber === moveNumber);
  if (!target) {
    throw new HttpError(400, 'moveNumber not found in game');
  }

  let g: Chess;
  try {
    g = new Chess();
  } catch {
    throw new HttpError(500, 'Chess init failed');
  }
  for (const m of game.moves) {
    if (m.moveNumber >= moveNumber) {
      break;
    }
    const ok = g.move({
      from: m.fromSquare as any,
      to: m.toSquare as any,
      promotion: (m.promotion as any) ?? undefined,
    });
    if (!ok) {
      throw new HttpError(500, 'Failed to replay game');
    }
  }

  const beforeFen = g.fen();
  const suggestions = await predictMoves(beforeFen, 1);
  const best = suggestions[0]?.san;
  if (!best) {
    return null;
  }

  const playedSan = new Chess(beforeFen).move({
    from: target.fromSquare as any,
    to: target.toSquare as any,
    promotion: (target.promotion as any) ?? undefined,
  })?.san;
  if (!playedSan) {
    return null;
  }

  if (normalizeSan(playedSan) === normalizeSan(best)) {
    return null;
  }

  const created = await prisma.puzzle.create({
    data: {
      fen: beforeFen,
      moves: JSON.stringify([best]),
      theme: 'endgame',
      rating: 900,
    },
  });
  return created.id;
}

export async function generatePuzzlesFromGames(userId: string): Promise<number> {
  const games = await gameService.getRecentFinishedGamesForUser(userId, 8);
  let n = 0;
  for (const game of games) {
    const mid = await prisma.move.findMany({
      where: { gameId: game.id },
      orderBy: { moveNumber: 'desc' },
      take: 1,
    });
    const lastN = mid[0]?.moveNumber ?? 0;
    if (lastN < 4) {
      continue;
    }
    const pick = Math.max(2, Math.floor(lastN / 2));
    try {
      const id = await generatePuzzleFromGame(game.id, pick, userId);
      if (id) {
        n += 1;
      }
    } catch {
      /* skip */
    }
  }
  return n;
}
