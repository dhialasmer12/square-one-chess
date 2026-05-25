import type { Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { HttpError } from '../types';
import * as puzzleService from '../services/puzzle.service';
import { prisma } from '../models';

function parseIntQ(v: unknown, fallback: number, min: number, max: number): number {
  if (v === undefined || v === null || v === '') {
    return fallback;
  }
  const n = Number(Array.isArray(v) ? v[0] : v);
  if (!Number.isFinite(n)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.floor(n)));
}

export const getDaily = asyncHandler(async (req, res: Response) => {
  const userId = req.user!.sub;
  const puzzle = await puzzleService.getDailyPuzzle(userId);
  res.json({ puzzle });
});

export const getRandom = asyncHandler(async (req, res: Response) => {
  const userId = req.user!.sub;
  const maxRating = parseIntQ(req.query.maxRating, 2000, 300, 2000);
  const minRating = parseIntQ(req.query.minRating, 300, 300, maxRating);
  const puzzle = await puzzleService.getRandomPuzzle(userId, { minRating, maxRating });
  res.json({ puzzle });
});

export const getStats = asyncHandler(async (_req, res: Response) => {
  const userId = _req.user!.sub;
  const stats = await puzzleService.getPuzzleStats(userId);
  res.json({ stats });
});

export const getByTheme = asyncHandler(async (req, res: Response) => {
  const userId = req.user!.sub;
  const theme = typeof req.params.theme === 'string' ? req.params.theme : '';
  if (!theme.trim()) {
    throw new HttpError(400, 'theme required');
  }
  const limit = parseIntQ(req.query.limit, 20, 1, 50);
  const puzzles = await puzzleService.getPuzzlesByTheme(theme, userId, limit);
  res.json({ puzzles });
});

export const getHint = asyncHandler(async (req, res: Response) => {
  const id = typeof req.params.id === 'string' ? req.params.id.trim() : '';
  if (!id) {
    throw new HttpError(400, 'puzzle id required');
  }
  const row = await prisma.puzzle.findUnique({ where: { id } });
  if (!row) {
    throw new HttpError(404, 'Puzzle not found');
  }
  const moves = puzzleService.parsePuzzleMoves(row.moves);
  const first = moves[0];
  if (!first) {
    throw new HttpError(500, 'Puzzle has no solution');
  }
  const fromSquare = puzzleService.fromSquareForSan(row.fen, first);
  res.json({ fromSquare });
});

export const getById = asyncHandler(async (req, res: Response) => {
  const id = typeof req.params.id === 'string' ? req.params.id.trim() : '';
  const puzzle = await puzzleService.getPuzzleByIdPublic(id);
  res.json({ puzzle });
});

export const postSolve = asyncHandler(async (req, res: Response) => {
  const userId = req.user!.sub;
  const id = typeof req.params.id === 'string' ? req.params.id.trim() : '';
  const move =
    typeof req.body?.move === 'string'
      ? req.body.move
      : typeof req.body?.san === 'string'
        ? req.body.san
        : '';
  if (!id) {
    throw new HttpError(400, 'puzzle id required');
  }
  if (!move.trim()) {
    throw new HttpError(400, 'move (SAN) required');
  }
  const result = await puzzleService.checkAndRecordSolve(id, userId, move);
  res.json(result);
});
