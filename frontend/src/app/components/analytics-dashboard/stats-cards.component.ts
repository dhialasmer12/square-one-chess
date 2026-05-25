import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import type { PlatformStatsDto, PlayerKpis } from '../../models';

@Component({
  selector: 'app-stats-cards',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      @if (platformKpis) {
        <div class="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
          <p class="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Total users
          </p>
          <p class="mt-1 font-display text-2xl text-amber-200">
            {{ platformKpis.totalUsers | number }}
          </p>
        </div>
        <div class="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
          <p class="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Active games today
          </p>
          <p class="mt-1 font-display text-2xl text-emerald-300">
            {{ platformKpis.activeGamesToday | number }}
          </p>
        </div>
        <div class="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 sm:col-span-2 lg:col-span-1">
          <p class="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Games played (finished)
          </p>
          <p class="mt-1 font-display text-2xl text-board-light">
            {{ platformKpis.totalGamesPlayed | number }}
          </p>
        </div>
      }
      @if (playerKpis) {
        <div class="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
          <p class="text-xs font-medium uppercase tracking-wide text-zinc-500">
            {{ playerKpis.username }} · peak ELO
          </p>
          <p class="mt-1 font-display text-2xl text-amber-200">
            {{ playerKpis.elo | number }}
          </p>
          <p class="mt-2 text-xs text-zinc-500">
            Bullet {{ playerKpis.eloBullet }} · Blitz {{ playerKpis.eloBlitz }} ·
            Rapid {{ playerKpis.eloRapid }}
          </p>
        </div>
        <div class="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
          <p class="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Games played
          </p>
          <p class="mt-1 font-display text-2xl text-board-light">
            {{ playerKpis.gamesPlayed | number }}
          </p>
        </div>
        <div class="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
          <p class="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Wins / losses
          </p>
          <p class="mt-1 font-display text-2xl text-zinc-200">
            <span class="text-emerald-400">{{ playerKpis.gamesWon }}</span>
            /
            <span class="text-red-400">{{ playerKpis.gamesLost }}</span>
          </p>
        </div>
      }
    </div>
  `,
})
export class StatsCardsComponent {
  @Input() platformKpis: PlatformStatsDto | null = null;
  @Input() playerKpis: PlayerKpis | null = null;
}
