import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import type { LeaderboardEntry } from '../../models';

@Component({
  selector: 'app-leaderboard-preview',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="rounded-2xl border border-zinc-800 bg-zinc-900/60 ring-1 ring-white/5 backdrop-blur-sm"
    >
      <div
        class="border-b border-zinc-800 px-4 py-3 font-display text-sm font-semibold text-board-light"
      >
        Leaderboard
        <span class="font-sans text-xs font-normal text-zinc-500">Top 10</span>
      </div>
      @if (loading) {
        <ul class="divide-y divide-zinc-800/80 p-2">
          @for (i of skeletonRows; track i) {
            <li class="flex animate-pulse gap-3 px-2 py-2.5">
              <div class="h-8 w-8 rounded-full bg-zinc-800"></div>
              <div class="flex-1 space-y-1">
                <div class="h-3 w-24 rounded bg-zinc-800"></div>
                <div class="h-2 w-16 rounded bg-zinc-800/80"></div>
              </div>
            </li>
          }
        </ul>
      } @else {
        <ol class="max-h-[min(60vh,380px)] divide-y divide-zinc-800/80 overflow-y-auto">
          @for (e of entries; track e.userId) {
            <li
              class="flex items-center gap-3 px-4 py-2.5 text-sm transition hover:bg-zinc-800/50"
            >
              <span
                class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                [ngClass]="
                  e.rank <= 3
                    ? 'bg-amber-500/20 text-amber-200'
                    : 'bg-zinc-800 text-zinc-400'
                "
                >{{ e.rank }}</span
              >
              <div class="min-w-0 flex-1">
                <p class="truncate font-medium text-zinc-100">{{ e.username }}</p>
                <p class="text-xs text-zinc-500">
                  {{ e.gamesWon }}W · {{ e.gamesPlayed }} played
                </p>
              </div>
              <span class="shrink-0 font-mono text-amber-200/90">{{ e.elo }}</span>
            </li>
          } @empty {
            <li class="px-4 py-6 text-center text-sm text-zinc-500">
              No leaderboard data.
            </li>
          }
        </ol>
      }
    </div>
  `,
})
export class LeaderboardPreviewComponent {
  @Input() entries: LeaderboardEntry[] = [];
  @Input() loading = false;

  readonly skeletonRows = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
}
