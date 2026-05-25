import { CommonModule } from '@angular/common';
import {
  Component,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router } from '@angular/router';
import { filter, firstValueFrom, Subscription } from 'rxjs';
import type { ChatMessageDto, FriendRequestDto } from '../../models';
import { AuthService } from '../../services/auth.service';
import { FriendApiService } from '../../services/friend-api.service';
import { SocialChatService } from '../../services/social-chat.service';
import { FriendsListComponent } from './friends-list.component';

const ROOM_GLOBAL = 'global';

function dmRoomId(me: string, other: string): string {
  return me < other ? `dm:${me}:${other}` : `dm:${other}:${me}`;
}

@Component({
  selector: 'app-chat-sidebar',
  standalone: true,
  imports: [CommonModule, FormsModule, FriendsListComponent],
  templateUrl: './chat-sidebar.component.html',
  styleUrl: './chat-sidebar.component.scss',
})
export class ChatSidebarComponent implements OnInit, OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly friendsApi = inject(FriendApiService);
  private readonly chat = inject(SocialChatService);

  private routerSub?: Subscription;
  private chatSubs?: Subscription;

  authed = false;
  expanded = false;
  myUserId = '';
  myUsername = '';

  friends: FriendRequestDto[] = [];
  incoming: FriendRequestDto[] = [];
  outgoing: FriendRequestDto[] = [];
  onlineFriendIds = new Set<string>();

  globalMessages: ChatMessageDto[] = [];
  dmMessages: ChatMessageDto[] = [];
  selectedDmUserId: string | null = null;

  globalDraft = '';
  dmDraft = '';
  requestUsername = '';
  requestBusy = false;
  requestError = '';
  sendGlobalError = '';
  sendDmError = '';
  loadFriendsError = '';

  ngOnInit(): void {
    this.routerSub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => this.refreshAuth());
    this.refreshAuth();
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
    this.chatSubs?.unsubscribe();
  }

  private refreshAuth(): void {
    const next = this.auth.isAuthenticated();
    if (next && this.authed && this.chatSubs) {
      return;
    }
    if (!next && !this.authed && !this.chatSubs) {
      return;
    }
    this.authed = next;
    if (!this.authed) {
      this.chatSubs?.unsubscribe();
      this.chatSubs = undefined;
      this.clearSocialUiState();
      return;
    }
    void this.bootstrapAuthedSession();
  }

  private clearSocialUiState(): void {
    this.friends = [];
    this.incoming = [];
    this.outgoing = [];
    this.onlineFriendIds = new Set();
    this.globalMessages = [];
    this.dmMessages = [];
    this.selectedDmUserId = null;
    this.myUserId = '';
    this.myUsername = '';
    this.expanded = false;
  }

  private async bootstrapAuthedSession(): Promise<void> {
    this.chat.ensureChatListeners();
    if (!this.chatSubs) {
      this.chatSubs = new Subscription();
      this.attachChatStreams(this.chatSubs);
    }
    try {
      const me = await firstValueFrom(this.auth.me());
      this.myUserId = me.id;
      this.myUsername = me.username;
    } catch {
      this.myUserId = '';
      this.myUsername = '';
    }
    await this.loadFriends();
  }

  private attachChatStreams(s: Subscription): void {
    s.add(
      this.chat.history$.subscribe((p) => {
        if (p.roomId === ROOM_GLOBAL) {
          this.globalMessages = [...p.messages].slice(-50);
          return;
        }
        if (
          this.selectedDmUserId &&
          this.myUserId &&
          p.roomId === dmRoomId(this.myUserId, this.selectedDmUserId)
        ) {
          this.dmMessages = [...p.messages].slice(-50);
        }
      })
    );
    s.add(
      this.chat.globalMessage$.subscribe((m) => {
        if (m.roomId === ROOM_GLOBAL) {
          this.globalMessages = [...this.globalMessages, m].slice(-50);
        }
      })
    );
    s.add(
      this.chat.privateMessage$.subscribe((m) => {
        if (
          this.selectedDmUserId &&
          this.myUserId &&
          m.roomId === dmRoomId(this.myUserId, this.selectedDmUserId)
        ) {
          this.dmMessages = [...this.dmMessages, m].slice(-50);
        }
      })
    );
    s.add(
      this.chat.onlineSnapshot$.subscribe((ids) => {
        this.onlineFriendIds = new Set(ids);
      })
    );
    s.add(
      this.chat.presence$.subscribe((p) => {
        if (p.online) {
          this.onlineFriendIds.add(p.userId);
        } else {
          this.onlineFriendIds.delete(p.userId);
        }
        this.onlineFriendIds = new Set(this.onlineFriendIds);
      })
    );
  }

  toggleExpanded(): void {
    this.expanded = !this.expanded;
  }

  private async loadFriends(): Promise<void> {
    this.loadFriendsError = '';
    try {
      const res = await firstValueFrom(this.friendsApi.list());
      this.friends = res.friends ?? [];
      this.incoming = res.incoming ?? [];
      this.outgoing = res.outgoing ?? [];
      this.onlineFriendIds = new Set(res.onlineFriendIds ?? []);
    } catch {
      this.loadFriendsError = 'Could not load friends.';
    }
  }

  sendFriendRequest(): void {
    const u = this.requestUsername.trim();
    if (!u || this.requestBusy) {
      return;
    }
    this.requestBusy = true;
    this.requestError = '';
    this.friendsApi.request({ friendUsername: u }).subscribe({
      next: () => {
        this.requestUsername = '';
        this.requestBusy = false;
        void this.loadFriends();
      },
      error: (e: { error?: { message?: string } }) => {
        this.requestBusy = false;
        this.requestError =
          e?.error?.message ?? 'Could not send friend request.';
      },
    });
  }

  onAccept(id: string): void {
    this.friendsApi.respond(id, 'accept').subscribe({
      next: () => void this.loadFriends(),
      error: () => {},
    });
  }

  onReject(id: string): void {
    this.friendsApi.respond(id, 'reject').subscribe({
      next: () => void this.loadFriends(),
      error: () => {},
    });
  }

  pickFriend(userId: string): void {
    this.selectedDmUserId = userId;
    this.dmMessages = [];
    this.sendDmError = '';
    this.chat.joinDm(userId);
  }

  backToGlobal(): void {
    this.selectedDmUserId = null;
    this.dmMessages = [];
    this.dmDraft = '';
    this.sendDmError = '';
  }

  selectedDmLabel(): string {
    if (!this.selectedDmUserId) {
      return '';
    }
    const f = this.friends.find(
      (x) =>
        (x.userId === this.myUserId ? x.friendId : x.userId) ===
        this.selectedDmUserId
    );
    if (!f) {
      return 'Friend';
    }
    return f.userId === this.myUserId ? f.friendUsername : f.userUsername;
  }

  sendGlobal(): void {
    const t = this.globalDraft.trim();
    if (!t) {
      return;
    }
    this.sendGlobalError = '';
    this.chat.sendGlobal(t, (err) => {
      if (err) {
        this.sendGlobalError = err.message;
        return;
      }
      this.globalDraft = '';
    });
  }

  sendDm(): void {
    const t = this.dmDraft.trim();
    const to = this.selectedDmUserId;
    if (!t || !to) {
      return;
    }
    this.sendDmError = '';
    this.chat.sendPrivate(to, t, (err) => {
      if (err) {
        this.sendDmError = err.message;
        return;
      }
      this.dmDraft = '';
    });
  }
}
