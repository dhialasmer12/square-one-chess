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
  puzzleFen = '';
  orientation: 'white' | 'black' = 'white';
  boardLocked = false;

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
    this.loadDaily();
  }

  themeLabel(theme: string): string {
    return theme.replace(/_/g, ' ');
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
    this.puzzles.getRandomPuzzle(cap).subscribe({
      next: (r) => this.applyPuzzle(r.puzzle),
      error: () => this.failLoad('Could not load a puzzle.'),
    });
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
    this.puzzleFen = p.fen;
    this.attempts = 0;
    this.loading = false;
    this.boardLocked = false;
    this.clearHighlights();
    try {
      const g = new Chess(p.fen);
      this.orientation = g.turn() === 'w' ? 'white' : 'black';
    } catch {
      this.orientation = 'white';
    }
  }

  onBoardMove(ev: { from: string; to: string; promotion?: string }): void {
    if (!this.puzzle || this.boardLocked) {
      return;
    }
    let g: Chess;
    try {
      g = new Chess(this.puzzle.fen);
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
    this.puzzles.checkMove(this.puzzle.id, played.san).subscribe({
      next: (r) => {
        this.attempts = r.attempts;
        this.puzzle = r.puzzle;
        if (r.correct || r.alreadySolved) {
          this.flash('ok', r.alreadySolved ? 'Already solved — nice!' : 'Correct!');
          this.boardLocked = true;
          this.loadStats();
        } else {
          this.flash('bad', 'Not quite — try again.');
          this.puzzleFen = this.puzzle!.fen;
          this.boardLocked = false;
          this.clearHighlights();
          queueMicrotask(() =>
            this.chessBoard?.setPosition(this.puzzle!.fen)
          );
        }
      },
      error: () => {
        this.flash('bad', 'Could not verify move.');
        this.puzzleFen = this.puzzle!.fen;
        this.boardLocked = false;
        queueMicrotask(() =>
          this.chessBoard?.setPosition(this.puzzle!.fen)
        );
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
    }, 1600);
  }

  showHint(): void {
    if (!this.puzzle || this.hintBusy) {
      return;
    }
    this.hintBusy = true;
    this.puzzles.getHint(this.puzzle.id).subscribe({
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
    this.ai.predictMove(this.puzzle.fen, 1).subscribe({
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
