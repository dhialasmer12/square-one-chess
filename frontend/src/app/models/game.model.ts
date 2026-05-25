export interface GameResponse {
  id: string;
  fen: string;
  pgn: string | null;
  status: string;
  winner: string | null;
  whitePlayerId: string;
  blackPlayerId: string;
  startedAt: string;
  endedAt: string | null;
  /** Clock e.g. "10+0" — minutes + increment (seconds). */
  timeControl: string;
}

export interface GamePlayerPreview {
  id: string;
  username: string;
  /** Rating for this game’s time class. */
  elo: number;
  eloBullet: number;
  eloBlitz: number;
  eloRapid: number;
}

export interface GameSessionResponse {
  game: GameResponse;
  myColor: 'white' | 'black';
  opponent: GamePlayerPreview;
  self: GamePlayerPreview;
  timeControl: string;
}

export interface ChessStatusPayload {
  isGameOver: boolean;
  winner: 'white' | 'black' | null;
  inCheck: boolean;
  isCheckmate: boolean;
  isStalemate: boolean;
  isDraw: boolean;
  turn: 'white' | 'black';
}

export interface GameMovedPayload {
  gameId: string;
  from: string;
  to: string;
  promotion?: string;
  game: GameResponse;
}

export type GameEndReason =
  | 'disconnect'
  | 'resign'
  | 'draw'
  | 'checkmate'
  | 'stalemate'
  | string;

export interface GameEndPayload {
  winner: string | null;
  reason?: GameEndReason;
  game: GameResponse;
}

export interface OpponentAwayPayload {
  gameId: string;
  userId: string;
  graceMs: number;
}
