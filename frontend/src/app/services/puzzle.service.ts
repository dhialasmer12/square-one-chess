import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type PuzzlePublic = {
  id: string;
  fen: string;
  theme: string;
  rating: number;
  tries: number;
  successes: number;
  plies: number;
};

export type PuzzleSolveResponse = {
  correct: boolean;
  expectedSan?: string;
  alreadySolved: boolean;
  attempts: number;
  puzzle: PuzzlePublic;
};

export type PuzzleStatsResponse = {
  stats: {
    puzzleRating: number;
    chessElo: number;
    solvedCount: number;
    totalAttempts: number;
    successRate: number;
    currentStreak: number;
    bestStreak: number;
    recentSolved: {
      puzzleId: string;
      theme: string;
      rating: number;
      solvedAt: string;
      attempts: number;
    }[];
    solvedByDay: { day: string; count: number }[];
  };
};

@Injectable({ providedIn: 'root' })
export class PuzzleService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.API_URL;

  getDailyPuzzle(): Observable<{ puzzle: PuzzlePublic }> {
    return this.http.get<{ puzzle: PuzzlePublic }>(
      `${this.baseUrl}/api/puzzles/daily`
    );
  }

  getRandomPuzzle(maxRating?: number): Observable<{ puzzle: PuzzlePublic }> {
    const q =
      maxRating !== undefined
        ? `?maxRating=${encodeURIComponent(String(maxRating))}`
        : '';
    return this.http.get<{ puzzle: PuzzlePublic }>(
      `${this.baseUrl}/api/puzzles/random${q}`
    );
  }

  getStats(): Observable<PuzzleStatsResponse> {
    return this.http.get<PuzzleStatsResponse>(`${this.baseUrl}/api/puzzles/stats`);
  }

  getTheme(theme: string, limit = 20): Observable<{ puzzles: PuzzlePublic[] }> {
    return this.http.get<{ puzzles: PuzzlePublic[] }>(
      `${this.baseUrl}/api/puzzles/theme/${encodeURIComponent(theme)}?limit=${limit}`
    );
  }

  getHint(puzzleId: string): Observable<{ fromSquare: string | null }> {
    return this.http.get<{ fromSquare: string | null }>(
      `${this.baseUrl}/api/puzzles/${encodeURIComponent(puzzleId)}/hint`
    );
  }

  /** POST /api/puzzles/:id/solve — records attempt server-side. */
  submitSolve(puzzleId: string, moveSan: string): Observable<PuzzleSolveResponse> {
    return this.http.post<PuzzleSolveResponse>(
      `${this.baseUrl}/api/puzzles/${encodeURIComponent(puzzleId)}/solve`,
      { move: moveSan }
    );
  }

  /** Alias — server is the source of truth for legality + scoring. */
  checkMove(puzzleId: string, san: string): Observable<PuzzleSolveResponse> {
    return this.submitSolve(puzzleId, san);
  }
}
