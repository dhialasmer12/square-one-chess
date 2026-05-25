import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ReplayModeComponent } from '../../components/replay-mode/replay-mode.component';
import type { BoardOrientation } from '../../components/chess-board/chess-board.models';
import { GamePlayService } from '../../services/game-play.service';

@Component({
  selector: 'app-replay-page',
  standalone: true,
  imports: [CommonModule, RouterLink, ReplayModeComponent],
  template: `
    <div
      class="min-h-screen bg-gradient-to-b from-zinc-950 via-board-frame to-zinc-950 text-zinc-100"
    >
      <header
        class="border-b border-zinc-800/80 bg-zinc-900/50 backdrop-blur-sm"
      >
        <div
          class="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4"
        >
          <div class="flex items-center gap-3">
            <a
              routerLink="/history"
              class="text-sm text-zinc-400 hover:text-zinc-200"
              >← Game history</a
            >
            <span class="text-board-light">♔</span>
            <h1 class="font-display text-lg font-semibold text-board-light">
              Replay
            </h1>
          </div>
          @if (gameId) {
            <a
              [routerLink]="['/review', gameId]"
              class="rounded-lg px-3 py-1.5 text-sm text-amber-200/90 hover:bg-zinc-800 hover:text-amber-100"
              >Review</a
            >
          }
          <a
            routerLink="/lobby"
            class="rounded-lg px-3 py-1.5 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
            >Lobby</a
          >
        </div>
      </header>

      <main class="mx-auto max-w-6xl px-4 py-8">
        @if (!gameId) {
          <p class="text-red-400">Missing game id.</p>
        } @else {
          <app-replay-mode
            [gameId]="gameId"
            [orientation]="orientation"
            [showEvalBar]="true"
            heading="Game replay"
          />
        }
      </main>
    </div>
  `,
})
export class ReplayPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly gamePlay = inject(GamePlayService);

  gameId = '';
  orientation: BoardOrientation = 'white';

  ngOnInit(): void {
    this.gameId = this.route.snapshot.paramMap.get('gameId') ?? '';
    if (!this.gameId) {
      return;
    }
    this.gamePlay.getSession(this.gameId).subscribe({
      next: (s) => {
        this.orientation = s.myColor;
      },
      error: () => {
        this.orientation = 'white';
      },
    });
  }
}
