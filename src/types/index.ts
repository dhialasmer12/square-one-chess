export interface JwtPayload {
  sub: string;
  email: string;
}

export interface AuthTokens {
  accessToken: string;
  expiresIn: string;
}

export interface RegisterBody {
  email: string;
  password: string;
  /** @deprecated use username */
  displayName?: string;
  username?: string;
}

export interface LoginBody {
  password: string;
  identifier?: string;
  email?: string;
  username?: string;
}

export interface UpdateEloBody {
  newElo: number;
}

/** POST /api/games/create */
export interface CreateGameApiBody {
  whitePlayerId: string;
  blackPlayerId: string;
  /** Optional clock label e.g. "10+0" (must be a lobby preset). */
  timeControl?: string;
}

/** POST /api/games/:gameId/move */
export interface PlayMoveBody {
  from: string;
  to: string;
  promotion?: 'q' | 'r' | 'b' | 'n';
}

/** POST /api/ai/predict-move */
export interface PredictMoveBody {
  fen: string;
  numMoves?: number;
}

/** POST /api/ai/estimate-skill */
export interface EstimateSkillBody {
  moves?: string[];
  gameId?: string;
}

export type SkillConfidence = 'low' | 'medium' | 'high';

export type SkillTierWord = 'good' | 'average' | 'poor';

export interface SkillEstimateFactors {
  development: SkillTierWord;
  tactics: SkillTierWord;
  endgame: SkillTierWord;
  blunders: number;
  mistakes: number;
  /** 0–100 move accuracy for the analyzed side (makes estimates differ across games). */
  accuracyPercent: number;
  movesAnalyzed: number;
}

export interface SkillEstimateResponse {
  estimatedElo: number;
  confidence: SkillConfidence;
  factors: SkillEstimateFactors;
  strengths: string[];
  weaknesses: string[];
}

export interface LessonCatalogEntry {
  id: string;
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  relatedMistake: string;
  puzzleCount: number;
  videoUrl?: string;
}

export interface LessonRecommendation {
  id: string;
  title: string;
  priority: 'high' | 'medium' | 'low';
  reason: string;
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedTime: string;
}

/** POST /api/ai/recommend-lessons */
export interface RecommendLessonsBody {
  userId: string;
  numRecommendations?: number;
}

/** Mistake themes used for lessons and personalized puzzles. */
export type MistakePatternKey =
  | 'hanging_piece'
  | 'missed_fork'
  | 'missed_pin'
  | 'castling_mistake'
  | 'pawn_weakness'
  | 'endgame_error'
  | 'suboptimal';

/** One training position mined from the user’s own games. */
export interface LessonPuzzleDto {
  id: string;
  gameId: string;
  plyIndex: number;
  fen: string;
  pattern: MistakePatternKey;
  playedSan: string;
  bestSan: string;
  prompt: string;
  solutionHint: string;
}

/** POST /api/ai/lesson-puzzles */
export interface LessonPuzzlesBody {
  lessonId: string;
  limit?: number;
}

export interface GameReviewMoveDto {
  plyIndex: number;
  san: string;
  byWhite: boolean;
  isMine: boolean;
  quality?: 'blunder' | 'mistake' | 'good' | 'excellent';
  bestSan?: string;
  note?: string;
}

/** GET /api/ai/game-review/:gameId */
export interface GameReviewResponse {
  gameId: string;
  myColor: 'white' | 'black';
  moves: GameReviewMoveDto[];
  puzzles: LessonPuzzleDto[];
}

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
  /** Rating for this game’s time class (bullet / blitz / rapid). */
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
  /** Same as `game.timeControl` (clock for this match). */
  timeControl: string;
}

export interface RecentGameSummary {
  gameId: string;
  opponentUsername: string;
  playedAs: 'white' | 'black';
  result: 'win' | 'loss' | 'draw' | 'ongoing';
  winner: string | null;
  startedAt: string;
  endedAt: string | null;
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

export type GameHistorySort =
  | 'date_desc'
  | 'date_asc'
  | 'opponent_elo_desc'
  | 'opponent_elo_asc'
  | 'game_length_desc'
  | 'game_length_asc';

export interface GameHistoryPageRow {
  gameId: string;
  opponentUsername: string;
  opponentElo: number;
  /** Clock label for this game (used for which rating bucket applies). */
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

export interface EloHistoryPoint {
  date: string;
  elo: number;
}

/** GET /api/stats/user/:userId/elo-history — one series per time class. */
export interface EloHistoryByFormatResponse {
  bullet: EloHistoryPoint[];
  blitz: EloHistoryPoint[];
  rapid: EloHistoryPoint[];
}

export interface UpdateProfileBody {
  username?: string;
  currentPassword?: string;
  newPassword?: string;
}

/** One cell from chess.js `board()` — `null` is empty square. */
export type BoardCell =
  | {
      square: string;
      type: string;
      color: 'w' | 'b';
    }
  | null;

export interface BoardStateResponse {
  fen: string;
  board: BoardCell[][];
}

export interface ValidMoveEntry {
  san: string;
  from: string;
  to: string;
  promotion?: string;
  flags: string;
  piece: string;
  captured?: string;
}

/** Tournaments */
export interface TournamentListItem {
  id: string;
  name: string;
  type: string;
  maxPlayers: number;
  currentPlayers: number;
  status: string;
  currentRound: number;
  createdAt: string;
  createdById: string;
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

export interface CreateTournamentBody {
  name: string;
  type: 'single_elimination' | 'round_robin';
  maxPlayers: number;
}

/** Analytics */
export interface PlatformStatsDto {
  totalUsers: number;
  activeGamesToday: number;
  totalGamesPlayed: number;
}

export interface UserGrowthPointDto {
  date: string;
  value: number;
}

export interface GameVolumePointDto {
  date: string;
  value: number;
}

export interface OpeningSliceDto {
  label: string;
  count: number;
}

export interface AverageGameLengthDto {
  averageMoves: number;
  medianMoves: number;
  sampleGames: number;
}

export interface ELOBucketDto {
  label: string;
  minElo: number;
  maxElo: number;
  count: number;
}

export interface ActivityHeatmapDto {
  cells: { dayOfWeek: number; hour: number; count: number }[];
  maxCount: number;
  timezoneNote: string;
}

export interface PlatformAnalyticsDto {
  stats: PlatformStatsDto;
  userGrowth: UserGrowthPointDto[];
  gameVolume: GameVolumePointDto[];
  popularOpenings: OpeningSliceDto[];
  averageGameLength: AverageGameLengthDto;
  eloDistribution: ELOBucketDto[];
  activityHeatmap: ActivityHeatmapDto;
}

export interface GamesAnalyticsDto {
  gameVolume: GameVolumePointDto[];
  popularOpenings: OpeningSliceDto[];
  averageGameLength: AverageGameLengthDto;
  activityHeatmap: ActivityHeatmapDto;
}

export interface UserAnalyticsDto {
  userId: string;
  username: string;
  elo: number;
  eloBullet: number;
  eloBlitz: number;
  eloRapid: number;
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  memberSince: string;
  personalGameVolume: GameVolumePointDto[];
  personalOpenings: OpeningSliceDto[];
}

/** Social / chat */
export type FriendStatus = 'pending' | 'accepted' | 'blocked';
export type ChatType = 'global' | 'game' | 'private';

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

export interface SendFriendRequestBody {
  friendUsername?: string;
  friendId?: string;
}

export interface FriendRespondBody {
  action: 'accept' | 'reject';
}

export class HttpError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'HttpError';
  }
}
