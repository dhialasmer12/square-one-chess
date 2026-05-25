import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Chess } from 'chess.js';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import type { MoveHistoryEntry } from '../models/game-history.model';

@Injectable({ providedIn: 'root' })
export class ReplayService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.API_URL;

  /** Raw PGN text from the server. */
  getGamePGN(gameId: string): Observable<string> {
    return this.http.get(`${this.baseUrl}/api/games/${gameId}/pgn`, {
      responseType: 'text',
    });
  }

  /** JSON wrapper `{ pgn }` (same endpoint, `?format=json`). */
  getGamePGNJson(gameId: string): Observable<{ pgn: string }> {
    return this.http.get<{ pgn: string }>(
      `${this.baseUrl}/api/games/${gameId}/pgn?format=json`
    );
  }

  /** SAN half-moves from stored game moves. */
  getGameMoves(gameId: string): Observable<string[]> {
    return this.http
      .get<{ moves: string[] }>(`${this.baseUrl}/api/games/${gameId}/moves`)
      .pipe(map((r) => r.moves));
  }

  /** Full move rows from the database (SAN + from/to/promotion). */
  getGameMovesVerbose(gameId: string): Observable<MoveHistoryEntry[]> {
    return this.http
      .get<{ moves: MoveHistoryEntry[] }>(
        `${this.baseUrl}/api/games/${gameId}/moves?verbose=1`
      )
      .pipe(map((r) => r.moves));
  }

  /** Convert PGN text to SAN half-moves (empty if invalid / no moves). */
  parsePGN(pgn: string): string[] {
    const chess = new Chess();
    const raw = pgn?.trim() ?? '';
    if (!raw) {
      return [];
    }
    try {
      chess.loadPgn(raw);
    } catch {
      return [];
    }
    return chess.history();
  }

  sanListFromVerbose(entries: MoveHistoryEntry[]): string[] {
    return entries.map((e) => e.san);
  }
}
