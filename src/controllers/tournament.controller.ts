import type { Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { getSocketServer } from '../sockets/io';
import * as tournamentService from '../services/tournament.service';
import type { CreateTournamentBody } from '../types';
import { HttpError } from '../types';

export const createTournament = asyncHandler(async (req, res: Response) => {
  const userId = req.user!.sub;
  const body = (req.body ?? {}) as CreateTournamentBody;
  if (!body.name?.trim()) {
    throw new HttpError(400, 'name is required');
  }
  if (
    body.type !== 'single_elimination' &&
    body.type !== 'round_robin'
  ) {
    throw new HttpError(400, 'type must be single_elimination or round_robin');
  }
  if (body.maxPlayers === undefined || typeof body.maxPlayers !== 'number') {
    throw new HttpError(400, 'maxPlayers is required');
  }
  const row = await tournamentService.createTournament(
    userId,
    body.name,
    body.type,
    body.maxPlayers
  );
  res.status(201).json(row);
});

export const joinTournament = asyncHandler(async (req, res: Response) => {
  const userId = req.user!.sub;
  const { tournamentId } = req.params;
  const row = await tournamentService.joinTournament(userId, tournamentId);
  res.json(row);
});

export const forceStartTournament = asyncHandler(async (req, res: Response) => {
  const userId = req.user!.sub;
  const { tournamentId } = req.params;
  await tournamentService.forceStartTournament(tournamentId, userId);
  const bracket = await tournamentService.getBracket(tournamentId);
  res.json(bracket);
});

export const getBracket = asyncHandler(async (req, res: Response) => {
  const { tournamentId } = req.params;
  const bracket = await tournamentService.getBracket(tournamentId);
  res.json(bracket);
});

export const listActive = asyncHandler(async (_req, res: Response) => {
  const rows = await tournamentService.listActiveTournaments();
  res.json({ tournaments: rows });
});

export const getMatches = asyncHandler(async (req, res: Response) => {
  const { tournamentId } = req.params;
  const matches = await tournamentService.getTournamentMatches(tournamentId);
  res.json({ matches });
});

export const getChat = asyncHandler(async (req, res: Response) => {
  const userId = req.user!.sub;
  const { tournamentId } = req.params;
  await tournamentService.assertTournamentMember(userId, tournamentId);
  const limit = req.query.limit
    ? Math.min(200, Math.max(1, parseInt(String(req.query.limit), 10) || 100))
    : 100;
  const messages = await tournamentService.getChatMessages(tournamentId, limit);
  res.json({ messages });
});

export const postChat = asyncHandler(async (req, res: Response) => {
  const userId = req.user!.sub;
  const { tournamentId } = req.params;
  const text = (req.body as { text?: string })?.text;
  if (text === undefined || typeof text !== 'string') {
    throw new HttpError(400, 'text is required');
  }
  const msg = await tournamentService.postChatMessage(
    userId,
    tournamentId,
    text
  );
  getSocketServer()?.to(`tournament:${tournamentId}`).emit('tournament:chat', msg);
  res.status(201).json(msg);
});
