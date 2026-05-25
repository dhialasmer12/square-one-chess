import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Chess } from 'chess.js';
import { AuthService } from '../../services/auth.service';
import { SocketService } from '../../services/socket.service';
import { ChessBoardComponent } from '../../components/chess-board/chess-board.component';
import type { UserProfile } from '../../models';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, ChessBoardComponent],
  template: `
    <div
      class="min-h-screen bg-gradient-to-b from-zinc-950 via-board-frame to-zinc-950 text-zinc-100"
    >
      <header
        class="border-b border-zinc-800/80 bg-zinc-900/50 backdrop-blur-sm"
      >
        <div
          class="mx-auto flex max-w-5xl items-center justify-between px-4 py-4"
        >
          <div class="flex items-center gap-3">
            <span class="text-2xl text-board-light">♔</span>
            <span class="font-display text-lg font-semibold text-board-light"
              >Square One</span
            >
          </div>
          <nav class="flex flex-wrap items-center gap-4 text-sm">
            <a
              routerLink="/home"
              class="text-zinc-400 hover:text-zinc-200"
              >Home</a
            >
            <a
              routerLink="/lobby"
              class="font-medium text-amber-200/90 hover:text-amber-100"
              >Lobby</a
            >
            <a
              routerLink="/tournaments"
              class="text-zinc-400 hover:text-zinc-200"
              >Tournaments</a
            >
            <a
              routerLink="/dashboard"
              class="text-zinc-400 hover:text-zinc-200"
              >Analytics</a
            >
            <a
              routerLink="/leaderboard"
              class="text-zinc-400 hover:text-zinc-200"
              >Leaderboard</a
            >
            <a
              routerLink="/profile"
              class="text-zinc-400 hover:text-zinc-200"
              >Profile</a
            >
            <a
              routerLink="/history"
              class="text-zinc-400 hover:text-zinc-200"
              >History</a
            >
            <button
              type="button"
              (click)="logout()"
              class="rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-1.5 text-zinc-200 hover:bg-zinc-700"
            >
              Log out
            </button>
          </nav>
        </div>
      </header>

      <main class="mx-auto max-w-5xl px-4 py-10">
        @if (loadError) {
          <p class="text-red-400">{{ loadError }}</p>
        } @else if (user) {
          <div class="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <section
              class="rounded-2xl border border-board-light/20 bg-zinc-900/60 p-6 shadow-xl ring-1 ring-white/5"
            >
              <div class="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h1 class="font-display text-2xl text-board-light">
                    Welcome, {{ user.displayName }}
                  </h1>
                  <p class="mt-1 text-sm text-zinc-500">{{ user.email }}</p>
                  <p class="mt-3 text-sm text-zinc-400">
                    Today’s focus: <span class="text-amber-200/90">Daily Puzzle</span>
                  </p>
                </div>
                <a
                  routerLink="/lobby"
                  class="inline-flex rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-amber-400"
                  >Play now</a
                >
              </div>

              <div class="mt-6 grid gap-6 lg:grid-cols-[340px_1fr]">
                <div class="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
                  <app-chess-board
                    [fen]="puzzleFen"
                    [orientation]="puzzleOrientation"
                    [disabled]="puzzleLocked"
                    [loading]="puzzleLoading"
                    [showLegalMoves]="true"
                    [showLastMove]="true"
                    (moveEvent)="onPuzzleMove($event)"
                  />
                </div>

                <div class="min-w-0">
                  <div class="flex items-center justify-between gap-3">
                    <div class="min-w-0">
                      <p class="text-xs uppercase tracking-wide text-zinc-500">
                        Daily puzzle
                      </p>
                      <p class="truncate text-lg font-semibold text-zinc-100">
                        {{ puzzleTitle || 'Loading…' }}
                      </p>
                      @if (puzzleThemes?.length) {
                        <p class="mt-1 text-xs text-zinc-500">
                          {{ puzzleThemes.join(' · ') }}
                        </p>
                      }
                    </div>
                    <button
                      type="button"
                      (click)="loadDailyPuzzle()"
                      class="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-800"
                    >
                      Refresh
                    </button>
                  </div>

                  <div class="mt-4 space-y-3">
                    @if (puzzleStatus) {
                      <div
                        class="rounded-xl border border-zinc-800 bg-zinc-950/40 px-4 py-3 text-sm"
                        [ngClass]="{
                          'text-emerald-200 border-emerald-500/20 bg-emerald-500/5': puzzleStatusKind === 'success',
                          'text-amber-200 border-amber-500/20 bg-amber-500/5': puzzleStatusKind === 'info',
                          'text-red-200 border-red-500/20 bg-red-500/5': puzzleStatusKind === 'error'
                        }"
                      >
                        {{ puzzleStatus }}
                      </div>
                    }

                    <div class="flex flex-wrap gap-2">
                      <button
                        type="button"
                        (click)="hint()"
                        class="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-800"
                      >
                        Hint
                      </button>
                      <button
                        type="button"
                        (click)="resetPuzzle()"
                        class="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-800"
                      >
                        Reset
                      </button>
                      <button
                        type="button"
                        (click)="nextRandomPuzzle()"
                        class="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-800"
                      >
                        Next puzzle
                      </button>
                    </div>

                    <p class="text-xs text-zinc-500">
                      Drag a piece to play your move. The puzzle will auto-play the opponent’s reply.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <aside class="space-y-6">
              <div
                class="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 ring-1 ring-white/5"
              >
                <p class="text-xs uppercase tracking-wide text-zinc-500">
                  Quick actions
                </p>
                <div class="mt-3 flex flex-col gap-2">
                  <a
                    routerLink="/leaderboard"
                    class="rounded-xl border border-zinc-800 bg-zinc-950/30 px-4 py-3 text-sm text-zinc-200 hover:bg-zinc-800/40"
                    >Leaderboard</a
                  >
                  <a
                    routerLink="/profile"
                    class="rounded-xl border border-zinc-800 bg-zinc-950/30 px-4 py-3 text-sm text-zinc-200 hover:bg-zinc-800/40"
                    >Profile & stats</a
                  >
                  <a
                    routerLink="/tournaments"
                    class="rounded-xl border border-zinc-800 bg-zinc-950/30 px-4 py-3 text-sm text-zinc-200 hover:bg-zinc-800/40"
                    >Tournaments</a
                  >
                </div>
              </div>

              <div
                class="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 ring-1 ring-white/5"
              >
                <p class="text-xs uppercase tracking-wide text-zinc-500">
                  About puzzles
                </p>
                <p class="mt-2 text-sm text-zinc-400">
                  These puzzles come from a curated in-app puzzle bank. Next step is importing a larger dataset (e.g. Lichess puzzle DB) for “real” volume.
                </p>
              </div>
            </aside>
          </div>
        } @else {
          <p class="text-zinc-400">Loading profile…</p>
        }
      </main>
    </div>
  `,
})
export class HomeComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly sockets = inject(SocketService);
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.API_URL;

  user: UserProfile | null = null;
  loadError = '';

  // Puzzle state
  puzzleLoading = true;
  puzzleLocked = true;
  puzzleId = '';
  puzzleTitle = '';
  puzzleThemes: string[] = [];
  puzzleStartFen = '';
  puzzleFen = '';
  puzzleOrientation: 'white' | 'black' = 'white';
  private puzzleLine: string[] = [];
  private puzzleIndex = 0;
  puzzleStatus = '';
  puzzleStatusKind: 'info' | 'success' | 'error' = 'info';

  ngOnInit(): void {
    this.auth.me().subscribe({
      next: (u) => {
        this.user = u;
        this.loadDailyPuzzle();
      },
      error: () => {
        this.loadError = 'Could not load your profile.';
      },
    });
  }

  private setStatus(
    kind: 'info' | 'success' | 'error',
    message: string
  ): void {
    this.puzzleStatusKind = kind;
    this.puzzleStatus = message;
  }

  loadDailyPuzzle(): void {
    this.puzzleLoading = true;
    this.puzzleLocked = true;
    this.setStatus('info', 'Loading puzzle…');
    this.http
      .get<{ puzzle: any }>(`${this.baseUrl}/api/puzzles/daily`)
      .subscribe({
        next: (r) => this.applyPuzzle(r.puzzle),
        error: () => {
          this.puzzleLoading = false;
          this.puzzleLocked = true;
          this.setStatus('error', 'Could not load daily puzzle.');
        },
      });
  }

  nextRandomPuzzle(): void {
    this.puzzleLoading = true;
    this.puzzleLocked = true;
    this.setStatus('info', 'Loading puzzle…');
    this.http
      .get<{ puzzle: any }>(`${this.baseUrl}/api/puzzles/random`)
      .subscribe({
        next: (r) => this.applyPuzzle(r.puzzle),
        error: () => {
          this.puzzleLoading = false;
          this.puzzleLocked = true;
          this.setStatus('error', 'Could not load a puzzle.');
        },
      });
  }

  private applyPuzzle(p: {
    id: string;
    title: string;
    themes: string[];
    fen: string;
    lineUci: string[];
  }): void {
    this.puzzleId = p.id;
    this.puzzleTitle = p.title;
    this.puzzleThemes = Array.isArray(p.themes) ? p.themes : [];
    this.puzzleStartFen = p.fen;
    this.puzzleFen = p.fen;
    this.puzzleLine = Array.isArray(p.lineUci) ? p.lineUci : [];
    this.puzzleIndex = 0;
    this.puzzleLoading = false;
    this.puzzleLocked = false;
    const g = new Chess(p.fen);
    this.puzzleOrientation = g.turn() === 'w' ? 'white' : 'black';
    this.setStatus('info', 'Your move.');
  }

  resetPuzzle(): void {
    if (!this.puzzleStartFen) return;
    this.puzzleFen = this.puzzleStartFen;
    this.puzzleIndex = 0;
    this.puzzleLocked = false;
    this.setStatus('info', 'Reset. Your move.');
  }

  hint(): void {
    const uci = this.puzzleLine[this.puzzleIndex];
    if (!uci) {
      this.setStatus('info', 'No hint available.');
      return;
    }
    const from = uci.slice(0, 2);
    const to = uci.slice(2, 4);
    const promo = uci.length > 4 ? `=${uci.slice(4, 5).toUpperCase()}` : '';
    this.setStatus('info', `Hint: try ${from} → ${to}${promo}.`);
  }

  private applyUci(fen: string, uci: string): string {
    const from = uci.slice(0, 2);
    const to = uci.slice(2, 4);
    const promotion = uci.length > 4 ? uci.slice(4, 5) : undefined;
    const g = new Chess(fen);
    const res = g.move({ from: from as any, to: to as any, promotion: promotion as any });
    if (!res) {
      throw new Error('illegal move');
    }
    return g.fen();
  }

  onPuzzleMove(ev: { from: string; to: string; promotion?: string }): void {
    if (this.puzzleLocked || this.puzzleLoading) return;
    const expected = this.puzzleLine[this.puzzleIndex];
    if (!expected) {
      this.puzzleLocked = true;
      this.setStatus('success', 'Puzzle complete.');
      return;
    }

    const played =
      `${ev.from}${ev.to}` + (ev.promotion ? String(ev.promotion)[0] : '');

    // Keep a copy to revert if wrong.
    const before = this.puzzleFen;

    if (played !== expected) {
      // Revert position
      this.puzzleFen = before;
      this.setStatus('error', 'Not the best move. Try again.');
      return;
    }

    // Apply the move (already legal). Update the FEN using chess.js to keep consistent.
    try {
      this.puzzleFen = this.applyUci(this.puzzleFen, played);
    } catch {
      this.puzzleFen = before;
      this.setStatus('error', 'Move could not be applied.');
      return;
    }

    this.puzzleIndex++;

    // If the puzzle line includes the opponent reply moves, auto-play them until it's the player's turn again.
    // This keeps the hint/expected move aligned with "your move" only.
    try {
      const playerTurn = new Chess(this.puzzleStartFen).turn(); // 'w' or 'b'
      while (this.puzzleIndex < this.puzzleLine.length) {
        const g = new Chess(this.puzzleFen);
        if (g.turn() === playerTurn) break;
        const reply = this.puzzleLine[this.puzzleIndex];
        if (!reply) break;
        this.puzzleFen = this.applyUci(this.puzzleFen, reply);
        this.puzzleIndex++;
      }
    } catch {
      // If auto-play fails, lock to avoid desync.
      this.puzzleLocked = true;
      this.setStatus('error', 'Puzzle line is invalid.');
      return;
    }

    // Auto-play one opponent reply if present.
    const reply = this.puzzleLine[this.puzzleIndex];
    if (reply) {
      try {
        const g2 = new Chess(this.puzzleFen);
        const from = reply.slice(0, 2);
        const to = reply.slice(2, 4);
        const prom = reply.length > 4 ? reply[4] : undefined;
        g2.move({ from: from as any, to: to as any, promotion: prom as any });
        this.puzzleFen = g2.fen();
      } catch {
        // If reply fails, stop puzzle progression gracefully.
        this.setStatus('info', 'Good move. (Auto-reply unavailable.)');
        return;
      }
      this.puzzleIndex++;
    }

    if (this.puzzleIndex >= this.puzzleLine.length) {
      this.puzzleLocked = true;
      this.setStatus('success', 'Solved. Great job!');
      return;
    }

    this.setStatus('success', 'Good move. Your turn.');
  }

  logout(): void {
    this.sockets.disconnect();
    this.auth.logout();
  }
}
