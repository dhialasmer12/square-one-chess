import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import type {
  GameHistoryPageResponse,
  GameHistoryQueryParams,
} from '../models/game-history.model';

@Injectable({ providedIn: 'root' })
export class GameHistoryService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.API_URL;

  getHistoryPage(
    userId: string,
    params: GameHistoryQueryParams
  ): Observable<GameHistoryPageResponse> {
    let httpParams = new HttpParams();
    if (params.page != null) {
      httpParams = httpParams.set('page', String(params.page));
    }
    if (params.pageSize != null) {
      httpParams = httpParams.set('pageSize', String(params.pageSize));
    }
    if (params.result && params.result !== 'all') {
      httpParams = httpParams.set('result', params.result);
    }
    if (params.opponent?.trim()) {
      httpParams = httpParams.set('opponent', params.opponent.trim());
    }
    if (params.dateFrom) {
      httpParams = httpParams.set('dateFrom', params.dateFrom);
    }
    if (params.dateTo) {
      httpParams = httpParams.set('dateTo', params.dateTo);
    }
    if (params.sort) {
      httpParams = httpParams.set('sort', params.sort);
    }
    return this.http.get<GameHistoryPageResponse>(
      `${this.baseUrl}/api/games/history/${userId}`,
      { params: httpParams }
    );
  }
}
