import { prisma } from '../models';
import { HttpError } from '../types';
import { computeNewElo, DEFAULT_ELO_K } from '../utils/elo';
import { OPEN_SEAT_USER_ID } from '../constants/openSeat';
import {
  peakElo,
  ratingFormatEloOnUser,
  timeControlToRatingFormat,
} from '../constants/rating-format';

export type GameOutcome = 'win' | 'loss' | 'draw';

/** Excludes the system open-seat account from rankings. */
function notOpenSeatUser() {
  return { NOT: { id: OPEN_SEAT_USER_ID } } as const;
}

export interface UserStatsPayload {
  userId: string;
  username: string;
  email: string;
  /** Highest of the three format ratings (headline / legacy). */
  elo: number;
  eloBullet: number;
  eloBlitz: number;
  eloRapid: number;
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  gamesDrawn: number;
  winRatePercent: number | null;
  winStreak: number;
  longestWinStreak: number;
  avgGameDurationSeconds: number | null;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  elo: number;
  gamesPlayed: number;
  gamesWon: number;
  winStreak: number;
  longestWinStreak: number;
  winRatePercent: number | null;
}

export type LeaderboardPeriod = 'all' | 'week' | 'month';

export interface RankPayload {
  rank: number;
  totalRankedPlayers: number;
  elo: number;
  username: string;
}

export interface TopWinnerEntry {
  rank: number;
  userId: string;
  username: string;
  gamesWon: number;
  gamesPlayed: number;
  elo: number;
}

export interface UpdateUserStatsResult {
  userId: string;
  previousElo: number;
  newElo: number;
  gamesPlayed: number;
  gamesWon: number;
  winStreak: number;
  longestWinStreak: number;
}

/**
 * Update one user's stats after a rated result against `opponentElo`.
 * Increments `gamesPlayed`; increments `gamesWon` only on win; updates ELO (K=32); streaks.
 */
export async function updateUserStats(
  userId: string,
  opponentElo: number,
  gameResult: GameOutcome
): Promise<UpdateUserStatsResult> {
  if (userId === OPEN_SEAT_USER_ID) {
    throw new HttpError(400, 'Cannot update stats for system user');
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new HttpError(404, 'User not found');
  }

  const score = gameResult === 'win' ? 1 : gameResult === 'loss' ? 0 : 0.5;
  const newElo = computeNewElo(user.elo, opponentElo, score, DEFAULT_ELO_K);
  const won = gameResult === 'win';
  const nextStreak = won ? user.winStreak + 1 : 0;
  const nextLongest = won
    ? Math.max(user.longestWinStreak, nextStreak)
    : user.longestWinStreak;

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      elo: newElo,
      eloBullet: newElo,
      eloBlitz: newElo,
      eloRapid: newElo,
      gamesPlayed: { increment: 1 },
      ...(won ? { gamesWon: { increment: 1 } } : {}),
      winStreak: nextStreak,
      longestWinStreak: nextLongest,
    },
  });

  return {
    userId: updated.id,
    previousElo: user.elo,
    newElo: updated.elo,
    gamesPlayed: updated.gamesPlayed,
    gamesWon: updated.gamesWon,
    winStreak: updated.winStreak,
    longestWinStreak: updated.longestWinStreak,
  };
}

/**
 * Apply ELO + win/loss/draw counters for both players when a game is finished.
 * Updates only the rating bucket for this game's time control (bullet / blitz / rapid).
 */
