import type { Server } from 'socket.io';

/** Ref-count: multiple tabs = multiple sockets per user. */
const onlineRef = new Map<string, number>();

export function presenceMarkOnline(userId: string): boolean {
  const n = (onlineRef.get(userId) ?? 0) + 1;
  onlineRef.set(userId, n);
  return n === 1;
}

export function presenceMarkOffline(userId: string): boolean {
  const n = (onlineRef.get(userId) ?? 0) - 1;
  if (n <= 0) {
    onlineRef.delete(userId);
    return true;
  }
  onlineRef.set(userId, n);
  return false;
}

export function isUserOnline(userId: string): boolean {
  return (onlineRef.get(userId) ?? 0) > 0;
}

export function getOnlineUserIds(): string[] {
  return [...onlineRef.entries()]
    .filter(([, c]) => c > 0)
    .map(([id]) => id);
}

export function emitToUser(
  io: Server,
  targetUserId: string,
  event: string,
  payload: unknown
): void {
  io.to(`user:${targetUserId}`).emit(event, payload);
}
