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
  solved: boolean;
  expectedSan?: string;
  alreadySolved: boolean;
  attempts: number;
  puzzle: PuzzlePublic;
  fen: string;
  lineIndex: number;
  opponentSans: string[];
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

  getRandomPuzzle(
    maxRating?: number,
    theme?: string | null
  ): Observable<{ puzzle: PuzzlePublic }> {
    const params = new URLSearchParams();
    if (maxRating !== undefined) {
      params.set('maxRating', String(maxRating));
    }
    if (theme) {
      params.set('theme', theme);
    }
    const q = params.toString() ? `?${params.toString()}` : '';
    return this.http.get<{ puzzle: PuzzlePublic }>(
      `${this.baseUrl}/api/puzzles/random${q}`
    );
  }

  getThemes(): Observable<{ themes: { theme: string; count: number }[] }> {
    return this.http.get<{ themes: { theme: string; count: number }[] }>(
      `${this.baseUrl}/api/puzzles/themes`
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

  getHint(
    puzzleId: string,
    lineIndex = 0
  ): Observable<{ fromSquare: string | null; lineIndex: number }> {
    return this.http.get<{ fromSquare: string | null; lineIndex: number }>(
      `${this.baseUrl}/api/puzzles/${encodeURIComponent(puzzleId)}/hint?lineIndex=${lineIndex}`
    );
  }

  /** POST /api/puzzles/:id/solve — records attempt server-side. */
  submitSolve(
    puzzleId: string,
    moveSan: string,
    lineIndex = 0
  ): Observable<PuzzleSolveResponse> {
    return this.http.post<PuzzleSolveResponse>(
      `${this.baseUrl}/api/puzzles/${encodeURIComponent(puzzleId)}/solve`,
      { move: moveSan, lineIndex }
    );
  }

  /** Alias — server is the source of truth for legality + scoring. */
  checkMove(
    puzzleId: string,
    san: string,
    lineIndex = 0
  ): Observable<PuzzleSolveResponse> {
    return this.submitSolve(puzzleId, san, lineIndex);
  }
}
