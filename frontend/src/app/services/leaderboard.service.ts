import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import type { LeaderboardEntry, RankPayload } from '../models';
import type { LeaderboardPeriod } from '../models/profile.model';

export type LeaderboardRatingFormat =
  | 'combined'
  | 'bullet'
  | 'blitz'
  | 'rapid';

export interface LeaderboardQuery {
  limit?: number;
  period?: LeaderboardPeriod;
  search?: string;
  /** Server: `format=combined|bullet|blitz|rapid` */
  format?: LeaderboardRatingFormat;
}

@Injectable({ providedIn: 'root' })
export class LeaderboardService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.API_URL;

  getLeaderboard(query: LeaderboardQuery = {}): Observable<LeaderboardEntry[]> {
    const limit = query.limit ?? 100;
    const period = query.period ?? 'all';
    const search = query.search?.trim() ?? '';
    const format = query.format ?? 'combined';
    let url = `${this.baseUrl}/api/stats/leaderboard?limit=${limit}&period=${period}&format=${encodeURIComponent(format)}`;
    if (search) {
      url += `&search=${encodeURIComponent(search)}`;
    }
    return this.http
      .get<{ leaderboard: LeaderboardEntry[] }>(url)
      .pipe(map((r) => r.leaderboard));
  }

  /** Filter by username substring (server-side); same as getLeaderboard({ search }). */
  searchUser(
    usernameFragment: string,
    query: Omit<LeaderboardQuery, 'search'> = {}
  ): Observable<LeaderboardEntry[]> {
    return this.getLeaderboard({ ...query, search: usernameFragment });
  }

  getRank(
    userId: string,
    format: LeaderboardRatingFormat = 'combined'
  ): Observable<RankPayload> {
    return this.http.get<RankPayload>(
      `${this.baseUrl}/api/stats/user/${userId}/rank?format=${encodeURIComponent(format)}`
    );
  }
}
