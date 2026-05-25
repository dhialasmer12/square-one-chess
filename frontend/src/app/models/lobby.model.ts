import type { GameResponse } from './game.model';

export interface MatchFoundPayload {
  gameId: string;
  color: 'white' | 'black';
  opponentUsername: string;
  game: GameResponse;
}

export interface QueueJoinAck {
  ok: boolean;
  queueSize?: number;
  position?: number;
  error?: string;
}

export interface QueueStatusAck {
  ok: boolean;
  queueSize?: number;
  inQueue?: boolean;
  position?: number | null;
  error?: string;
}

export interface RecentGameRow {
  gameId: string;
  opponentUsername: string;
  playedAs: 'white' | 'black';
  result: 'win' | 'loss' | 'draw' | 'ongoing';
  winner: string | null;
  startedAt: string;
  endedAt: string | null;
}

export interface UserStatsPayload {
  userId: string;
  username: string;
  email?: string;
  /** Peak rating (max of the three formats). */
  elo: number;
  eloBullet: number;
  eloBlitz: number;
  eloRapid: number;
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  gamesDrawn: number;
  winRatePercent: number | null;
  winStreak: number;
  longestWinStreak: number;
  avgGameDurationSeconds: number | null;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  elo: number;
  gamesPlayed: number;
  gamesWon: number;
  winStreak: number;
  longestWinStreak: number;
  winRatePercent: number | null;
}

export interface RankPayload {
  rank: number;
  totalRankedPlayers: number;
  elo: number;
  username: string;
  /** Which rating column this rank uses (from API). */
  ratingFormat?: string;
}