export async function applyFinishedGameStats(game: {
  whitePlayerId: string;
  blackPlayerId: string;
  winner: string | null;
  timeControl: string;
}): Promise<void> {
  if (
    game.whitePlayerId === OPEN_SEAT_USER_ID ||
    game.blackPlayerId === OPEN_SEAT_USER_ID
  ) {
    return;
  }

  const format = timeControlToRatingFormat(game.timeControl);

  await prisma.$transaction(async (tx) => {
    const white = await tx.user.findUnique({
      where: { id: game.whitePlayerId },
    });
    const black = await tx.user.findUnique({
      where: { id: game.blackPlayerId },
    });
    if (!white || !black) return;

    const scoreW =
      game.winner === 'white' ? 1 : game.winner === 'black' ? 0 : 0.5;
    const scoreB = 1 - scoreW;

    const wElo = ratingFormatEloOnUser(white, format);
    const bElo = ratingFormatEloOnUser(black, format);
    const newFormatW = computeNewElo(wElo, bElo, scoreW, DEFAULT_ELO_K);
    const newFormatB = computeNewElo(bElo, wElo, scoreB, DEFAULT_ELO_K);

    const wWin = game.winner === 'white';
    const bWin = game.winner === 'black';

    const nextWhiteStreak = wWin ? white.winStreak + 1 : 0;
    const nextBlackStreak = bWin ? black.winStreak + 1 : 0;

    const whiteRatings = {
      eloBullet: format === 'bullet' ? newFormatW : white.eloBullet,
      eloBlitz: format === 'blitz' ? newFormatW : white.eloBlitz,
      eloRapid: format === 'rapid' ? newFormatW : white.eloRapid,
    };
    const blackRatings = {
      eloBullet: format === 'bullet' ? newFormatB : black.eloBullet,
      eloBlitz: format === 'blitz' ? newFormatB : black.eloBlitz,
      eloRapid: format === 'rapid' ? newFormatB : black.eloRapid,
    };

    await tx.user.update({
      where: { id: white.id },
      data: {
        eloBullet: whiteRatings.eloBullet,
        eloBlitz: whiteRatings.eloBlitz,
        eloRapid: whiteRatings.eloRapid,
        elo: peakElo(whiteRatings),
        gamesPlayed: { increment: 1 },
        ...(wWin ? { gamesWon: { increment: 1 } } : {}),
        winStreak: nextWhiteStreak,
        longestWinStreak: wWin
          ? Math.max(white.longestWinStreak, nextWhiteStreak)
          : white.longestWinStreak,
      },
    });

    await tx.user.update({
      where: { id: black.id },
      data: {
        eloBullet: blackRatings.eloBullet,
        eloBlitz: blackRatings.eloBlitz,
        eloRapid: blackRatings.eloRapid,
        elo: peakElo(blackRatings),
        gamesPlayed: { increment: 1 },
        ...(bWin ? { gamesWon: { increment: 1 } } : {}),
        winStreak: nextBlackStreak,
        longestWinStreak: bWin
          ? Math.max(black.longestWinStreak, nextBlackStreak)
          : black.longestWinStreak,
      },
    });
  });
}

function mapLeaderboardRow(
  u: {
    id: string;
    username: string;
    elo: number;
    eloBullet: number;
    eloBlitz: number;
    eloRapid: number;
    gamesPlayed: number;
    gamesWon: number;
    winStreak: number;
    longestWinStreak: number;
  },
  index: number,
  ratingFormat: import('../constants/rating-format').RatingFormat | 'combined'
): LeaderboardEntry {
  const winRatePercent =
    u.gamesPlayed > 0
      ? Math.round((u.gamesWon / u.gamesPlayed) * 10000) / 100
      : null;
  const displayElo =
    ratingFormat === 'combined'
      ? u.elo
      : ratingFormatEloOnUser(u, ratingFormat);
  return {
    rank: index + 1,
    userId: u.id,
    username: u.username,
    elo: displayElo,
    gamesPlayed: u.gamesPlayed,
    gamesWon: u.gamesWon,
    winStreak: u.winStreak,
    longestWinStreak: u.longestWinStreak,
    winRatePercent,
  };
}

