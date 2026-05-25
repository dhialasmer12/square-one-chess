import type { Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import * as chatService from '../services/chat.service';

export const getHistory = asyncHandler(async (req, res: Response) => {
  const viewerId = req.user!.sub;
  const roomId = req.query.roomId as string | undefined;
  const gameId = req.query.gameId as string | undefined;
  const withUserId = req.query.withUserId as string | undefined;
  const messages = await chatService.getHistoryForViewer(viewerId, {
    roomId,
    gameId,
    withUserId,
  });
  res.json({ messages });
});
