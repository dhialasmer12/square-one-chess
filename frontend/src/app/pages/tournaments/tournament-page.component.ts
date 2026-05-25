import { CommonModule } from '@angular/common';
import {
  Component,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import type { Socket } from 'socket.io-client';
import type {
  BracketResponse,
  TournamentListItem,
  TournamentMatchDto,
  TournamentMessageDto,
  TournamentMatchReadyPayload,
  TournamentNewMatchPayload,
} from '../../models';
import { AuthService } from '../../services/auth.service';
import { SocketService } from '../../services/socket.service';
import { TournamentApiService } from '../../services/tournament-api.service';

@Component({
  selector: 'app-tournament-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './tournament-page.component.html',
  styleUrl: './tournament-page.component.scss',
})
export class TournamentPageComponent implements OnInit, OnDestroy {
  private readonly api = inject(TournamentApiService);
  private readonly auth = inject(AuthService);
  private readonly sockets = inject(SocketService);
  private readonly router = inject(Router);

  userId = '';
  tournaments: TournamentListItem[] = [];
  selected: TournamentListItem | null = null;
  bracket: BracketResponse | null = null;
  matches: TournamentMatchDto[] = [];
  myMatches: TournamentMatchDto[] = [];

  chatMessages: TournamentMessageDto[] = [];
  chatInput = '';
  chatSending = false;
  /** True when user is not registered (GET chat returns 403). */
  chatLocked = true;

  listLoading = true;
  detailLoading = false;
  listError = '';
  actionError = '';
  joinBusy: Record<string, boolean> = {};

  createOpen = false;
  createName = '';
  createType: 'single_elimination' | 'round_robin' = 'single_elimination';
  createMax = 8;
  createBusy = false;

  alertGameId: string | null = null;
  alertTournamentId: string | null = null;

  private socket: Socket | null = null;
  private subscribedTournamentId: string | null = null;
  /** Guards async chat callback if user switches tournament. */
  private activeDetailId: string | null = null;

  ngOnInit(): void {
    this.auth.me().subscribe({
      next: (u) => {
        this.userId = u.id;
        this.loadList();
      },
      error: () => {
        this.listError = 'Could not load profile.';
        this.listLoading = false;
      },
    });
  }

  ngOnDestroy(): void {
    this.teardownSocket();
  }

  loadList(): void {
    this.listLoading = true;
    this.listError = '';
    this.api.listActive().subscribe({
      next: (r) => {
        this.tournaments = r.tournaments;
        this.listLoading = false;
        if (this.selected) {
          const still = r.tournaments.find((t) => t.id === this.selected!.id);
          this.selected = still ?? null;
          if (this.selected) {
            this.loadDetail(this.selected.id);
          } else {
            this.bracket = null;
            this.matches = [];
            this.myMatches = [];
            this.teardownSocket();
          }
        }
      },
      error: () => {
        this.listError = 'Could not load tournaments.';
        this.listLoading = false;
      },
    });
  }

  selectTournament(t: TournamentListItem): void {
    this.selected = t;
    this.actionError = '';
    this.loadDetail(t.id);
  }

  loadDetail(tournamentId: string): void {
    this.activeDetailId = tournamentId;
    this.detailLoading = true;
    this.api.getBracket(tournamentId).subscribe({
      next: (b) => {
        this.bracket = b;
        this.selected = b.tournament;
        this.detailLoading = false;
      },
      error: () => {
        this.detailLoading = false;
        this.actionError = 'Could not load bracket.';
      },
    });
    this.api.getMatches(tournamentId).subscribe({
      next: (r) => {
        this.matches = r.matches;
        this.myMatches = r.matches.filter(
          (m) =>
            m.whitePlayerId === this.userId || m.blackPlayerId === this.userId
        );
      },
      error: () => {},
    });
    this.api.getChat(tournamentId).subscribe({
      next: (r) => {
        if (this.activeDetailId !== tournamentId) {
          return;
        }
        this.chatMessages = r.messages;
        this.chatLocked = false;
        this.wireTournamentChannels(tournamentId);
      },
      error: () => {
        if (this.activeDetailId !== tournamentId) {
          return;
        }
        this.chatMessages = [];
        this.chatLocked = true;
        this.wireTournamentChannels(tournamentId);
      },
    });
  }

  private wireTournamentChannels(tournamentId: string): void {
    if (this.activeDetailId !== tournamentId) {
      return;
    }
    this.teardownSocket();
    this.subscribedTournamentId = tournamentId;
    this.socket = this.sockets.connect();

    this.socket.on(
      'tournament:match-ready',
      (p: TournamentMatchReadyPayload) => {
        if (p.tournamentId !== tournamentId) {
          return;
        }
        if (
          p.whitePlayerId === this.userId ||
          p.blackPlayerId === this.userId
        ) {
          this.alertGameId = p.gameId;
          this.alertTournamentId = p.tournamentId;
        }
        this.refreshDetailQuiet(tournamentId);
      }
    );

    this.socket.on('tournament:new-match', (p: TournamentNewMatchPayload) => {
      if (p.tournamentId !== tournamentId) {
        return;
      }
      this.refreshDetailQuiet(tournamentId);
    });

    this.socket.on('tournament:chat', (msg: TournamentMessageDto) => {
      if (msg.tournamentId !== tournamentId) {
        return;
      }
      this.chatMessages = [...this.chatMessages, msg];
    });

    if (!this.chatLocked) {
      this.socket.emit(
        'tournament:subscribe',
        { tournamentId },
        (r: unknown) => {
          const ack = r as { ok?: boolean; error?: string };
          if (!ack?.ok) {
            this.actionError =
              ack?.error ?? 'Could not join tournament channel.';
          }
        }
      );
    }
  }

  private refreshDetailQuiet(tournamentId: string): void {
    this.api.getBracket(tournamentId).subscribe({
      next: (b) => {
        this.bracket = b;
        this.selected = b.tournament;
      },
      error: () => {},
    });
    this.api.getMatches(tournamentId).subscribe({
      next: (r) => {
        this.matches = r.matches;
        this.myMatches = r.matches.filter(
          (m) =>
            m.whitePlayerId === this.userId || m.blackPlayerId === this.userId
        );
      },
      error: () => {},
    });
  }

  private teardownSocket(): void {
    if (this.socket) {
      this.socket.off('tournament:match-ready');
      this.socket.off('tournament:new-match');
      this.socket.off('tournament:chat');
    }
    this.subscribedTournamentId = null;
  }

  joinTournament(t: TournamentListItem, ev: Event): void {
    ev.stopPropagation();
    this.joinBusy[t.id] = true;
    this.actionError = '';
    this.api.join(t.id).subscribe({
      next: (row) => {
        this.joinBusy[t.id] = false;
        const idx = this.tournaments.findIndex((x) => x.id === row.id);
        if (idx >= 0) {
          this.tournaments[idx] = row;
        } else {
          this.tournaments.push(row);
        }
        this.selectTournament(row);
        this.loadList();
      },
      error: (e: unknown) => {
        this.joinBusy[t.id] = false;
        const body = e as { error?: { error?: string } | string };
        const msg =
          typeof body?.error === 'object' && body.error?.error
            ? body.error.error
            : typeof body?.error === 'string'
              ? body.error
              : 'Could not join.';
        this.actionError = msg;
      },
    });
  }

  openCreate(): void {
    this.createOpen = true;
    this.createName = '';
    this.createType = 'single_elimination';
    this.createMax = 8;
    this.actionError = '';
  }

  closeCreate(): void {
    this.createOpen = false;
  }

  submitCreate(): void {
    if (!this.createName.trim()) {
      return;
    }
    this.createBusy = true;
    this.api
      .create({
        name: this.createName.trim(),
        type: this.createType,
        maxPlayers: this.createMax,
      })
      .subscribe({
        next: (row) => {
          this.createBusy = false;
          this.createOpen = false;
          this.tournaments = [row, ...this.tournaments.filter((x) => x.id !== row.id)];
          this.selectTournament(row);
          this.loadList();
        },
        error: () => {
          this.createBusy = false;
          this.actionError = 'Could not create tournament.';
        },
      });
  }

  setCreateType(t: 'single_elimination' | 'round_robin'): void {
    this.createType = t;
    if (t === 'single_elimination') {
      if (![4, 8, 16, 32].includes(this.createMax)) {
        this.createMax = 8;
      }
    } else {
      if (this.createMax % 2 !== 0 || this.createMax < 2) {
        this.createMax = 4;
      }
    }
  }

  singleElimSizes(): number[] {
    return [4, 8, 16, 32];
  }

  roundRobinSizes(): number[] {
    return [2, 4, 6, 8, 10, 12, 14, 16];
  }

  sendChat(): void {
    const tid = this.selected?.id;
    const text = this.chatInput.trim();
    if (!tid || !text || this.chatSending) {
      return;
    }
    this.chatSending = true;
    this.api.postChat(tid, text).subscribe({
      next: (msg) => {
        this.chatInput = '';
        this.chatSending = false;
        if (!this.socket?.connected) {
          this.chatMessages = [...this.chatMessages, msg];
        }
      },
      error: () => {
        this.chatSending = false;
      },
    });
  }

  goToGame(gameId: string | null): void {
    if (!gameId) {
      return;
    }
    void this.router.navigate(['/game', gameId]);
  }

  dismissAlert(): void {
    this.alertGameId = null;
    this.alertTournamentId = null;
  }

  statusLabel(s: string): string {
    switch (s) {
      case 'waiting':
        return 'Waiting';
      case 'ongoing':
        return 'Live';
      case 'finished':
        return 'Finished';
      default:
        return s;
    }
  }

  matchStatusLabel(m: TournamentMatchDto): string {
    if (m.status === 'done') {
      return 'Done';
    }
    if (m.gameId) {
      return 'Live';
    }
    return 'Pending';
  }
}