export async function getLeaderboard(options: {
  limit?: number;
  period?: LeaderboardPeriod;
  search?: string;
  /** Sort / display rating: bullet, blitz, rapid, or combined (peak). */
  ratingFormat?: import('../constants/rating-format').RatingFormat | 'combined';
} = {}): Promise<LeaderboardEntry[]> {
  const take = Math.min(Math.max(options.limit ?? 100, 1), 500);
  const search = options.search?.trim();
  const period = options.period ?? 'all';
  const ratingFormat = options.ratingFormat ?? 'combined';

  let activeUserIds: string[] | undefined;
  if (period !== 'all') {
    const since = new Date();
    if (period === 'week') {
      since.setDate(since.getDate() - 7);
    } else {
      since.setMonth(since.getMonth() - 1);
    }
    const recentGames = await prisma.game.findMany({
      where: {
        status: 'finished',
        endedAt: { gte: since },
      },
      select: { whitePlayerId: true, blackPlayerId: true },
    });
    const idSet = new Set<string>();
    for (const g of recentGames) {
      idSet.add(g.whitePlayerId);
      idSet.add(g.blackPlayerId);
    }
    activeUserIds = [...idSet];
    if (activeUserIds.length === 0) {
      return [];
    }
  }

  const where: import('@prisma/client').Prisma.UserWhereInput = {
    ...notOpenSeatUser(),
    ...(activeUserIds ? { id: { in: activeUserIds } } : {}),
    ...(search
      ? {
          username: { contains: search },
        }
      : {}),
  };

  const orderBy =
    ratingFormat === 'bullet'
      ? [{ eloBullet: 'desc' as const }, { username: 'asc' as const }]
      : ratingFormat === 'blitz'
        ? [{ eloBlitz: 'desc' as const }, { username: 'asc' as const }]
        : ratingFormat === 'rapid'
          ? [{ eloRapid: 'desc' as const }, { username: 'asc' as const }]
          : [{ elo: 'desc' as const }, { username: 'asc' as const }];

  const users = await prisma.user.findMany({
    where,
    orderBy,
    take,
    select: {
      id: true,
      username: true,
      elo: true,
      eloBullet: true,
      eloBlitz: true,
      eloRapid: true,
      gamesPlayed: true,
      gamesWon: true,
      winStreak: true,
      longestWinStreak: true,
    },
  });

  return users.map((u, i) => mapLeaderboardRow(u, i, ratingFormat));
}

/**
 * Approximate per-format ELO curves (games filtered by time class).
 * Uses each opponent’s current rating in that format (rough but stable).
 */
export async function getEloHistory(
  userId: string
): Promise<import('../types').EloHistoryByFormatResponse> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      createdAt: true,
      eloBullet: true,
      eloBlitz: true,
      eloRapid: true,
    },
  });
  if (!user) {
    throw new HttpError(404, 'User not found');
  }

  const games = await prisma.game.findMany({
    where: {
      status: 'finished',
      endedAt: { not: null },
      OR: [{ whitePlayerId: userId }, { blackPlayerId: userId }],
    },
    orderBy: { endedAt: 'asc' },
    select: {
      whitePlayerId: true,
      blackPlayerId: true,
      winner: true,
      endedAt: true,
      timeControl: true,
      whitePlayer: {
        select: { eloBullet: true, eloBlitz: true, eloRapid: true },
      },
      blackPlayer: {
        select: { eloBullet: true, eloBlitz: true, eloRapid: true },
      },
    },
  });

  const buildSeries = (
    format: import('../constants/rating-format').RatingFormat
  ): import('../types').EloHistoryPoint[] => {
    const pts: import('../types').EloHistoryPoint[] = [
      { date: user.createdAt.toISOString(), elo: 1200 },
    ];
    let state = 1200;
    const k = DEFAULT_ELO_K;
    for (const g of games) {
      if (timeControlToRatingFormat(g.timeControl ?? '10+0') !== format) {
        continue;
      }
      const isWhite = g.whitePlayerId === userId;
      const opp = isWhite ? g.blackPlayer : g.whitePlayer;
      const oppElo = ratingFormatEloOnUser(opp, format);
      let score: number;
      if (!g.winner) {
        score = 0.5;
      } else if (g.winner === (isWhite ? 'white' : 'black')) {
        score = 1;
      } else {
        score = 0;
      }
      state = computeNewElo(state, oppElo, score, k);
      if (g.endedAt) {
        pts.push({ date: g.endedAt.toISOString(), elo: state });
      }
    }
    const current =
      format === 'bullet'
        ? user.eloBullet
        : format === 'blitz'
          ? user.eloBlitz
          : user.eloRapid;
    pts.push({ date: new Date().toISOString(), elo: current });
    return pts;
  };

  return {
    bullet: buildSeries('bullet'),
    blitz: buildSeries('blitz'),
    rapid: buildSeries('rapid'),
  };
}

