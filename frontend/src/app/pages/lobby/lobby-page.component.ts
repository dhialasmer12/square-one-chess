import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Subscription, firstValueFrom } from 'rxjs';
import { LeaderboardPreviewComponent } from '../../components/leaderboard-preview/leaderboard-preview.component';
import { QueueStatusComponent } from '../../components/queue-status/queue-status.component';
import { RecentGamesComponent } from '../../components/recent-games/recent-games.component';
import { UserProfileCardComponent } from '../../components/user-profile-card/user-profile-card.component';
import {
  LOBBY_TIME_OPTIONS,
  labelForTimeControl,
  type LobbyTimePreset,
} from '../../constants/time-controls';
import type {
  LeaderboardEntry,
  MatchFoundPayload,
  RankPayload,
  RecentGameRow,
  UserStatsPayload,
} from '../../models';
import { AuthService } from '../../services/auth.service';
import { LobbyDataService } from '../../services/lobby-data.service';
import { MatchmakingService } from '../../services/matchmaking.service';
import { QueueService } from '../../services/queue.service';
import { SocketService } from '../../services/socket.service';
import { GamePlayService } from '../../services/game-play.service';

@Component({
  selector: 'app-lobby-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    UserProfileCardComponent,
    QueueStatusComponent,
    RecentGamesComponent,
    LeaderboardPreviewComponent,
  ],
  templateUrl: './lobby-page.component.html',
  styleUrl: './lobby-page.component.scss',
})
export class LobbyPageComponent implements OnInit, OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly sockets = inject(SocketService);
  private readonly queue = inject(QueueService);
  private readonly matchmaking = inject(MatchmakingService);
  private readonly lobbyData = inject(LobbyDataService);
  private readonly gamePlay = inject(GamePlayService);

  userId = '';

  stats: UserStatsPayload | null = null;
  rank: RankPayload | null = null;
  recentGames: RecentGameRow[] = [];
  leaderboard: LeaderboardEntry[] = [];

  profileLoading = true;
  recentLoading = true;
  leaderboardLoading = true;

  loadError = '';

  inQueue = false;
  joiningQueue = false;
  leavingQueue = false;
  queueSize = 0;
  queuePosition: number | null = null;

  pendingMatch: MatchFoundPayload | null = null;

  readonly timeOptions = LOBBY_TIME_OPTIONS;
  selectedTimeControl: LobbyTimePreset = '10+0';
  botDifficulty: 'easy' | 'medium' | 'hard' = 'medium';

  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private matchSub: Subscription | null = null;

  /** Derived label for queue-status; kept as getter for template. */
  get estimatedWaitLabel(): string {
    return LobbyPageComponent.formatEstimate(this.queueSize, this.queuePosition);
  }

  get playDisabled(): boolean {
    return (
      this.joiningQueue ||
      this.inQueue ||
      !this.userId ||
      !!this.pendingMatch
    );
  }

  get queueClockSummary(): string {
    return labelForTimeControl(this.selectedTimeControl);
  }

  selectTimeControl(id: LobbyTimePreset): void {
    if (this.inQueue || this.joiningQueue || this.pendingMatch) {
      return;
    }
    this.selectedTimeControl = id;
  }

  ngOnInit(): void {
    this.sockets.connect();
    this.matchmaking.startListening();
    this.matchSub = this.matchmaking.matchFound$.subscribe((p) =>
      this.onMatchFound(p)
    );

    this.auth.me().subscribe({
      next: (u) => {
        this.userId = u.id;
        this.loadLobbyData();
        void this.refreshPublicQueueSize();
      },
      error: () => {
        this.loadError = 'Could not load your account.';
        this.profileLoading = false;
      },
    });
  }

  ngOnDestroy(): void {
    this.clearPoll();
    this.matchSub?.unsubscribe();
    this.matchmaking.stopListening();
    if (this.inQueue) {
      void this.queue.leaveQueue().catch(() => {});
    }
  }

  logout(): void {
    void this.queue.leaveQueue().catch(() => {});
    this.sockets.disconnect();
    this.auth.logout();
  }

  async onPlayNow(): Promise<void> {
    if (this.playDisabled || !this.userId) {
      return;
    }
    this.joiningQueue = true;
    try {
      const r = await this.queue.joinQueue(this.selectedTimeControl);
      this.inQueue = true;
      this.queueSize = r.queueSize;
      this.queuePosition = r.position;
      this.startPolling();
    } catch (e) {
      this.loadError =
        e instanceof Error ? e.message : 'Could not join the queue.';
    } finally {
      this.joiningQueue = false;
    }
  }

  async onPlayBot(): Promise<void> {
    if (this.joiningQueue || this.inQueue || !this.userId || !!this.pendingMatch) {
      return;
    }
    this.joiningQueue = true;
    try {
      const g = await firstValueFrom(
        this.gamePlay.createBotGame(
          this.selectedTimeControl,
          'white',
          this.botDifficulty
        )
      );
      void this.router.navigate(['/game', g.id]);
    } catch {
      this.loadError = 'Could not start a bot game.';
    } finally {
      this.joiningQueue = false;
    }
  }

  async onCancelQueue(): Promise<void> {
    if (!this.inQueue || this.leavingQueue) {
      return;
    }
    this.leavingQueue = true;
    this.clearPoll();
    try {
      await this.queue.leaveQueue();
    } catch {
      /* still reset UI */
    } finally {
      this.inQueue = false;
      this.queuePosition = null;
      this.leavingQueue = false;
      await this.refreshPublicQueueSize();
    }
  }

  enterMatchedGame(): void {
    const id = this.pendingMatch?.gameId;
    this.pendingMatch = null;
    if (id) {
      void this.router.navigate(['/game', id]);
    }
  }

  private onMatchFound(p: MatchFoundPayload): void {
    this.clearPoll();
    this.inQueue = false;
    this.queuePosition = null;
    this.pendingMatch = p;
    void this.refreshPublicQueueSize();
  }

  private loadLobbyData(): void {
    this.profileLoading = true;
    this.recentLoading = true;
    this.leaderboardLoading = true;
    this.lobbyData.loadLobbyData(this.userId).subscribe({
      next: ({ stats, rank, recent, leaderboard }) => {
        this.stats = stats;
        this.rank = rank;
        this.recentGames = recent.games ?? [];
        this.leaderboard = leaderboard.leaderboard ?? [];
        this.profileLoading = false;
        this.recentLoading = false;
        this.leaderboardLoading = false;
      },
      error: () => {
        this.loadError = 'Some lobby data failed to load. Try refreshing.';
        this.profileLoading = false;
        this.recentLoading = false;
        this.leaderboardLoading = false;
      },
    });
  }

  private startPolling(): void {
    this.clearPoll();
    this.pollTimer = setInterval(() => {
      void this.queue.getQueueStatus().then((s) => {
        this.queueSize = s.queueSize;
        if (s.inQueue) {
          this.queuePosition = s.position;
        }
      });
    }, 2500);
  }

  private clearPoll(): void {
    if (this.pollTimer != null) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  private async refreshPublicQueueSize(): Promise<void> {
    try {
      const s = await this.queue.getQueueStatus();
      this.queueSize = s.queueSize;
      if (!this.inQueue) {
        this.queuePosition = null;
      }
    } catch {
      /* ignore */
    }
  }

  private static formatEstimate(
    queueSize: number,
    position: number | null
  ): string {
    if (queueSize < 2) {
      return 'Waiting for another player — often under 1 min';
    }
    const depth = Math.max(0, queueSize - 2);
    const low = 15 + depth * 5;
    const high = low + 40;
    let base = `${low}–${high} seconds`;
    if (position != null && position > 1) {
      base += ` (you are #${position} in line)`;
    }
    return base;
  }
}
