export interface MoveSuggestion {
  from: string;
  to: string;
  san: string;
  score: number;
  description: string;
}

export interface PredictMoveResponse {
  suggestions: MoveSuggestion[];
}

export type SkillConfidence = 'low' | 'medium' | 'high';

export type SkillTierWord = 'good' | 'average' | 'poor';

export interface SkillEstimateFactors {
  development: SkillTierWord;
  tactics: SkillTierWord;
  endgame: SkillTierWord;
  blunders: number;
  mistakes: number;
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

export interface LessonRecommendation {
  id: string;
  title: string;
  priority: 'high' | 'medium' | 'low';
  reason: string;
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedTime: string;
}

export interface RecommendLessonsResponse {
  lessons: LessonRecommendation[];
}

/** Practice positions mined from the signed-in user’s finished games. */
export interface LessonPuzzleItem {
  id: string;
  prompt: string;
  solutionHint: string;
  fen?: string;
  gameId?: string;
  plyIndex?: number;
  pattern?: string;
  playedSan?: string;
  bestSan?: string;
}

export interface LessonPuzzlesResponse {
  puzzles: LessonPuzzleItem[];
}

export interface GameReviewMoveRow {
  plyIndex: number;
  san: string;
  byWhite: boolean;
  isMine: boolean;
  quality?: 'blunder' | 'mistake' | 'good' | 'excellent';
  bestSan?: string;
  note?: string;
}

export interface GameReviewResponse {
  gameId: string;
  myColor: 'white' | 'black';
  moves: GameReviewMoveRow[];
  puzzles: LessonPuzzleItem[];
}
