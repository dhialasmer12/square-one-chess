import type { Server, Socket } from 'socket.io';
import * as chatService from '../services/chat.service';
import * as friendService from '../services/friend.service';
import * as gameService from '../services/game.service';
import { HttpError } from '../types';
import { chatMemoryPush } from './chat-memory';
import {
  emitToUser,
  isUserOnline,
  presenceMarkOffline,
  presenceMarkOnline,
} from './presence';

const MAX_LEN = 2000;

function ackError(
  ack: ((r: unknown) => void) | undefined,
  message: string,
  status?: number
): void {
  ack?.({ ok: false, error: message, status });
}

async function broadcastFriendPresence(
  io: Server,
  userId: string,
  online: boolean
): Promise<void> {
  const ids = await friendService.listAcceptedFriendIds(userId);
  for (const fid of ids) {
    emitToUser(io, fid, 'friends:presence', { userId, online });
  }
}

export async function onSocialConnect(
  io: Server,
  socket: Socket,
  userId: string
): Promise<void> {
  await socket.join(`user:${userId}`);
  await socket.join('global:chat');
  const becameOnline = presenceMarkOnline(userId);
  const history = await chatService.loadLastMessages(chatService.ROOM_GLOBAL);
  socket.emit('chat:history', {
    roomId: chatService.ROOM_GLOBAL,
    messages: history,
  });
  const friendIds = await friendService.listAcceptedFriendIds(userId);
  const onlineFriendIds = friendIds.filter((id) => isUserOnline(id));
  socket.emit('friends:online-snapshot', { onlineFriendIds });
  if (becameOnline) {
    await broadcastFriendPresence(io, userId, true);
  }
}

export function onSocialDisconnect(io: Server, userId: string): void {
  const wentOffline = presenceMarkOffline(userId);
  if (wentOffline) {
    void broadcastFriendPresence(io, userId, false);
  }
}

export function registerSocialChatHandlers(io: Server, socket: Socket): void {
  const userId = socket.data.userId as string;

  socket.on(
    'chat:global',
    async (
      payload: { content?: string },
      ack?: (r: unknown) => void
    ) => {
      try {
        const content = payload?.content?.trim() ?? '';
        if (!content) {
          ackError(ack, 'content required', 400);
          return;
        }
        if (content.length > MAX_LEN) {
          ackError(ack, 'Message too long', 400);
          return;
        }
        const msg = await chatService.saveChatMessage({
          fromUserId: userId,
          toUserId: null,
          roomId: chatService.ROOM_GLOBAL,
          content,
          type: 'global',
        });
        chatMemoryPush(chatService.ROOM_GLOBAL, msg);
        io.to('global:chat').emit('chat:global', msg);
        ack?.({ ok: true, message: msg });
      } catch (e) {
        console.error('[chat:global]', e);
        ackError(ack, 'Failed to send', 500);
      }
    }
  );

  socket.on(
    'chat:game',
    async (
      payload: { gameId?: string; content?: string },
      ack?: (r: unknown) => void
    ) => {
      try {
        const gameId = payload?.gameId;
        const content = payload?.content?.trim() ?? '';
        if (!gameId || !content) {
          ackError(ack, 'gameId and content required', 400);
          return;
        }
        if (content.length > MAX_LEN) {
          ackError(ack, 'Message too long', 400);
          return;
        }
        const game = await gameService.loadGameOrThrow(gameId);
        if (
          game.whitePlayerId !== userId &&
          game.blackPlayerId !== userId
        ) {
          ackError(ack, 'Not in this game', 403);
          return;
        }
        const roomId = chatService.roomForGame(gameId);
        const msg = await chatService.saveChatMessage({
          fromUserId: userId,
          toUserId: null,
          roomId,
          content,
          type: 'game',
        });
        chatMemoryPush(roomId, msg);
        io.to(`game:${gameId}`).emit('chat:game', msg);
        ack?.({ ok: true, message: msg });
      } catch (e) {
        if (e instanceof HttpError) {
          ackError(ack, e.message, e.statusCode);
        } else {
          console.error('[chat:game]', e);
          ackError(ack, 'Failed to send', 500);
        }
      }
    }
  );

  socket.on(
    'chat:private',
    async (
      payload: { toUserId?: string; content?: string },
      ack?: (r: unknown) => void
    ) => {
      try {
        const toUserId = payload?.toUserId;
        const content = payload?.content?.trim() ?? '';
        if (!toUserId || !content) {
          ackError(ack, 'toUserId and content required', 400);
          return;
        }
        if (content.length > MAX_LEN) {
          ackError(ack, 'Message too long', 400);
          return;
        }
        await friendService.assertFriendship(userId, toUserId);
        const roomId = chatService.roomForDm(userId, toUserId);
        const msg = await chatService.saveChatMessage({
          fromUserId: userId,
          toUserId,
          roomId,
          content,
          type: 'private',
        });
        chatMemoryPush(roomId, msg);
        emitToUser(io, toUserId, 'chat:private', msg);
        socket.emit('chat:private', msg);
        ack?.({ ok: true, message: msg });
      } catch (e) {
        if (e instanceof HttpError) {
          ackError(ack, e.message, e.statusCode);
        } else {
          console.error('[chat:private]', e);
          ackError(ack, 'Failed to send', 500);
        }
      }
    }
  );

  socket.on(
    'chat:join-game',
    async (
      payload: { gameId?: string },
      ack?: (r: unknown) => void
    ) => {
      try {
        const gameId = payload?.gameId;
        if (!gameId) {
          ackError(ack, 'gameId required', 400);
          return;
        }
        const game = await gameService.loadGameOrThrow(gameId);
        if (
          game.whitePlayerId !== userId &&
          game.blackPlayerId !== userId
        ) {
          ackError(ack, 'Not in this game', 403);
          return;
        }
        await socket.join(`game:${gameId}`);
        const roomId = chatService.roomForGame(gameId);
        const messages = await chatService.loadLastMessages(roomId);
        socket.emit('chat:history', { roomId, messages });
        ack?.({ ok: true });
      } catch (e) {
        if (e instanceof HttpError) {
          ackError(ack, e.message, e.statusCode);
        } else {
          ackError(ack, 'join failed', 500);
        }
      }
    }
  );

  socket.on(
    'chat:join-dm',
    async (
      payload: { withUserId?: string },
      ack?: (r: unknown) => void
    ) => {
      try {
        const withUserId = payload?.withUserId;
        if (!withUserId) {
          ackError(ack, 'withUserId required', 400);
          return;
        }
        await friendService.assertFriendship(userId, withUserId);
        const roomId = chatService.roomForDm(userId, withUserId);
        const messages = await chatService.loadLastMessages(roomId);
        socket.emit('chat:history', { roomId, messages });
        ack?.({ ok: true });
      } catch (e) {
        if (e instanceof HttpError) {
          ackError(ack, e.message, e.statusCode);
        } else {
          ackError(ack, 'join failed', 500);
        }
      }
    }
  );
}
