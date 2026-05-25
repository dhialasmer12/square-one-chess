import { prisma } from '../models';
import { HttpError } from '../types';
import type {
  ActivityHeatmapDto,
  AverageGameLengthDto,
  ELOBucketDto,
  GameVolumePointDto,
  OpeningSliceDto,
  PlatformAnalyticsDto,
  PlatformStatsDto,
  UserAnalyticsDto,
  UserGrowthPointDto,
  GamesAnalyticsDto,
} from '../types';

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function dateKeyUTC(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function eachDayLast(lastDays: number): Date[] {
  const out: Date[] = [];
  const today = startOfToday();
  for (let i = lastDays - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    out.push(d);
  }
  return out;
}

async function userGrowthReal(lastDays: number): Promise<UserGrowthPointDto[]> {
  const days = eachDayLast(lastDays);
  const start = days[0]!;
  const users = await prisma.user.findMany({
    where: { createdAt: { gte: start } },
    select: { createdAt: true },
  });
  const counts = new Map<string, number>();
  for (const d of days) {
    counts.set(dateKeyUTC(d), 0);
  }
  for (const u of users) {
    const k = dateKeyUTC(u.createdAt);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return days.map((d) => ({
    date: dateKeyUTC(d),
    value: counts.get(dateKeyUTC(d)) ?? 0,
  }));
}

async function gameVolumeReal(lastDays: number): Promise<GameVolumePointDto[]> {
  const days = eachDayLast(lastDays);
  const start = days[0]!;
  const games = await prisma.game.findMany({
    where: {
      status: 'finished',
      endedAt: { gte: start, not: null },
    },
    select: { endedAt: true },
  });
  const counts = new Map<string, number>();
  for (const d of days) {
    counts.set(dateKeyUTC(d), 0);
  }
  for (const g of games) {
    if (!g.endedAt) {
      continue;
    }
    const k = dateKeyUTC(g.endedAt);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return days.map((d) => ({
    date: dateKeyUTC(d),
    value: counts.get(dateKeyUTC(d)) ?? 0,
  }));
}

async function popularOpeningsReal(): Promise<OpeningSliceDto[]> {
  type Row = { uci: string; c: bigint | number };
  const rows = await prisma.$queryRaw<Row[]>`
    SELECT (m.from_square || m.to_square) AS uci, COUNT(*) AS c
    FROM "Move" m
    WHERE m."moveNumber" = 1
    GROUP BY m.from_square, m.to_square
    ORDER BY c DESC
    LIMIT 10
  `;
  return rows.map((r) => ({
    label: formatOpeningLabel(String(r.uci)),
    count: Number(r.c),
  }));
}

/** First-move distribution for games this user played (white or black). */
async function personalOpeningsForUser(
  userId: string
): Promise<OpeningSliceDto[]> {
  type Row = { uci: string; c: bigint | number };
  const rows = await prisma.$queryRaw<Row[]>`
    SELECT (m.from_square || m.to_square) AS uci, COUNT(*) AS c
    FROM "Move" m
    INNER JOIN "Game" g ON g.id = m."gameId"
    WHERE m."moveNumber" = 1
      AND (g."whitePlayerId" = ${userId} OR g."blackPlayerId" = ${userId})
    GROUP BY m.from_square, m.to_square
    ORDER BY c DESC
    LIMIT 10
  `;
  return rows.map((r) => ({
    label: formatOpeningLabel(String(r.uci)),
    count: Number(r.c),
  }));
}

function formatOpeningLabel(uci: string): string {
  if (uci.length >= 4) {
    return `${uci.slice(0, 2)}–${uci.slice(2, 4)}`;
  }
  return uci;
}

async function averageGameLengthReal(): Promise<AverageGameLengthDto> {
  const groups = await prisma.move.groupBy({
    by: ['gameId'],
    where: { game: { status: 'finished' } },
    _count: { id: true },
  });
  const sampleGames = groups.length;
  if (sampleGames === 0) {
    return { averageMoves: 0, medianMoves: 0, sampleGames: 0 };
  }
  const counts = groups.map((g) => g._count.id).sort((a, b) => a - b);
  const sum = counts.reduce((a, b) => a + b, 0);
  const avg = sum / counts.length;
  const mid = Math.floor(counts.length / 2);
  const medianMoves =
    counts.length % 2 === 1
      ? counts[mid]!
      : Math.round((counts[mid - 1]! + counts[mid]!) / 2);
  return {
    averageMoves: Math.round(avg * 10) / 10,
    medianMoves,
    sampleGames,
  };
}

async function eloDistributionReal(): Promise<ELOBucketDto[]> {
  const users = await prisma.user.findMany({
    select: { eloBullet: true, eloBlitz: true, eloRapid: true },
  });
  const buckets: ELOBucketDto[] = [
    { label: '<1000', minElo: 0, maxElo: 999, count: 0 },
    { label: '1000–1199', minElo: 1000, maxElo: 1199, count: 0 },
    { label: '1200–1399', minElo: 1200, maxElo: 1399, count: 0 },
    { label: '1400–1599', minElo: 1400, maxElo: 1599, count: 0 },
    { label: '1600–1799', minElo: 1600, maxElo: 1799, count: 0 },
    { label: '1800–1999', minElo: 1800, maxElo: 1999, count: 0 },
    { label: '2000+', minElo: 2000, maxElo: 99999, count: 0 },
  ];
  for (const u of users) {
    const e = Math.max(u.eloBullet, u.eloBlitz, u.eloRapid);
    const b = buckets.find((x) => e >= x.minElo && e <= x.maxElo);
    if (b) {
      b.count++;
    }
  }
  return buckets;
}

async function activityHeatmapReal(lastDays = 28): Promise<ActivityHeatmapDto> {
  const since = new Date();
  since.setDate(since.getDate() - lastDays);
  since.setHours(0, 0, 0, 0);
  const moves = await prisma.move.findMany({
    where: { timestamp: { gte: since } },
    select: { timestamp: true },
  });
  const cells: ActivityHeatmapDto['cells'] = [];
  let maxCount = 1;
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      cells.push({ dayOfWeek: day, hour, count: 0 });
    }
  }
  const idx = (d: number, h: number) => d * 24 + h;
  for (const m of moves) {
    const d = m.timestamp.getUTCDay();
    const h = m.timestamp.getUTCHours();
    const i = idx(d, h);
    const cell = cells[i]!;
    cell.count++;
    if (cell.count > maxCount) {
      maxCount = cell.count;
    }
  }
  return { cells, maxCount, timezoneNote: 'UTC · moves played' };
}

export async function getPlatformStats(): Promise<PlatformStatsDto> {
  const totalUsers = await prisma.user.count();
  const dayStart = startOfToday();
  const activeGamesToday = await prisma.game.count({
    where: {
      status: 'active',
      startedAt: { gte: dayStart },
    },
  });
  const totalGamesPlayed = await prisma.game.count({
    where: { status: 'finished' },
  });
  return { totalUsers, activeGamesToday, totalGamesPlayed };
}

export async function getUserGrowth(
  lastDays = 30
): Promise<UserGrowthPointDto[]> {
  return userGrowthReal(lastDays);
}

export async function getGameVolume(
  lastDays = 30
): Promise<GameVolumePointDto[]> {
  return gameVolumeReal(lastDays);
}

export async function getPopularOpenings(): Promise<OpeningSliceDto[]> {
  return popularOpeningsReal();
}

export async function getAverageGameLength(): Promise<AverageGameLengthDto> {
  return averageGameLengthReal();
}

export async function getELODistribution(): Promise<ELOBucketDto[]> {
  return eloDistributionReal();
}

export async function getActivityHeatmap(): Promise<ActivityHeatmapDto> {
  return activityHeatmapReal();
}

export async function getPlatformAnalytics(
  lastDays = 30
): Promise<PlatformAnalyticsDto> {
  const [
    stats,
    userGrowth,
    gameVolume,
    popularOpenings,
    averageGameLength,
    eloDistribution,
    activityHeatmap,
  ] = await Promise.all([
    getPlatformStats(),
    getUserGrowth(lastDays),
    getGameVolume(lastDays),
    getPopularOpenings(),
    getAverageGameLength(),
    getELODistribution(),
    getActivityHeatmap(),
  ]);
  return {
    stats,
    userGrowth,
    gameVolume,
    popularOpenings,
    averageGameLength,
    eloDistribution,
    activityHeatmap,
  };
}

export async function getGamesAnalytics(
  lastDays = 30
): Promise<GamesAnalyticsDto> {
  const [gameVolume, popularOpenings, averageGameLength, activityHeatmap] =
    await Promise.all([
      getGameVolume(lastDays),
      getPopularOpenings(),
      getAverageGameLength(),
      getActivityHeatmap(),
    ]);
  return {
    gameVolume,
    popularOpenings,
    averageGameLength,
    activityHeatmap,
  };
}

export async function getUserAnalytics(userId: string): Promise<UserAnalyticsDto> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      elo: true,
      eloBullet: true,
      eloBlitz: true,
      eloRapid: true,
      gamesPlayed: true,
      gamesWon: true,
      createdAt: true,
    },
  });
  if (!user) {
    throw new HttpError(404, 'User not found');
  }
  const gamesLost = Math.max(0, user.gamesPlayed - user.gamesWon);
  const lastDays = 30;
  const days = eachDayLast(lastDays);
  const start = days[0]!;
  const recentGames = await prisma.game.findMany({
    where: {
      status: 'finished',
      endedAt: { gte: start, not: null },
      OR: [{ whitePlayerId: userId }, { blackPlayerId: userId }],
    },
    select: { endedAt: true },
  });
  const volMap = new Map<string, number>();
  for (const d of days) {
    volMap.set(dateKeyUTC(d), 0);
  }
  for (const g of recentGames) {
    if (!g.endedAt) {
      continue;
    }
    const k = dateKeyUTC(g.endedAt);
    volMap.set(k, (volMap.get(k) ?? 0) + 1);
  }
  const personalGameVolume: GameVolumePointDto[] = days.map((d) => ({
    date: dateKeyUTC(d),
    value: volMap.get(dateKeyUTC(d)) ?? 0,
  }));

  const personalOpenings = (
    await personalOpeningsForUser(userId)
  ).slice(0, 5);

  return {
    userId: user.id,
    username: user.username,
    elo: user.elo,
    eloBullet: user.eloBullet,
    eloBlitz: user.eloBlitz,
    eloRapid: user.eloRapid,
    gamesPlayed: user.gamesPlayed,
    gamesWon: user.gamesWon,
    gamesLost,
    memberSince: user.createdAt.toISOString(),
    personalGameVolume,
    personalOpenings,
  };
}
