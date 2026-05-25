import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import type { FriendListResponse, FriendRequestDto } from '../models';

@Injectable({ providedIn: 'root' })
export class FriendApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.API_URL}/api/friends`;

  list() {
    return this.http.get<FriendListResponse>(this.base);
  }

  request(body: { friendUsername?: string; friendId?: string }) {
    return this.http.post<FriendRequestDto>(`${this.base}/request`, body);
  }

  respond(requestId: string, action: 'accept' | 'reject') {
    return this.http.put<FriendRequestDto | null>(
      `${this.base}/${requestId}`,
      { action }
    );
  }

  remove(friendId: string) {
    return this.http.delete(`${this.base}/${friendId}`);
  }
}
