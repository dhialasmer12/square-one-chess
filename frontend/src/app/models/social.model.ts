export type FriendStatus = 'pending' | 'accepted' | 'blocked';

export interface FriendRequestDto {
  id: string;
  userId: string;
  friendId: string;
  status: FriendStatus;
  createdAt: string;
  userUsername: string;
  friendUsername: string;
}

export interface FriendListResponse {
  friends: FriendRequestDto[];
  incoming: FriendRequestDto[];
  outgoing: FriendRequestDto[];
  onlineFriendIds: string[];
}

export type ChatType = 'global' | 'game' | 'private';

export interface ChatMessageDto {
  id: string;
  fromUserId: string;
  fromUsername: string;
  toUserId: string | null;
  roomId: string;
  content: string;
  type: ChatType;
  createdAt: string;
}
