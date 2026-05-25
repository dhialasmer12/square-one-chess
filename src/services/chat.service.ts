import { prisma } from '../models';
import { HttpError } from '../types';
import type { ChatMessageDto, ChatType } from '../types';
import { chatMemorySeed, chatMemoryGet } from '../sockets/chat-memory';
import * as friendService from './friend.service';
import { loadGameOrThrow } from './game.service';

export const ROOM_GLOBAL = 'global';

export function roomForGame(gameId: string): string {
  return `game:${gameId}`;
}

export function roomForDm(a: string, b: string): string {
  return a < b ? `dm:${a}:${b}` : `dm:${b}:${a}`;
}

function toDto(row: {
  id: string;
  fromUserId: string;
  toUserId: string | null;
  roomId: string;
  content: string;
  type: string;
  createdAt: Date;
  fromUser: { username: string };
}): ChatMessageDto {
  return {
    id: row.id,
    fromUserId: row.fromUserId,
    fromUsername: row.fromUser.username,
    toUserId: row.toUserId,
    roomId: row.roomId,
    content: row.content,
    type: row.type as ChatType,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function saveChatMessage(data: {
  fromUserId: string;
  toUserId: string | null;
  roomId: string;
  content: string;
  type: ChatType;
}): Promise<ChatMessageDto> {
  const row = await prisma.chatMessage.create({
    data: {
      fromUserId: data.fromUserId,
      toUserId: data.toUserId,
      roomId: data.roomId,
      content: data.content,
      type: data.type,
    },
    include: { fromUser: { select: { username: true } } },
  });
  return toDto(row);
}

export async function loadLastMessages(
  roomId: string,
  limit = 50
): Promise<ChatMessageDto[]> {
  const rows = await prisma.chatMessage.findMany({
    where: { roomId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: { fromUser: { select: { username: true } } },
  });
  const list = rows.reverse().map(toDto);
  chatMemorySeed(roomId, list);
  return list;
}

export async function getHistoryForViewer(
  viewerId: string,
  opts: { roomId?: string; gameId?: string; withUserId?: string }
): Promise<ChatMessageDto[]> {
  if (opts.roomId === ROOM_GLOBAL || opts.roomId === 'global') {
    return loadLastMessages(ROOM_GLOBAL);
  }
  if (opts.gameId) {
    const game = await loadGameOrThrow(opts.gameId);
    if (game.whitePlayerId !== viewerId && game.blackPlayerId !== viewerId) {
      throw new HttpError(403, 'Not a player in this game');
    }
    return loadLastMessages(roomForGame(opts.gameId));
  }
  if (opts.withUserId) {
    await friendService.assertFriendship(viewerId, opts.withUserId);
    return loadLastMessages(roomForDm(viewerId, opts.withUserId));
  }
  throw new HttpError(
    400,
    'Provide roomId=global, gameId, or withUserId for DM'
  );
}

export function memorySnapshot(roomId: string): ChatMessageDto[] {
  return chatMemoryGet(roomId);
}
