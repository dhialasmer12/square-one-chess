import { prisma } from '../models';
import { HttpError } from '../types';
import type { FriendListResponse, FriendRequestDto, FriendStatus } from '../types';
import { isUserOnline } from '../sockets/presence';

function toDto(
  row: {
    id: string;
    userId: string;
    friendId: string;
    status: string;
    createdAt: Date;
    user: { username: string };
    friend: { username: string };
  }
): FriendRequestDto {
  return {
    id: row.id,
    userId: row.userId,
    friendId: row.friendId,
    status: row.status as FriendStatus,
    createdAt: row.createdAt.toISOString(),
    userUsername: row.user.username,
    friendUsername: row.friend.username,
  };
}

export async function listAcceptedFriendIds(userId: string): Promise<string[]> {
  const rows = await prisma.friend.findMany({
    where: {
      OR: [
        { userId, status: 'accepted' },
        { friendId: userId, status: 'accepted' },
      ],
    },
    select: { userId: true, friendId: true },
  });
  const ids = new Set<string>();
  for (const r of rows) {
    ids.add(r.userId === userId ? r.friendId : r.userId);
  }
  return [...ids];
}

async function areFriends(a: string, b: string): Promise<boolean> {
  const row = await prisma.friend.findFirst({
    where: {
      OR: [
        { userId: a, friendId: b, status: 'accepted' },
        { userId: b, friendId: a, status: 'accepted' },
      ],
    },
  });
  return !!row;
}

export async function assertFriendship(
  userId: string,
  otherUserId: string
): Promise<void> {
  if (!(await areFriends(userId, otherUserId))) {
    throw new HttpError(403, 'You can only message accepted friends');
  }
}

export async function sendFriendRequest(
  fromUserId: string,
  targetUsername?: string,
  targetId?: string
): Promise<FriendRequestDto> {
  let friendId = targetId?.trim();
  if (!friendId && targetUsername?.trim()) {
    const u = await prisma.user.findUnique({
      where: { username: targetUsername.trim() },
      select: { id: true },
    });
    if (!u) {
      throw new HttpError(404, 'User not found');
    }
    friendId = u.id;
  }
  if (!friendId) {
    throw new HttpError(400, 'friendId or friendUsername required');
  }
  if (friendId === fromUserId) {
    throw new HttpError(400, 'Cannot friend yourself');
  }

  const existingAccepted = await prisma.friend.findFirst({
    where: {
      OR: [
        { userId: fromUserId, friendId, status: 'accepted' },
        { userId: friendId, friendId: fromUserId, status: 'accepted' },
      ],
    },
  });
  if (existingAccepted) {
    throw new HttpError(400, 'Already friends');
  }

  const reversePending = await prisma.friend.findUnique({
    where: {
      userId_friendId: { userId: friendId, friendId: fromUserId },
    },
  });
  if (reversePending?.status === 'pending') {
    const updated = await prisma.friend.update({
      where: { id: reversePending.id },
      data: { status: 'accepted' },
      include: {
        user: { select: { username: true } },
        friend: { select: { username: true } },
      },
    });
    return toDto(updated);
  }

  const dup = await prisma.friend.findUnique({
    where: {
      userId_friendId: { userId: fromUserId, friendId },
    },
  });
  if (dup) {
    if (dup.status === 'pending') {
      throw new HttpError(400, 'Friend request already sent');
    }
    if (dup.status === 'blocked') {
      throw new HttpError(403, 'Cannot send request');
    }
    throw new HttpError(400, 'Relationship already exists');
  }

  const row = await prisma.friend.create({
    data: {
      userId: fromUserId,
      friendId,
      status: 'pending',
    },
    include: {
      user: { select: { username: true } },
      friend: { select: { username: true } },
    },
  });
  return toDto(row);
}

export async function respondToRequest(
  requestId: string,
  actingUserId: string,
  action: 'accept' | 'reject'
): Promise<FriendRequestDto | null> {
  const row = await prisma.friend.findUnique({
    where: { id: requestId },
    include: {
      user: { select: { username: true } },
      friend: { select: { username: true } },
    },
  });
  if (!row) {
    throw new HttpError(404, 'Request not found');
  }
  if (row.friendId !== actingUserId) {
    throw new HttpError(403, 'Only the recipient can respond');
  }
  if (row.status !== 'pending') {
    throw new HttpError(400, 'Request is not pending');
  }
  if (action === 'reject') {
    await prisma.friend.delete({ where: { id: requestId } });
    return null;
  }
  const updated = await prisma.friend.update({
    where: { id: requestId },
    data: { status: 'accepted' },
    include: {
      user: { select: { username: true } },
      friend: { select: { username: true } },
    },
  });
  return toDto(updated);
}

export async function listFriends(userId: string): Promise<FriendListResponse> {
  const rows = await prisma.friend.findMany({
    where: {
      OR: [{ userId }, { friendId: userId }],
    },
    include: {
      user: { select: { username: true } },
      friend: { select: { username: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const friends: FriendRequestDto[] = [];
  const incoming: FriendRequestDto[] = [];
  const outgoing: FriendRequestDto[] = [];

  for (const r of rows) {
    const d = toDto(r);
    if (r.status === 'accepted') {
      friends.push(d);
    } else if (r.status === 'pending') {
      if (r.friendId === userId) {
        incoming.push(d);
      } else {
        outgoing.push(d);
      }
    }
  }

  const friendIds = friends.map((f) =>
    f.userId === userId ? f.friendId : f.userId
  );
  const onlineFriendIds = friendIds.filter((id) => isUserOnline(id));

  return { friends, incoming, outgoing, onlineFriendIds };
}

export async function removeFriend(
  userId: string,
  otherUserId: string
): Promise<void> {
  const row = await prisma.friend.findFirst({
    where: {
      OR: [
        { userId, friendId: otherUserId, status: 'accepted' },
        { userId: otherUserId, friendId: userId, status: 'accepted' },
      ],
    },
  });
  if (!row) {
    throw new HttpError(404, 'Friendship not found');
  }
  await prisma.friend.delete({ where: { id: row.id } });
}
