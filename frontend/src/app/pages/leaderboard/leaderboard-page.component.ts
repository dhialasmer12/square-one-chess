import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import type { LeaderboardEntry } from '../../models';
import type { LeaderboardPeriod } from '../../models/profile.model';
import { AuthService } from '../../services/auth.service';
import {
  LeaderboardService,
  type LeaderboardRatingFormat,
} from '../../services/leaderboard.service';

const PAGE_SIZE = 20;

@Component({
  selector: 'app-leaderboard-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './leaderboard-page.component.html',
  styleUrl: './leaderboard-page.component.scss',
})
export class LeaderboardPageComponent implements OnInit {
  private readonly leaderboardApi = inject(LeaderboardService);
  private readonly auth = inject(AuthService);

  currentUserId = '';

  period: LeaderboardPeriod = 'all';
  ratingFormat: LeaderboardRatingFormat = 'combined';
  search = '';
  private readonly search$ = new Subject<string>();

  rows: LeaderboardEntry[] = [];
  loading = false;
  loadError = '';

  page = 1;
  readonly pageSize = PAGE_SIZE;

  ngOnInit(): void {
    this.auth.me().subscribe({
      next: (u) => (this.currentUserId = u.id),
      error: () => {},
    });

    this.search$
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(() => {
        this.page = 1;
        this.refresh();
      });

    this.refresh();
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.rows.length / PAGE_SIZE));
  }

  get pagedRows(): LeaderboardEntry[] {
    const start = (this.page - 1) * PAGE_SIZE;
    return this.rows.slice(start, start + PAGE_SIZE);
  }

  onSearchInput(value: string): void {
    this.search = value;
    this.search$.next(value.trim());
  }

  onPeriodChange(p: LeaderboardPeriod): void {
    this.period = p;
    this.page = 1;
    this.refresh();
  }

  onRatingFormatChange(f: LeaderboardRatingFormat): void {
    this.ratingFormat = f;
    this.page = 1;
    this.refresh();
  }

  setPage(p: number): void {
    if (p >= 1 && p <= this.totalPages) {
      this.page = p;
    }
  }

  refresh(): void {
    this.loading = true;
    this.loadError = '';
    this.leaderboardApi
      .getLeaderboard({
        limit: 100,
        period: this.period,
        search: this.search.trim() || undefined,
        format: this.ratingFormat,
      })
      .subscribe({
        next: (rows) => {
          this.rows = rows;
          this.loading = false;
          if (this.page > this.totalPages) {
            this.page = this.totalPages;
          }
        },
        error: () => {
          this.loadError = 'Could not load leaderboard.';
          this.loading = false;
        },
      });
  }

  winRateDisplay(row: LeaderboardEntry): string {
    if (row.winRatePercent == null) {
      return '—';
    }
    return `${row.winRatePercent}%`;
  }
}
