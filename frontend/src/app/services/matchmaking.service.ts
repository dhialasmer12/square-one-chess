import { Injectable, inject } from '@angular/core';
import { NgZone } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import type { MatchFoundPayload } from '../models';
import { SocketService } from './socket.service';

/**
 * Listens for Socket.io match events (server emits `match:found`).
 */
@Injectable({ providedIn: 'root' })
export class MatchmakingService {
  private readonly sockets = inject(SocketService);
  private readonly zone = inject(NgZone);

  private readonly foundSubject = new Subject<MatchFoundPayload>();
  readonly matchFound$: Observable<MatchFoundPayload> =
    this.foundSubject.asObservable();

  private listening = false;

  private readonly onMatchFound = (raw: unknown) => {
    const p = raw as MatchFoundPayload;
    if (!p?.gameId || !p.game) {
      return;
    }
    this.zone.run(() => {
      this.foundSubject.next({
        gameId: p.gameId,
        color: p.color,
        opponentUsername: p.opponentUsername ?? 'Opponent',
        game: p.game,
      });
    });
  };

  /** Subscribe to `match:found` / `match-found` on the shared socket. */
  startListening(): void {
    if (this.listening) {
      return;
    }
    const s = this.sockets.connect();
    s.on('match:found', this.onMatchFound);
    s.on('match-found', this.onMatchFound);
    this.listening = true;
  }

  stopListening(): void {
    if (!this.listening) {
      return;
    }
    this.sockets.getSocket()?.off('match:found', this.onMatchFound);
    this.sockets.getSocket()?.off('match-found', this.onMatchFound);
    this.listening = false;
  }

}
