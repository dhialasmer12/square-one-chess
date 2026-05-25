import { Injectable, NgZone, inject } from '@angular/core';
import { Subject } from 'rxjs';
import type { Socket } from 'socket.io-client';
import type { ChatMessageDto } from '../models';
import { SocketService } from './socket.service';

export type ChatHistoryPayload = {
  roomId: string;
  messages: ChatMessageDto[];
};

@Injectable({ providedIn: 'root' })
export class SocialChatService {
  private readonly sockets = inject(SocketService);
  private readonly zone = inject(NgZone);

  readonly history$ = new Subject<ChatHistoryPayload>();
  readonly globalMessage$ = new Subject<ChatMessageDto>();
  readonly privateMessage$ = new Subject<ChatMessageDto>();
  readonly gameMessage$ = new Subject<ChatMessageDto>();
  readonly presence$ = new Subject<{ userId: string; online: boolean }>();
  readonly onlineSnapshot$ = new Subject<string[]>();

  private wired = false;

  /** Attach listeners once on shared socket. */
  ensureChatListeners(): Socket {
    const s = this.sockets.connect();
    if (this.wired) {
      return s;
    }
    this.wired = true;
    s.on('chat:history', (p: ChatHistoryPayload) => {
      this.zone.run(() => this.history$.next(p));
    });
    s.on('chat:global', (m: ChatMessageDto) => {
      this.zone.run(() => this.globalMessage$.next(m));
    });
    s.on('chat:private', (m: ChatMessageDto) => {
      this.zone.run(() => this.privateMessage$.next(m));
    });
    s.on('chat:game', (m: ChatMessageDto) => {
      this.zone.run(() => this.gameMessage$.next(m));
    });
    s.on(
      'friends:presence',
      (p: { userId: string; online: boolean }) => {
        this.zone.run(() => this.presence$.next(p));
      }
    );
    s.on(
      'friends:online-snapshot',
      (p: { onlineFriendIds: string[] }) => {
        this.zone.run(() => this.onlineSnapshot$.next(p.onlineFriendIds));
      }
    );
    return s;
  }

  sendGlobal(
    content: string,
    cb?: (err: Error | null, ok?: boolean) => void
  ): void {
    const s = this.ensureChatListeners();
    s.timeout(10_000).emit(
      'chat:global',
      { content },
      (err: Error | null, r?: unknown) => {
        if (err) {
          cb?.(err);
          return;
        }
        const ack = r as { ok?: boolean; error?: string };
        if (!ack?.ok) {
          cb?.(new Error(ack?.error ?? 'Send failed'));
          return;
        }
        cb?.(null, true);
      }
    );
  }

  sendPrivate(
    toUserId: string,
    content: string,
    cb?: (err: Error | null, ok?: boolean) => void
  ): void {
    const s = this.ensureChatListeners();
    s.timeout(10_000).emit(
      'chat:private',
      { toUserId, content },
      (err: Error | null, r?: unknown) => {
        if (err) {
          cb?.(err);
          return;
        }
        const ack = r as { ok?: boolean; error?: string };
        if (!ack?.ok) {
          cb?.(new Error(ack?.error ?? 'Send failed'));
          return;
        }
        cb?.(null, true);
      }
    );
  }

  sendGame(
    gameId: string,
    content: string,
    cb?: (err: Error | null, ok?: boolean) => void
  ): void {
    const s = this.ensureChatListeners();
    s.timeout(10_000).emit(
      'chat:game',
      { gameId, content },
      (err: Error | null, r?: unknown) => {
        if (err) {
          cb?.(err);
          return;
        }
        const ack = r as { ok?: boolean; error?: string };
        if (!ack?.ok) {
          cb?.(new Error(ack?.error ?? 'Send failed'));
          return;
        }
        cb?.(null, true);
      }
    );
  }

  joinGameRoom(gameId: string): void {
    const s = this.ensureChatListeners();
    s.emit('chat:join-game', { gameId }, () => {});
  }

  joinDm(withUserId: string): void {
    const s = this.ensureChatListeners();
    s.emit('chat:join-dm', { withUserId }, () => {});
  }
}
