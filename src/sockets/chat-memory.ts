import type { ChatMessageDto } from '../types';

const MAX = 50;
const memory = new Map<string, ChatMessageDto[]>();

export function chatMemoryPush(roomId: string, msg: ChatMessageDto): void {
  const prev = memory.get(roomId) ?? [];
  const next = [...prev, msg].slice(-MAX);
  memory.set(roomId, next);
}

export function chatMemoryGet(roomId: string): ChatMessageDto[] {
  return memory.get(roomId) ?? [];
}

export function chatMemorySeed(roomId: string, messages: ChatMessageDto[]): void {
  memory.set(roomId, messages.slice(-MAX));
}
