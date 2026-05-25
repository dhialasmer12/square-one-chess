import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import type {
  GamesAnalyticsDto,
  PlatformAnalyticsDto,
  UserAnalyticsDto,
} from '../models';

@Injectable({ providedIn: 'root' })
export class AnalyticsDashboardService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.API_URL}/api/analytics`;

  getPlatform(lastDays = 30): Observable<PlatformAnalyticsDto> {
    return this.http.get<PlatformAnalyticsDto>(`${this.base}/platform`, {
      params: { lastDays: String(lastDays) },
    });
  }

  getGames(lastDays = 30): Observable<GamesAnalyticsDto> {
    return this.http.get<GamesAnalyticsDto>(`${this.base}/games`, {
      params: { lastDays: String(lastDays) },
    });
  }

  getUser(userId: string): Observable<UserAnalyticsDto> {
    return this.http.get<UserAnalyticsDto>(`${this.base}/user/${userId}`);
  }

  /** Platform if admin; throws HttpErrorResponse with status 403 if not admin. */
  getPlatformOr403(lastDays = 30): Observable<PlatformAnalyticsDto> {
    return this.getPlatform(lastDays).pipe(
      catchError((e: HttpErrorResponse) => throwError(() => e))
    );
  }
}
