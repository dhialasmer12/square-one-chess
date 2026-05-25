import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import type { RankPayload, UserStatsPayload } from '../../models';

@Component({
  selector: 'app-user-profile-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 shadow-lg ring-1 ring-white/5 backdrop-blur-sm"
    >
      @if (loading) {
        <div class="animate-pulse space-y-3">
          <div class="h-6 w-40 rounded bg-zinc-800"></div>
          <div class="h-4 w-full rounded bg-zinc-800/80"></div>
          <div class="h-16 rounded-lg bg-zinc-800/60"></div>
        </div>
      } @else if (stats) {
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p class="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Profile
            </p>
            <h2 class="font-display text-xl font-semibold text-board-light">
              {{ stats.username }}
            </h2>
            <p class="text-sm text-zinc-400">
              Peak <span class="text-amber-200/90">{{ stats.elo }}</span>
            </p>
            <p class="text-xs text-zinc-500">
              Bu {{ stats.eloBullet }} · Bz {{ stats.eloBlitz }} · Rp
              {{ stats.eloRapid }}
            </p>
          </div>
          @if (rank) {
            <div
              class="rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-right"
            >
              <p class="text-[10px] uppercase tracking-wider text-zinc-500">
                Rank
              </p>
              <p class="text-lg font-semibold text-amber-100">
                #{{ rank.rank }}
                <span class="text-xs font-normal text-zinc-500"
                  >/ {{ rank.totalRankedPlayers }}</span
                >
              </p>
            </div>
          }
        </div>
        <dl
          class="mt-4 grid grid-cols-2 gap-3 border-t border-zinc-800/80 pt-4 text-sm sm:grid-cols-4"
        >
          <div>
            <dt class="text-zinc-500">Win rate</dt>
            <dd class="font-medium text-zinc-100">
              {{
                stats.winRatePercent != null
                  ? stats.winRatePercent + '%'
                  : '—'
              }}
            </dd>
          </div>
          <div>
            <dt class="text-zinc-500">Played</dt>
            <dd class="font-medium text-zinc-100">{{ stats.gamesPlayed }}</dd>
          </div>
          <div>
            <dt class="text-zinc-500">W / L / D</dt>
            <dd class="font-medium text-zinc-100">
              {{ stats.gamesWon }} / {{ stats.gamesLost }} /
              {{ stats.gamesDrawn }}
            </dd>
          </div>
          <div>
            <dt class="text-zinc-500">Streak</dt>
            <dd class="font-medium text-zinc-100">{{ stats.winStreak }}</dd>
          </div>
        </dl>
      } @else {
        <p class="text-sm text-zinc-500">Could not load profile stats.</p>
      }
    </div>
  `,
})
export class UserProfileCardComponent {
  @Input() stats: UserStatsPayload | null = null;
  @Input() rank: RankPayload | null = null;
  @Input() loading = false;
}
