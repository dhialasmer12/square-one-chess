import type { Chess } from 'chess.js';

export type ActiveGameEntry = {
  gameId: string;
  white: { userId: string; socketId: string };
  black: { userId: string; socketId: string };
  gameInstance: Chess;
  startTime: number;
};

export const activeGames = new Map<string, ActiveGameEntry>();
