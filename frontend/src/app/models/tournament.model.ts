export interface TournamentListItem {
  id: string;
  name: string;
  type: string;
  maxPlayers: number;
  currentPlayers: number;
  status: string;
  currentRound: number;
  createdAt: string;
}

export interface BracketMatchDto {
  id: string;
  round: number;
  matchIndex: number;
  whitePlayerId: string;
  blackPlayerId: string;
  whiteUsername: string;
  blackUsername: string;
  winnerId: string | null;
  gameId: string | null;
  status: string;
}

export interface BracketRoundDto {
  round: number;
  matches: BracketMatchDto[];
}

export interface BracketResponse {
  tournament: TournamentListItem;
  rounds: BracketRoundDto[];
}

export interface TournamentMatchDto {
  id: string;
  tournamentId: string;
  round: number;
  matchIndex: number;
  whitePlayerId: string;
  blackPlayerId: string;
  whiteUsername: string;
  blackUsername: string;
  winnerId: string | null;
  winnerUsername: string | null;
  gameId: string | null;
  status: string;
}

export interface TournamentMessageDto {
  id: string;
  tournamentId: string;
  userId: string;
  username: string;
  body: string;
  createdAt: string;
}

export interface CreateTournamentRequest {
  name: string;
  type: 'single_elimination' | 'round_robin';
  maxPlayers: number;
}

export interface TournamentMatchReadyPayload {
  tournamentId: string;
  matchId: string;
  gameId: string;
  round: number;
  whitePlayerId: string;
  blackPlayerId: string;
}

export interface TournamentNewMatchPayload {
  tournamentId: string;
  round: number;
  matches: {
    matchId: string;
    gameId: string;
    whitePlayerId: string;
    blackPlayerId: string;
  }[];
}
