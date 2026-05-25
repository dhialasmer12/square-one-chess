export type GameHistorySort =
  | 'date_desc'
  | 'date_asc'
  | 'opponent_elo_desc'
  | 'opponent_elo_asc'
  | 'game_length_desc'
  | 'game_length_asc';

export type GameHistoryResultFilter = 'all' | 'win' | 'loss' | 'draw';

export interface GameHistoryPageRow {
  gameId: string;
  opponentUsername: string;
  opponentElo: number;
  timeControl: string;
  opponentUserId: string;
  playedAs: 'white' | 'black';
  result: 'win' | 'loss' | 'draw';
  startedAt: string;
  endedAt: string;
  moveCount: number;
  durationSeconds: number;
}

export interface GameHistoryPageResponse {
  games: GameHistoryPageRow[];
  page: number;
  pageSize: number;
  total: number;
}

export interface MoveHistoryEntry {
  san: string;
  from: string;
  to: string;
  promotion: string | null;
}

export interface GameHistoryQueryParams {
  page?: number;
  pageSize?: number;
  result?: GameHistoryResultFilter;
  opponent?: string;
  dateFrom?: string;
  dateTo?: string;
  sort?: GameHistorySort;
}