export async function getUserRank(
  userId: string,
  ratingFormat: import('../constants/rating-format').RatingFormat | 'combined' = 'combined'
): Promise<RankPayload> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      elo: true,
      eloBullet: true,
      eloBlitz: true,
      eloRapid: true,
      username: true,
    },
  });
  if (!user) {
    throw new HttpError(404, 'User not found');
  }

  const displayElo =
    ratingFormat === 'combined'
      ? user.elo
      : ratingFormatEloOnUser(user, ratingFormat);

  const gtField =
    ratingFormat === 'bullet'
      ? { eloBullet: { gt: user.eloBullet } }
      : ratingFormat === 'blitz'
        ? { eloBlitz: { gt: user.eloBlitz } }
        : ratingFormat === 'rapid'
          ? { eloRapid: { gt: user.eloRapid } }
          : { elo: { gt: user.elo } };

  const higher = await prisma.user.count({
    where: {
      ...notOpenSeatUser(),
      ...gtField,
    },
  });

  const totalRankedPlayers = await prisma.user.count({
    where: notOpenSeatUser(),
  });

  return {
    rank: higher + 1,
    totalRankedPlayers,
    elo: displayElo,
    username: user.username,
  };
}

export async function getUserStats(userId: string): Promise<UserStatsPayload> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      email: true,
      elo: true,
      eloBullet: true,
      eloBlitz: true,
      eloRapid: true,
      gamesPlayed: true,
      gamesWon: true,
      winStreak: true,
      longestWinStreak: true,
    },
  });
  if (!user) {
    throw new HttpError(404, 'User not found');
  }

  const finished = await prisma.game.findMany({
    where: {
      status: 'finished',
      OR: [{ whitePlayerId: userId }, { blackPlayerId: userId }],
    },
    select: {
      winner: true,
      whitePlayerId: true,
      blackPlayerId: true,
      startedAt: true,
      endedAt: true,
    },
  });

  let wins = 0;
  let losses = 0;
  let draws = 0;
  let durationSumMs = 0;
  let durationCount = 0;

  for (const g of finished) {
    if (g.winner === null) {
      draws++;
    } else if (
      (g.winner === 'white' && g.whitePlayerId === userId) ||
      (g.winner === 'black' && g.blackPlayerId === userId)
    ) {
      wins++;
    } else {
      losses++;
    }
    if (g.endedAt) {
      durationSumMs += g.endedAt.getTime() - g.startedAt.getTime();
      durationCount++;
    }
  }

  const winRatePercent =
    user.gamesPlayed > 0
      ? Math.round((user.gamesWon / user.gamesPlayed) * 10000) / 100
      : null;

  return {
    userId: user.id,
    username: user.username,
    email: user.email,
    elo: user.elo,
    eloBullet: user.eloBullet,
    eloBlitz: user.eloBlitz,
    eloRapid: user.eloRapid,
    gamesPlayed: user.gamesPlayed,
    gamesWon: user.gamesWon,
    gamesLost: losses,
    gamesDrawn: draws,
    winRatePercent,
    winStreak: user.winStreak,
    longestWinStreak: user.longestWinStreak,
    avgGameDurationSeconds:
      durationCount > 0
        ? Math.round(durationSumMs / durationCount / 1000)
        : null,
  };
}

export async function getTopWinners(limit = 10): Promise<TopWinnerEntry[]> {
  const take = Math.min(Math.max(limit, 1), 100);
  const users = await prisma.user.findMany({
    where: notOpenSeatUser(),
    orderBy: [{ gamesWon: 'desc' }, { elo: 'desc' }],
    take,
    select: {
      id: true,
      username: true,
      gamesWon: true,
      gamesPlayed: true,
      elo: true,
      eloBullet: true,
      eloBlitz: true,
      eloRapid: true,
    },
  });

  return users.map((u, i) => ({
    rank: i + 1,
    userId: u.id,
    username: u.username,
    gamesWon: u.gamesWon,
    gamesPlayed: u.gamesPlayed,
    elo: u.elo,
  }));
}
