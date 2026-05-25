import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { environment } from '../../environments/environment';
import type {
  LeaderboardEntry,
  RankPayload,
  RecentGameRow,
  UserStatsPayload,
} from '../models';

export interface LobbyDataBundle {
  stats: UserStatsPayload;
  rank: RankPayload;
  recentGames: RecentGameRow[];
  leaderboard: LeaderboardEntry[];
}

@Injectable({ providedIn: 'root' })
export class LobbyDataService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.API_URL;

  loadLobbyData(userId: string) {
    return forkJoin({
      stats: this.http.get<UserStatsPayload>(
        `${this.baseUrl}/api/stats/user/${userId}`
      ),
      rank: this.http.get<RankPayload>(
        `${this.baseUrl}/api/stats/user/${userId}/rank?format=combined`
      ),
      recent: this.http.get<{ games: RecentGameRow[] }>(
        `${this.baseUrl}/api/games/user/${userId}/recent?limit=5`
      ),
      leaderboard: this.http.get<{ leaderboard: LeaderboardEntry[] }>(
        `${this.baseUrl}/api/stats/leaderboard?limit=10&format=combined`
      ),
    });
  }
}
