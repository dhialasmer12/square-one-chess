import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import type {
  ChessStatusPayload,
  GameResponse,
  GameSessionResponse,
} from '../models';
import { SocketService } from './socket.service';

@Injectable({ providedIn: 'root' })
export class GamePlayService {
  private readonly http = inject(HttpClient);
  private readonly sockets = inject(SocketService);
  private readonly baseUrl = environment.API_URL;

  getSession(gameId: string) {
    return this.http.get<GameSessionResponse>(
      `${this.baseUrl}/api/games/${gameId}`
    );
  }

  getMoveHistory(gameId: string) {
    return this.http.get<{ moves: string[] }>(
      `${this.baseUrl}/api/games/${gameId}/moves`
    );
  }

  getChessStatus(gameId: string) {
    return this.http.get<ChessStatusPayload>(
      `${this.baseUrl}/api/games/${gameId}/status`
    );
  }

  resignGame(gameId: string) {
    return this.http.post<GameResponse>(
      `${this.baseUrl}/api/games/${gameId}/resign`,
      {}
    );
  }

  createBotGame(
    timeControl: string,
    color: 'white' | 'black' = 'white',
    difficulty: 'easy' | 'medium' | 'hard' = 'medium'
  ) {
    return this.http.post<GameResponse>(`${this.baseUrl}/api/games/bot`, {
      timeControl,
      color,
      difficulty,
    });
  }

  /**
   * Join Socket.io room `game:{id}` (required to receive `game:moved` / `game:end`).
   * Server ack includes the same payload as GET /api/games/:gameId.
   */
  joinGame(gameId: string): Promise<GameSessionResponse> {
    const socket = this.sockets.connect();
    return new Promise((resolve, reject) => {
      socket
        .timeout(15_000)
        .emit(
          'game:join',
          { gameId },
          (err: Error | null, r: unknown) => {
            if (err) {
              reject(err);
              return;
            }
            const ack = r as {
              ok?: boolean;
              error?: string;
              game?: GameResponse;
              myColor?: 'white' | 'black';
              opponent?: GameSessionResponse['opponent'];
              self?: GameSessionResponse['self'];
              timeControl?: string;
            };
            if (
              ack?.ok &&
              ack.game &&
              ack.myColor &&
              ack.opponent &&
              ack.self
            ) {
              resolve({
                game: ack.game,
                myColor: ack.myColor,
                opponent: ack.opponent,
                self: ack.self,
                timeControl:
                  ack.game.timeControl ?? ack.timeControl ?? '10+0',
              });
              return;
            }
            reject(new Error(ack?.error ?? 'Failed to join game room'));
          }
        );
    });
  }

  leaveGame(gameId: string): void {
    this.sockets.getSocket()?.emit('game:leave', { gameId });
  }

  makeMove(
    gameId: string,
    from: string,
    to: string,
    promotion?: 'q' | 'r' | 'b' | 'n'
  ): Promise<GameResponse> {
    const socket = this.sockets.connect();
    return new Promise((resolve, reject) => {
      const payload: {
        gameId: string;
        from: string;
        to: string;
        promotion?: 'q' | 'r' | 'b' | 'n';
      } = { gameId, from, to };
      if (promotion) {
        payload.promotion = promotion;
      }
      socket
        .timeout(15_000)
        .emit('game:move', payload, (err: Error | null, r: unknown) => {
          if (err) {
            reject(err);
            return;
          }
          const ack = r as {
            ok?: boolean;
            game?: GameResponse;
            error?: string;
          };
          if (ack?.ok && ack.game) {
            resolve(ack.game);
            return;
          }
          reject(new Error(ack?.error ?? 'Move rejected'));
        });
    });
  }

  offerDraw(gameId: string): Promise<void> {
    return this.drawAck(gameId, 'draw:offer');
  }

  acceptDraw(gameId: string): Promise<GameResponse> {
    const socket = this.sockets.connect();
    return new Promise((resolve, reject) => {
      socket
        .timeout(15_000)
        .emit('draw:accept', { gameId }, (err: Error | null, r: unknown) => {
          if (err) {
            reject(err);
            return;
          }
          const ack = r as {
            ok?: boolean;
            game?: GameResponse;
            error?: string;
          };
          if (ack?.ok && ack.game) {
            resolve(ack.game);
            return;
          }
          reject(new Error(ack?.error ?? 'Could not accept draw'));
        });
    });
  }

  declineDraw(gameId: string): Promise<void> {
    return this.drawAck(gameId, 'draw:decline');
  }

  private drawAck(
    gameId: string,
    event: 'draw:offer' | 'draw:decline'
  ): Promise<void> {
    const socket = this.sockets.connect();
    return new Promise((resolve, reject) => {
      socket
        .timeout(15_000)
        .emit(event, { gameId }, (err: Error | null, r: unknown) => {
          if (err) {
            reject(err);
            return;
          }
          const ack = r as { ok?: boolean; error?: string };
          if (ack?.ok) {
            resolve();
            return;
          }
          reject(new Error(ack?.error ?? 'Draw request failed'));
        });
    });
  }
}
