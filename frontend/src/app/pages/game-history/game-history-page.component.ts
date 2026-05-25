import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import type {
  GameHistoryPageRow,
  GameHistoryResultFilter,
  GameHistorySort,
} from '../../models/game-history.model';
import { AuthService } from '../../services/auth.service';
import { GameHistoryService } from '../../services/game-history.service';

@Component({
  selector: 'app-game-history-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './game-history-page.component.html',
  styleUrl: './game-history-page.component.scss',
})
export class GameHistoryPageComponent implements OnInit, OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly historyApi = inject(GameHistoryService);

  private opponentDebounce: ReturnType<typeof setTimeout> | null = null;

  userId = '';
  games: GameHistoryPageRow[] = [];
  page = 1;
  pageSize = 20;
  total = 0;
  loading = true;
  loadError = '';

  resultFilter: GameHistoryResultFilter = 'all';
  sort: GameHistorySort = 'date_desc';
  opponentInput = '';
  dateFrom = '';
  dateTo = '';

  ngOnInit(): void {
    this.auth.me().subscribe({
      next: (u) => {
        this.userId = u.id;
        this.reload();
      },
      error: () => {
        this.loadError = 'You must be signed in.';
        this.loading = false;
      },
    });
  }

  ngOnDestroy(): void {
    if (this.opponentDebounce) {
      clearTimeout(this.opponentDebounce);
    }
  }

  onOpponentInput(value: string): void {
    this.opponentInput = value;
    this.page = 1;
    if (this.opponentDebounce) {
      clearTimeout(this.opponentDebounce);
    }
    this.opponentDebounce = setTimeout(() => {
      this.opponentDebounce = null;
      this.reload();
    }, 320);
  }

  reload(): void {
    if (!this.userId) {
      return;
    }
    this.loading = true;
    this.loadError = '';
    this.historyApi
      .getHistoryPage(this.userId, {
        page: this.page,
        pageSize: this.pageSize,
        result: this.resultFilter,
        opponent: this.opponentInput.trim() || undefined,
        dateFrom: this.dateFrom || undefined,
        dateTo: this.dateTo || undefined,
        sort: this.sort,
      })
      .subscribe({
        next: (res) => {
          this.games = res.games;
          this.page = res.page;
          this.total = res.total;
          this.loading = false;
        },
        error: () => {
          this.loadError = 'Could not load game history.';
          this.loading = false;
        },
      });
  }

  onFilterChange(): void {
    this.page = 1;
    this.reload();
  }

  totalPages(): number {
    return Math.max(1, Math.ceil(this.total / this.pageSize));
  }

  prevPage(): void {
    if (this.page > 1) {
      this.page--;
      this.reload();
    }
  }

  nextPage(): void {
    if (this.page < this.totalPages()) {
      this.page++;
      this.reload();
    }
  }

  formatWhen(iso: string): string {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  }

  formatDuration(sec: number): string {
    if (sec < 60) {
      return `${sec}s`;
    }
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return s ? `${m}m ${s}s` : `${m}m`;
  }

  resultClass(r: string): string {
    switch (r) {
      case 'win':
        return 'text-emerald-400';
      case 'loss':
        return 'text-red-400';
      default:
        return 'text-zinc-400';
    }
  }
}
