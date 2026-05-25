import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, map } from 'rxjs';
import { environment } from '../../environments/environment';
import type { UserStatsPayload } from '../models';
import type {
  EloHistoryByFormat,
  ProfileDashboard,
  ProfileGameHistoryRow,
  UpdateProfileRequest,
  UserProfileApi,
} from '../models/profile.model';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.API_URL;

  getProfile(): Observable<UserProfileApi> {
    return this.http.get<UserProfileApi>(`${this.baseUrl}/api/auth/me`);
  }

  getStats(userId: string): Observable<UserStatsPayload> {
    return this.http.get<UserStatsPayload>(
      `${this.baseUrl}/api/stats/user/${userId}`
    );
  }

  getEloHistory(userId: string): Observable<EloHistoryByFormat> {
    return this.http.get<EloHistoryByFormat>(
      `${this.baseUrl}/api/stats/user/${userId}/elo-history`
    );
  }

  getGameHistory(
    userId: string,
    limit = 50
  ): Observable<ProfileGameHistoryRow[]> {
    return this.http
      .get<{ games: ProfileGameHistoryRow[] }>(
        `${this.baseUrl}/api/games/user/${userId}/history?limit=${limit}`
      )
      .pipe(map((r) => r.games));
  }

  loadDashboard(userId: string): Observable<ProfileDashboard> {
    return forkJoin({
      profile: this.getProfile(),
      stats: this.getStats(userId),
      eloHistory: this.getEloHistory(userId),
      games: this.getGameHistory(userId),
    });
  }

  updateProfile(body: UpdateProfileRequest): Observable<UserProfileApi> {
    return this.http.put<UserProfileApi>(
      `${this.baseUrl}/api/auth/profile`,
      body
    );
  }
}
