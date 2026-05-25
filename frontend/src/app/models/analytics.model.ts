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

export interface PlayerKpis {
  elo: number;
  eloBullet: number;
  eloBlitz: number;
  eloRapid: number;
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  username: string;
}
