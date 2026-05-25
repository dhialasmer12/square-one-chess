import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import type {
  GameReviewResponse,
  LessonPuzzlesResponse,
  PredictMoveResponse,
  RecommendLessonsResponse,
  SkillEstimateResponse,
} from '../models/ai.model';

@Injectable({ providedIn: 'root' })
export class AiSuggestionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.API_URL;

  predictMove(fen: string, numMoves = 3): Observable<PredictMoveResponse> {
    return this.http.post<PredictMoveResponse>(
      `${this.baseUrl}/api/ai/predict-move`,
      { fen, numMoves }
    );
  }

  estimateSkill(body: {
    gameId?: string;
    moves?: string[];
  }): Observable<SkillEstimateResponse> {
    return this.http.post<SkillEstimateResponse>(
      `${this.baseUrl}/api/ai/estimate-skill`,
      body
    );
  }

  recommendLessons(body: {
    userId: string;
    numRecommendations?: number;
  }): Observable<RecommendLessonsResponse> {
    return this.http.post<RecommendLessonsResponse>(
      `${this.baseUrl}/api/ai/recommend-lessons`,
      body
    );
  }

  lessonPuzzles(body: { lessonId: string; limit?: number }): Observable<LessonPuzzlesResponse> {
    return this.http.post<LessonPuzzlesResponse>(
      `${this.baseUrl}/api/ai/lesson-puzzles`,
      body
    );
  }

  gameReview(gameId: string): Observable<GameReviewResponse> {
    return this.http.get<GameReviewResponse>(
      `${this.baseUrl}/api/ai/game-review/${encodeURIComponent(gameId)}`
    );
  }
}
