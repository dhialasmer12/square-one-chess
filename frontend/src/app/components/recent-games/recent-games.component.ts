import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { RecentGameRow } from '../../models';

@Component({
  selector: 'app-recent-games',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div
      class="rounded-2xl border border-zinc-800 bg-zinc-900/60 ring-1 ring-white/5 backdrop-blur-sm"
    >
      <div
        class="border-b border-zinc-800 px-4 py-3 font-display text-sm font-semibold text-board-light"
      >
        Recent games
      </div>
      @if (loading) {
        <div class="space-y-2 p-4">
          @for (i of [1, 2, 3]; track i) {
            <div class="h-10 animate-pulse rounded bg-zinc-800/80"></div>
          }
        </div>
      } @else if (!games.length) {
        <p class="p-4 text-sm text-zinc-500">No games yet. Play your first!</p>
      } @else {
        <div class="overflow-x-auto">
          <table class="w-full min-w-[320px] text-left text-sm">
            <thead>
              <tr class="border-b border-zinc-800 text-xs text-zinc-500">
                <th class="px-4 py-2 font-medium">Opponent</th>
                <th class="px-4 py-2 font-medium">Color</th>
                <th class="px-4 py-2 font-medium">Result</th>
                <th class="hidden px-4 py-2 font-medium sm:table-cell">Date</th>
              </tr>
            </thead>
            <tbody>
              @for (g of games; track g.gameId) {
                <tr
                  class="border-b border-zinc-800/60 transition hover:bg-zinc-800/40"
                >
                  <td class="px-4 py-2.5 font-medium text-zinc-200">
                    <a
                      [routerLink]="
                        g.result === 'ongoing'
                          ? ['/game', g.gameId]
                          : ['/replay', g.gameId]
                      "
                      class="text-amber-200/90 hover:underline"
                      >{{ g.opponentUsername }}</a
                    >
                  </td>
                  <td class="px-4 py-2.5 capitalize text-zinc-400">
                    {{ g.playedAs }}
                  </td>
                  <td class="px-4 py-2.5">
                    <span [ngClass]="resultClass(g.result)">{{
                      resultLabel(g.result)
                    }}</span>
                  </td>
                  <td class="hidden px-4 py-2.5 text-zinc-500 sm:table-cell">
                    {{ g.endedAt || g.startedAt | date: 'mediumDate' }}
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
})
export class RecentGamesComponent {
  @Input() games: RecentGameRow[] = [];
  @Input() loading = false;

  resultLabel(r: RecentGameRow['result']): string {
    switch (r) {
      case 'win':
        return 'Win';
      case 'loss':
        return 'Loss';
      case 'draw':
        return 'Draw';
      default:
        return 'Live';
    }
  }

  resultClass(r: RecentGameRow['result']): string {
    switch (r) {
      case 'win':
        return 'rounded-md bg-emerald-500/15 px-2 py-0.5 text-emerald-300';
      case 'loss':
        return 'rounded-md bg-red-500/15 px-2 py-0.5 text-red-300';
      case 'draw':
        return 'rounded-md bg-zinc-600/40 px-2 py-0.5 text-zinc-300';
      default:
        return 'rounded-md bg-amber-500/15 px-2 py-0.5 text-amber-200';
    }
  }
}
