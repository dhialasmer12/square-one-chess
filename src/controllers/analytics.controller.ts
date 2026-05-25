import type { Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import * as analyticsService from '../services/analytics.service';

function parseLastDays(q: unknown): number {
  const n = parseInt(String(q ?? '30'), 10);
  if (Number.isNaN(n) || n < 1) {
    return 30;
  }
  return Math.min(365, n);
}

export const getPlatform = asyncHandler(async (req, res: Response) => {
  const lastDays = parseLastDays(req.query.lastDays);
  const data = await analyticsService.getPlatformAnalytics(lastDays);
  res.json(data);
});

export const getGames = asyncHandler(async (req, res: Response) => {
  const lastDays = parseLastDays(req.query.lastDays);
  const data = await analyticsService.getGamesAnalytics(lastDays);
  res.json(data);
});

export const getUser = asyncHandler(async (req, res: Response) => {
  const { userId } = req.params;
  const data = await analyticsService.getUserAnalytics(userId);
  res.json(data);
});
