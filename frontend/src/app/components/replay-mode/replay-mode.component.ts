import { CommonModule } from '@angular/common';
import {
  Component,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  inject,
} from '@angular/core';
import { Chess } from 'chess.js';
import { firstValueFrom } from 'rxjs';
import { ChessBoardComponent } from '../chess-board/chess-board.component';
import type { BoardOrientation } from '../chess-board/chess-board.models';
import { ReplayService } from '../../services/replay.service';

const PIECE_VAL: Record<string, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
};

@Component({
  selector: 'app-replay-mode',
  standalone: true,
  imports: [CommonModule, ChessBoardComponent],
  templateUrl: './replay-mode.component.html',
  styleUrl: './replay-mode.component.scss',
})
export class ReplayModeComponent implements OnChanges, OnDestroy {
  private readonly replayApi = inject(ReplayService);

  /** Load moves from API when set. */
  @Input() gameId: string | null = null;
  /** If set, takes precedence over `gameId` until cleared. */
  @Input() pgn: string | null = null;
  /** If set, highest precedence. */
  @Input() sanMoves: string[] | null = null;

  @Input() orientation: BoardOrientation = 'white';
  @Input() showEvalBar = true;
  @Input() heading = 'Replay';

  moves: string[] = [];
  currentPly = 0;
  fen = new Chess().fen();
  evalWhitePercent = 50;

  loading = false;
  loadError = '';

  autoPlaying = false;
  /** 0.5 | 1 | 2 */
  speedMult = 1;

  private work = new Chess();
  private autoTimer: ReturnType<typeof setInterval> | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['gameId'] || changes['pgn'] || changes['sanMoves']) {
      void this.loadMoves();
    }
  }

  ngOnDestroy(): void {
    this.stopAuto();
  }

  get moveRows(): {
    num: number;
    white: string;
    black: string;
    wi: number;
    bi: number;
  }[] {
    const rows: {
      num: number;
      white: string;
      black: string;
      wi: number;
      bi: number;
    }[] = [];
    for (let i = 0; i < this.moves.length; i += 2) {
      rows.push({
        num: rows.length + 1,
        white: this.moves[i] ?? '',
        black: this.moves[i + 1] ?? '',
        wi: i,
        bi: i + 1,
      });
    }
    return rows;
  }

  async loadMoves(): Promise<void> {
    this.stopAuto();
    this.loading = true;
    this.loadError = '';
    try {
      if (this.sanMoves && this.sanMoves.length > 0) {
        this.moves = [...this.sanMoves];
      } else if (this.pgn?.trim()) {
        this.moves = this.replayApi.parsePGN(this.pgn);
      } else if (this.gameId) {
        const raw = await firstValueFrom(
          this.replayApi.getGameMovesVerbose(this.gameId)
        );
        this.moves = this.replayApi.sanListFromVerbose(raw);
      } else {
        this.moves = [];
      }
      this.currentPly = 0;
      this.applyPly();
    } catch {
      this.loadError = 'Could not load moves for this game.';
      this.moves = [];
      this.currentPly = 0;
      this.applyPly();
    } finally {
      this.loading = false;
    }
  }

  first(): void {
    this.goToPly(0);
  }

  prev(): void {
    this.goToPly(this.currentPly - 1);
  }

  next(): void {
    this.goToPly(this.currentPly + 1);
  }

  last(): void {
    this.goToPly(this.moves.length);
  }

  goToPly(ply: number): void {
    const next = Math.max(0, Math.min(this.moves.length, ply));
    if (next !== this.currentPly) {
      this.stopAuto();
    }
    this.currentPly = next;
    this.applyPly();
  }

  jumpToHalfMoveIndex(idx: number): void {
    if (idx < 0 || idx >= this.moves.length) {
      return;
    }
    this.goToPly(idx + 1);
  }

  setSpeed(mult: number): void {
    this.speedMult = mult;
    if (this.autoPlaying) {
      this.stopAuto();
      this.startAuto();
    }
  }

  toggleAuto(): void {
    if (this.autoPlaying) {
      this.stopAuto();
    } else {
      this.startAuto();
    }
  }

  private startAuto(): void {
    this.stopAuto();
    if (this.currentPly >= this.moves.length) {
      this.currentPly = 0;
      this.applyPly();
    }
    const baseMs = 650;
    const ms = Math.max(120, baseMs / this.speedMult);
    this.autoPlaying = true;
    this.autoTimer = setInterval(() => {
      if (this.currentPly >= this.moves.length) {
        this.stopAuto();
        return;
      }
      this.currentPly++;
      this.applyPly();
    }, ms);
  }

  private stopAuto(): void {
    if (this.autoTimer) {
      clearInterval(this.autoTimer);
      this.autoTimer = null;
    }
    this.autoPlaying = false;
  }

  private applyPly(): void {
    this.work = new Chess();
    for (let i = 0; i < this.currentPly; i++) {
      const san = this.moves[i];
      if (san) {
        this.work.move(san);
      }
    }
    this.fen = this.work.fen();
    this.evalWhitePercent = this.materialBarPercent(this.work);
  }

  private materialBarPercent(chess: Chess): number {
    let score = 0;
    for (const row of chess.board()) {
      for (const cell of row) {
        if (!cell) {
          continue;
        }
        const v = PIECE_VAL[cell.type] ?? 0;
        score += cell.color === 'w' ? v : -v;
      }
    }
    const lean = Math.max(-38, Math.min(38, score));
    return 50 + (lean / 38) * 42;
  }

  isActiveWhiteEnd(wi: number): boolean {
    return this.currentPly === wi + 1;
  }

  isActiveBlackEnd(bi: number): boolean {
    return (
      bi < this.moves.length && this.currentPly === bi + 1
    );
  }
}
