import type { UserStatsPayload } from './lobby.model';

export type LeaderboardPeriod = 'all' | 'week' | 'month';

export interface EloHistoryPoint {
  date: string;
  elo: number;
}

export interface ProfileGameHistoryRow {
  gameId: string;
  opponentUsername: string;
  playedAs: 'white' | 'black';
  result: 'win' | 'loss' | 'draw' | 'ongoing';
  startedAt: string;
  endedAt: string | null;
  moveCount: number;
}

export interface UserProfileApi {
  id: string;
  email: string;
  username: string;
  displayName: string;
  elo: number;
  eloBullet: number;
  eloBlitz: number;
  eloRapid: number;
  gamesPlayed: number;
  gamesWon: number;
  createdAt: string;
  updatedAt: string;
}

export interface EloHistoryByFormat {
  bullet: EloHistoryPoint[];
  blitz: EloHistoryPoint[];
  rapid: EloHistoryPoint[];
}

export interface ProfileDashboard {
  profile: UserProfileApi;
  stats: UserStatsPayload;
  eloHistory: EloHistoryByFormat;
  games: ProfileGameHistoryRow[];
}

export interface UpdateProfileRequest {
  username?: string;
  currentPassword?: string;
  newPassword?: string;
}
