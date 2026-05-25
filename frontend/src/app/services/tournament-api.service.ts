import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import type {
  BracketResponse,
  CreateTournamentRequest,
  TournamentListItem,
  TournamentMatchDto,
  TournamentMessageDto,
} from '../models';

@Injectable({ providedIn: 'root' })
export class TournamentApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.API_URL}/api/tournaments`;

  listActive() {
    return this.http.get<{ tournaments: TournamentListItem[] }>(
      `${this.base}/active`
    );
  }

  create(body: CreateTournamentRequest) {
    return this.http.post<TournamentListItem>(`${this.base}/create`, body);
  }

  join(tournamentId: string) {
    return this.http.post<TournamentListItem>(
      `${this.base}/${tournamentId}/join`,
      {}
    );
  }

  getBracket(tournamentId: string) {
    return this.http.get<BracketResponse>(
      `${this.base}/${tournamentId}/bracket`
    );
  }

  getMatches(tournamentId: string) {
    return this.http.get<{ matches: TournamentMatchDto[] }>(
      `${this.base}/${tournamentId}/matches`
    );
  }

  getChat(tournamentId: string, limit = 100) {
    return this.http.get<{ messages: TournamentMessageDto[] }>(
      `${this.base}/${tournamentId}/chat`,
      { params: { limit: String(limit) } }
    );
  }

  postChat(tournamentId: string, text: string) {
    return this.http.post<TournamentMessageDto>(
      `${this.base}/${tournamentId}/chat`,
      { text }
    );
  }
}
