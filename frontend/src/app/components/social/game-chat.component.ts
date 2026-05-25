import { CommonModule } from '@angular/common';
import {
  Component,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import type { ChatMessageDto } from '../../models';
import { AuthService } from '../../services/auth.service';
import { SocialChatService } from '../../services/social-chat.service';

@Component({
  selector: 'app-game-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './game-chat.component.html',
  styleUrl: './game-chat.component.scss',
})
export class GameChatComponent implements OnInit, OnChanges, OnDestroy {
  private readonly chat = inject(SocialChatService);
  private readonly auth = inject(AuthService);

  @Input() gameId = '';
  @Input() disabled = false;

  messages: ChatMessageDto[] = [];
  draft = '';
  sendError = '';
  myUserId = '';

  private gameSub?: Subscription;
  private histSub?: Subscription;

  ngOnInit(): void {
    this.auth.me().subscribe({
      next: (u) => (this.myUserId = u.id),
      error: () => {},
    });
    this.chat.ensureChatListeners();
    this.gameSub = this.chat.gameMessage$.subscribe((m) => {
      if (this.gameId && m.roomId === `game:${this.gameId}`) {
        this.messages = [...this.messages, m].slice(-50);
      }
    });
    this.histSub = this.chat.history$.subscribe((p) => {
      if (this.gameId && p.roomId === `game:${this.gameId}`) {
        this.messages = [...p.messages].slice(-50);
      }
    });
    if (this.gameId && !this.disabled) {
      this.chat.joinGameRoom(this.gameId);
    }
  }

  ngOnChanges(c: SimpleChanges): void {
    const g = c['gameId'];
    if (!g || g.firstChange || this.disabled || !this.gameId) {
      return;
    }
    this.messages = [];
    this.chat.joinGameRoom(this.gameId);
  }

  ngOnDestroy(): void {
    this.gameSub?.unsubscribe();
    this.histSub?.unsubscribe();
  }

  send(): void {
    const t = this.draft.trim();
    if (!t || !this.gameId || this.disabled) {
      return;
    }
    this.sendError = '';
    this.chat.sendGame(this.gameId, t, (err) => {
      if (err) {
        this.sendError = err.message;
        return;
      }
      this.draft = '';
    });
  }
}
