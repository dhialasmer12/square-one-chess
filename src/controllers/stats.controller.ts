import type { Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import * as statsService from '../services/stats.service';
import type { LeaderboardPeriod } from '../services/stats.service';
import { parseRatingFormatQuery } from '../constants/rating-format';
import { HttpError } from '../types';

function parseLimit(raw: unknown, fallback: number, max: number): number {
  if (raw === undefined || raw === null || raw === '') {
    return fallback;
  }
  const n = Number(Array.isArray(raw) ? raw[0] : raw);
  if (!Number.isFinite(n) || n < 1) {
    throw new HttpError(400, 'limit must be a positive number');
  }
  return Math.min(Math.floor(n), max);
}

function parsePeriod(raw: unknown): LeaderboardPeriod {
  const v = typeof raw === 'string' ? raw.toLowerCase() : '';
  if (v === 'week' || v === 'month' || v === 'all') {
    return v;
  }
  return 'all';
}

export const getLeaderboard = asyncHandler(async (req, res: Response) => {
  const limit = parseLimit(req.query.limit, 100, 500);
  const period = parsePeriod(req.query.period);
  const search =
    typeof req.query.search === 'string' ? req.query.search : undefined;
  const ratingFormat = parseRatingFormatQuery(req.query.format);
  const leaderboard = await statsService.getLeaderboard({
    limit,
    period,
    search,
    ratingFormat,
  });
  res.json({ leaderboard, ratingFormat });
});

export const getEloHistory = asyncHandler(async (req, res: Response) => {
  const viewerId = req.user!.sub;
  const { userId } = req.params;
  if (viewerId !== userId) {
    throw new HttpError(403, 'You can only view your own ELO history');
  }
  const series = await statsService.getEloHistory(userId);
  res.json(series);
});

export const getUserStats = asyncHandler(async (req, res: Response) => {
  const { userId } = req.params;
  const stats = await statsService.getUserStats(userId);
  if (req.user!.sub !== userId) {
    const { email: _e, ...publicStats } = stats;
    void _e;
    res.json(publicStats);
    return;
  }
  res.json(stats);
});

export const getUserRank = asyncHandler(async (req, res: Response) => {
  const { userId } = req.params;
  const ratingFormat = parseRatingFormatQuery(req.query.format);
  const rank = await statsService.getUserRank(userId, ratingFormat);
  res.json({ ...rank, ratingFormat });
});

export const getTopWinners = asyncHandler(async (req, res: Response) => {
  const limit = parseLimit(req.query.limit, 10, 100);
  const topWinners = await statsService.getTopWinners(limit);
  res.json({ topWinners });
});
