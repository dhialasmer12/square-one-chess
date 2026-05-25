import type { Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import * as aiService from '../services/ai.service';
import * as gameService from '../services/game.service';
import type {
  EstimateSkillBody,
  LessonPuzzlesBody,
  PredictMoveBody,
  RecommendLessonsBody,
} from '../types';
import { HttpError } from '../types';

export const predictMove = asyncHandler(async (req, res: Response) => {
  const body = (req.body ?? {}) as PredictMoveBody;
  const fen = typeof body.fen === 'string' ? body.fen.trim() : '';
  if (!fen) {
    throw new HttpError(400, 'fen is required');
  }
  const raw = body.numMoves;
  const num =
    raw === undefined || raw === null
      ? 3
      : Math.floor(Number(raw));
  const numMoves = Number.isFinite(num) ? Math.min(10, Math.max(1, num)) : 3;
  const suggestions = await aiService.predictMoves(fen, numMoves);
  res.json({ suggestions });
});

export const estimateSkill = asyncHandler(async (req, res: Response) => {
  const body = (req.body ?? {}) as EstimateSkillBody;
  const userId = req.user!.sub;
  let sanMoves: string[] | undefined;
  let perspective: 'white' | 'black' | undefined;

  if (typeof body.gameId === 'string' && body.gameId.trim()) {
    const game = await gameService.loadGameOrThrow(body.gameId.trim());
    if (game.status !== 'finished') {
      throw new HttpError(400, 'Game must be finished to estimate skill');
    }
    sanMoves = await gameService.getMoveHistory(body.gameId.trim(), userId);
    perspective =
      game.whitePlayerId === userId ? 'white' : 'black';
  } else if (Array.isArray(body.moves)) {
    sanMoves = body.moves.filter(
      (m): m is string => typeof m === 'string' && m.trim() !== ''
    );
  }

  if (!sanMoves?.length) {
    throw new HttpError(400, 'Provide moves[] or a finished gameId');
  }

  const payload = await aiService.estimateSkill(sanMoves, {
    perspective,
  });
  res.json(payload);
});

export const recommendLessons = asyncHandler(async (req, res: Response) => {
  const body = (req.body ?? {}) as RecommendLessonsBody;
  const userId = typeof body.userId === 'string' ? body.userId.trim() : '';
  if (!userId || userId !== req.user!.sub) {
    throw new HttpError(403, 'You can only request lessons for your own account');
  }
  const raw = body.numRecommendations;
  const num =
    raw === undefined || raw === null
      ? 5
      : Math.floor(Number(raw));
  const n = Number.isFinite(num) ? num : 5;
  const lessons = await aiService.recommendLessons(userId, n);
  res.json({ lessons });
});

export const lessonPuzzles = asyncHandler(async (req, res: Response) => {
  const body = (req.body ?? {}) as LessonPuzzlesBody;
  const lessonId = typeof body.lessonId === 'string' ? body.lessonId.trim() : '';
  if (!lessonId) {
    throw new HttpError(400, 'lessonId is required');
  }
  const raw = body.limit;
  const lim =
    raw === undefined || raw === null
      ? 8
      : Math.floor(Number(raw));
  const limit = Number.isFinite(lim) ? lim : 8;
  const puzzles = await aiService.getLessonPuzzles(req.user!.sub, lessonId, limit);
  res.json({ puzzles });
});

export const gameReview = asyncHandler(async (req, res: Response) => {
  const gameId =
    typeof req.params.gameId === 'string' ? req.params.gameId.trim() : '';
  if (!gameId) {
    throw new HttpError(400, 'gameId is required');
  }
  const payload = await aiService.getGameReview(gameId, req.user!.sub);
  res.json(payload);
});
