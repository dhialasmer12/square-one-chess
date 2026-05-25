import type { Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import * as friendService from '../services/friend.service';
import type { FriendRespondBody, SendFriendRequestBody } from '../types';
import { HttpError } from '../types';

export const sendRequest = asyncHandler(async (req, res: Response) => {
  const userId = req.user!.sub;
  const body = (req.body ?? {}) as SendFriendRequestBody;
  const row = await friendService.sendFriendRequest(
    userId,
    body.friendUsername,
    body.friendId
  );
  res.status(201).json(row);
});

export const respond = asyncHandler(async (req, res: Response) => {
  const userId = req.user!.sub;
  const { requestId } = req.params;
  const body = (req.body ?? {}) as FriendRespondBody;
  if (body.action !== 'accept' && body.action !== 'reject') {
    throw new HttpError(400, 'action must be accept or reject');
  }
  const row = await friendService.respondToRequest(
    requestId,
    userId,
    body.action
  );
  if (!row) {
    res.status(204).end();
    return;
  }
  res.json(row);
});

export const list = asyncHandler(async (req, res: Response) => {
  const userId = req.user!.sub;
  const data = await friendService.listFriends(userId);
  res.json(data);
});

export const remove = asyncHandler(async (req, res: Response) => {
  const userId = req.user!.sub;
  const { friendId } = req.params;
  await friendService.removeFriend(userId, friendId);
  res.status(204).end();
});
