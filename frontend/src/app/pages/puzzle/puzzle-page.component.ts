import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Chess } from 'chess.js';
import { Chart, registerables } from 'chart.js';
import { ChessBoardComponent } from '../../components/chess-board/chess-board.component';
import {
  PuzzleService,
  type PuzzlePublic,
  type PuzzleStatsResponse,
} from '../../services/puzzle.service';
import { AiSuggestionService } from '../../services/ai-suggestion.service';

Chart.register(...registerables);

@Component({
  selector: 'app-puzzle-page',
  standalone: true,
  imports: [CommonModule, RouterLink, ChessBoardComponent],
  templateUrl: './puzzle-page.component.html',
  styleUrl: './puzzle-page.component.scss',
})
export class PuzzlePageComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly puzzles = inject(PuzzleService);
  private readonly ai = inject(AiSuggestionService);

  @ViewChild('chessBoard') chessBoard?: ChessBoardComponent;
  @ViewChild('trendCanvas') trendCanvas?: ElementRef<HTMLCanvasElement>;

  loading = true;
  loadError = '';

  puzzle: PuzzlePublic | null = null;
  /** Live board FEN (advances through multi-ply). */
  puzzleFen = '';
  /** Immutable start FEN for resets. */
  startFen = '';
  lineIndex = 0;
  orientation: 'white' | 'black' = 'white';
  sideToMove: 'white' | 'black' = 'white';
  boardLocked = false;

  themes: { theme: string; count: number }[] = [];
  selectedTheme: string | null = null;

  stats: PuzzleStatsResponse['stats'] | null = null;

  attempts = 0;
  feedback: 'idle' | 'ok' | 'bad' = 'idle';
  feedbackText = '';

  hintBusy = false;
  aiBusy = false;

  private trendChart: Chart | null = null;

  ngAfterViewInit(): void {
    this.refreshChart();
  }

  ngOnDestroy(): void {
    this.trendChart?.destroy();
    this.trendChart = null;
  }

  ngOnInit(): void {
    this.loadStats();
    this.loadThemes();
    this.loadDaily();
  }

  themeLabel(theme: string): string {
    return theme.replace(/_/g, ' ');
  }

  get toMoveLabel(): string {
    return this.sideToMove === 'white' ? 'White to move' : 'Black to move';
  }

  get plyProgressLabel(): string {
    if (!this.puzzle) {
      return '';
    }
    if (this.puzzle.plies <= 1) {
      return 'Find the best move';
    }
    const playerSteps = Math.ceil(this.puzzle.plies / 2);
    const currentStep = Math.floor(this.lineIndex / 2) + 1;
    return `Your move ${Math.min(currentStep, playerSteps)} / ${playerSteps}`;
  }

  loadThemes(): void {
    this.puzzles.getThemes().subscribe({
      next: (r) => {
        this.themes = r.themes ?? [];
      },
      error: () => {
        /* non-fatal */
      },
    });
  }

  loadStats(): void {
    this.puzzles.getStats().subscribe({
      next: (r) => {
        this.stats = r.stats;
        setTimeout(() => this.refreshChart(), 0);
      },
      error: () => {
        /* non-fatal */
      },
    });
  }

  loadDaily(): void {
    this.selectedTheme = null;
    this.startLoad();
    this.puzzles.getDailyPuzzle().subscribe({
      next: (r) => this.applyPuzzle(r.puzzle),
      error: () => this.failLoad('Could not load daily puzzle.'),
    });
  }

  newRandom(): void {
    const cap = this.stats?.chessElo
      ? Math.min(2000, this.stats.chessElo + 150)
      : 1600;
    this.startLoad();
    this.puzzles.getRandomPuzzle(cap, this.selectedTheme).subscribe({
      next: (r) => this.applyPuzzle(r.puzzle),
      error: () => this.failLoad('Could not load a puzzle.'),
    });
  }

  selectTheme(theme: string | null): void {
    this.selectedTheme = theme;
    this.newRandom();
  }

  private startLoad(): void {
    this.loading = true;
    this.loadError = '';
    this.feedback = 'idle';
    this.feedbackText = '';
    this.boardLocked = true;
  }

  private failLoad(msg: string): void {
    this.loading = false;
    this.loadError = msg;
    this.boardLocked = true;
  }

  private applyPuzzle(p: PuzzlePublic): void {
    this.puzzle = p;
    this.startFen = p.fen;
    this.puzzleFen = p.fen;
    this.lineIndex = 0;
    this.attempts = 0;
    this.loading = false;
    this.boardLocked = false;
    this.clearHighlights();
    try {
      const g = new Chess(p.fen);
      this.orientation = g.turn() === 'w' ? 'white' : 'black';
      this.sideToMove = this.orientation;
    } catch {
      this.orientation = 'white';
      this.sideToMove = 'white';
    }
  }

  onBoardMove(ev: { from: string; to: string; promotion?: string }): void {
    if (!this.puzzle || this.boardLocked) {
      return;
    }
    let g: Chess;
    try {
      g = new Chess(this.puzzleFen);
    } catch {
      return;
    }
    const played = g.move({
      from: ev.from as any,
      to: ev.to as any,
      promotion: ev.promotion as any,
    });
    if (!played) {
      return;
    }
    this.boardLocked = true;
    // Optimistic show of the played move while we wait for the server.
    this.puzzleFen = g.fen();
    this.puzzles.checkMove(this.puzzle.id, played.san, this.lineIndex).subscribe({
      next: (r) => {
        this.attempts = r.attempts;
        this.puzzle = r.puzzle;
        if (r.alreadySolved) {
          this.flash('ok', 'Already solved — nice!');
          this.boardLocked = true;
          this.loadStats();
          return;
        }
        if (!r.correct) {
          this.flash('bad', 'Not quite — try again.');
          this.lineIndex = 0;
          this.puzzleFen = this.startFen;
          this.boardLocked = false;
          this.clearHighlights();
          queueMicrotask(() => this.chessBoard?.setPosition(this.startFen));
          return;
        }

        this.lineIndex = r.lineIndex;
        this.puzzleFen = r.fen;
        queueMicrotask(() => this.chessBoard?.setPosition(r.fen));

        if (r.solved) {
          this.flash('ok', 'Solved!');
          this.boardLocked = true;
          this.loadStats();
        } else {
          const reply =
            r.opponentSans.length > 0
              ? `Good — ${r.opponentSans.join(', ')}. Your move.`
              : 'Good — keep going.';
          this.flash('ok', reply);
          this.boardLocked = false;
          this.clearHighlights();
        }
      },
      error: () => {
        this.flash('bad', 'Could not verify move.');
        this.puzzleFen = this.startFen;
        this.lineIndex = 0;
        this.boardLocked = false;
        queueMicrotask(() => this.chessBoard?.setPosition(this.startFen));
      },
    });
  }

  private flash(kind: 'ok' | 'bad', msg: string): void {
    this.feedback = kind;
    this.feedbackText = msg;
    window.setTimeout(() => {
      if (this.feedback === kind) {
        this.feedback = 'idle';
        this.feedbackText = '';
      }
    }, 1800);
  }

  showHint(): void {
    if (!this.puzzle || this.hintBusy || this.boardLocked) {
      return;
    }
    this.hintBusy = true;
    this.puzzles.getHint(this.puzzle.id, this.lineIndex).subscribe({
      next: (h) => {
        this.hintBusy = false;
        if (h.fromSquare && this.chessBoard) {
          this.chessBoard.clearCustomHighlights();
          this.chessBoard.highlightSquare(
            h.fromSquare,
            'rgba(129, 182, 76, 0.65)'
          );
        }
      },
      error: () => {
        this.hintBusy = false;
      },
    });
  }

  /** Optional: engine-style idea when the player is stuck (does not submit a solve). */
  aiNudge(): void {
    if (!this.puzzle || this.aiBusy || this.boardLocked) {
      return;
    }
    this.aiBusy = true;
    this.ai.predictMove(this.puzzleFen, 1).subscribe({
      next: (r) => {
        this.aiBusy = false;
        const s = r.suggestions[0];
        if (s && this.chessBoard) {
          this.chessBoard.clearCustomHighlights();
          this.chessBoard.highlightSquare(
            s.from,
            'rgba(56, 189, 248, 0.55)'
          );
          this.flash('ok', `Idea: ${s.san}`);
        }
      },
      error: () => {
        this.aiBusy = false;
      },
    });
  }

  private clearHighlights(): void {
    this.chessBoard?.clearCustomHighlights();
  }

  private refreshChart(): void {
    if (!this.trendCanvas?.nativeElement || !this.stats) {
      return;
    }
    const labels = this.stats.solvedByDay.map((d) => d.day.slice(5));
    const data = this.stats.solvedByDay.map((d) => d.count);
    if (!this.trendChart) {
      this.trendChart = new Chart(this.trendCanvas.nativeElement, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Solved / day',
              data,
              borderColor: 'rgba(129, 182, 76, 0.9)',
              backgroundColor: 'rgba(129, 182, 76, 0.15)',
              fill: true,
              tension: 0.35,
            },
          ],
        },
        options: {
          responsive: true,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: '#a1a1aa' }, grid: { color: '#27272a' } },
            y: {
              ticks: { color: '#a1a1aa', stepSize: 1 },
              grid: { color: '#27272a' },
              beginAtZero: true,
            },
          },
        },
      });
    } else {
      this.trendChart.data.labels = labels;
      const ds = this.trendChart.data.datasets[0];
      if (ds) {
        ds.data = data;
      }
      this.trendChart.update();
    }
  }
}
