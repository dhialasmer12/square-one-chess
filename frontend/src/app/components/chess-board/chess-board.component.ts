import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { Chess, type Move, type Square } from 'chess.js';
import {
  BoardOrientation,
  ChessMoveEvent,
  CustomSquareHighlight,
  DEFAULT_START_FEN,
  MoveChange,
} from './chess-board.models';

@Component({
  selector: 'app-chess-board',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './chess-board.component.html',
  styleUrl: './chess-board.component.scss',
})
export class ChessBoardComponent
  implements AfterViewInit, OnChanges, OnDestroy
{
  @Input() fen: string | undefined;
  @Input() orientation: BoardOrientation = 'white';
  @Input() disabled = false;
  @Input() loading = false;

  /** Indique si seules les pièces du camp au trait peuvent être déplacées. */
  @Input() showLegalMoves = true;
  @Input() showLastMove = true;
  /** Rank numbers (1–8) and file letters (a–h) around the board; flips with `orientation`. */
  @Input() showCoordinates = true;

  @Input() legalMovesPointColor =
    'radial-gradient(#13262F 15%, transparent 20%);';
  @Input() sourcePointColor = 'rgba(146, 111, 26, 0.79)';
  @Input() destinationPointColor = '#b28e1a';

  @Output() moveEvent = new EventEmitter<ChessMoveEvent>();
  @Output() boardChange = new EventEmitter<MoveChange>();

  @ViewChild('boardRoot') boardRoot?: ElementRef<HTMLElement>;
  @ViewChild('hostRef') hostRef?: ElementRef<HTMLElement>;

  customHighlights: CustomSquareHighlight[] = [];

  private boardApi: any = null;
  private logic = new Chess(DEFAULT_START_FEN);
  private resizeObserver?: ResizeObserver;
  private resizeRaf = 0;

  private readonly coordFiles = [
    'a',
    'b',
    'c',
    'd',
    'e',
    'f',
    'g',
    'h',
  ] as const;
  private readonly coordRanks = [
    '8',
    '7',
    '6',
    '5',
    '4',
    '3',
    '2',
    '1',
  ] as const;

  constructor(
    private readonly host: ElementRef<HTMLElement>,
    private readonly zone: NgZone
  ) {}

  get fileLabels(): string[] {
    return this.orientation === 'white'
      ? [...this.coordFiles]
      : [...this.coordFiles].reverse();
  }

  get rankLabels(): string[] {
    return this.orientation === 'white'
      ? [...this.coordRanks]
      : [...this.coordRanks].reverse();
  }

  ngAfterViewInit(): void {
    this.initBoard();
    this.observeResize();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['fen']) {
      this.customHighlights = [];
      this.syncLogicFromInput();
    }

    if (!this.boardRoot) {
      return;
    }

    if (changes['disabled']) {
      this.refreshBoardInstance();
      return;
    }

    if (this.boardApi) {
      if (changes['fen']) {
        this.applyPositionOnly();
      }
      if (changes['orientation']) {
        this.boardApi.setOrientation?.(this.orientation);
      }
    }
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    cancelAnimationFrame(this.resizeRaf);
    this.destroyBoard();
  }

  setPosition(fen: string): void {
    try {
      this.logic = new Chess(fen.trim());
    } catch {
      this.logic = new Chess(DEFAULT_START_FEN);
    }
    this.customHighlights = [];
    this.boardApi?.position?.(this.logic.fen());
    this.emitBoardSnapshot();
  }

  resetBoard(): void {
    this.logic = new Chess(DEFAULT_START_FEN);
    this.customHighlights = [];
    this.boardApi?.position?.(DEFAULT_START_FEN);
    this.boardApi?.setOrientation?.(this.orientation);
    this.emitBoardSnapshot();
  }

  getFEN(): string {
    return this.boardApi?.fen?.() ?? this.logic.fen();
  }

  highlightSquare(square: string, color: string): void {
    const sq = square.trim().toLowerCase();
    if (sq.length < 2) {
      return;
    }
    const key = sq.slice(0, 2);
    this.customHighlights = [
      ...this.customHighlights.filter((h) => h.square !== key),
      { square: key, color },
    ];
  }

  clearCustomHighlights(): void {
    this.customHighlights = [];
  }

  highlightStyle(
    square: string,
    color: string
  ): Record<string, string> {
    const { col, row } = this.squareToOverlayGrid(square);
    const base: Record<string, string> = {
      left: `${(col / 8) * 100}%`,
      top: `${(row / 8) * 100}%`,
      width: '12.5%',
      height: '12.5%',
    };
    const c = color.trim().replace(/;+\s*$/, '');
    if (c.includes('gradient')) {
      return {
        ...base,
        border: 'none',
        backgroundImage: c,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        backgroundSize: '60% 60%',
      };
    }
    return {
      ...base,
      borderColor: c,
      backgroundColor: 'transparent',
    };
  }

  private safeFen(): string {
    const f = this.fen?.trim();
    if (!f) {
      return DEFAULT_START_FEN;
    }
    try {
      new Chess(f);
      return f;
    } catch {
      return DEFAULT_START_FEN;
    }
  }

  private syncLogicFromInput(): void {
    try {
      this.logic = new Chess(this.safeFen());
    } catch {
      this.logic = new Chess(DEFAULT_START_FEN);
    }
  }

  private applyPositionOnly(): void {
    const f = this.safeFen();
    try {
      this.boardApi?.position?.(f);
    } catch {
      this.boardApi?.position?.(DEFAULT_START_FEN);
    }
  }

  private get Chessboard2(): any {
    return (window as unknown as { Chessboard2?: any }).Chessboard2;
  }

  private initBoard(): void {
    const el = this.boardRoot?.nativeElement;
    const Cb = this.Chessboard2;
    if (!el || !Cb) {
      return;
    }
    this.destroyBoard();
    const self = this;
    this.boardApi = Cb(el, {
      position: this.safeFen(),
      orientation: this.orientation,
      draggable: !this.disabled,
      onDragStart: (details: { piece?: string; square?: string }) => {
        if (self.disabled) {
          return false;
        }
        const piece = details?.piece ?? '';
        const turn = self.logic.turn();
        const color = piece.charAt(0);
        if (self.showLegalMoves && color !== turn) {
          return false;
        }
        self.zone.run(() => {
          if (self.showLegalMoves && details.square) {
            self.paintLegalTargets(details.square);
          }
        });
        return true;
      },
      onDrop: (details: { source: string; target: string }) => {
        if (self.disabled) {
          return 'snapback';
        }
        const source = String(details.source ?? '').toLowerCase();
        const target = String(details.target ?? '').toLowerCase();
        if (
          !/^[a-h][1-8]$/.test(source) ||
          !/^[a-h][1-8]$/.test(target)
        ) {
          self.zone.run(() => self.clearCustomHighlights());
          return 'snapback';
        }
        const applied = self.tryApplyLegalMove(source, target);
        if (!applied) {
          self.zone.run(() => self.clearCustomHighlights());
          return 'snapback';
        }
        self.logic = applied.next;
        self.zone.run(() => {
          self.clearCustomHighlights();
          self.moveEvent.emit({
            from: source,
            to: target,
            promotion: applied.promotion,
          });
          self.boardChange.emit({
            fen: applied.next.fen(),
            check: applied.next.isCheck(),
            checkmate: applied.next.isCheckmate(),
            stalemate: applied.next.isStalemate(),
          });
        });
        return undefined;
      },
    });
  }

  /**
   * Legal moves from `from` only — rejects drops that are not on a real
   * chess.js destination (fixes illegal slides and ambiguous promotions).
   */
  private pickLegalVerboseMove(from: string, to: string): Move | null {
    let g: Chess;
    try {
      g = new Chess(this.logic.fen());
    } catch {
      return null;
    }
    const fromSq = from as Square;
    const toSq = to as Square;
    const legal = g.moves({ square: fromSq, verbose: true }) as Move[];
    const matches = legal.filter((m) => m.to === toSq);
    if (!matches.length) {
      return null;
    }
    const preferQueen = matches.find((m) => m.promotion === 'q');
    return preferQueen ?? matches[0]!;
  }

  private tryApplyLegalMove(
    from: string,
    to: string
  ): { next: Chess; promotion?: string } | null {
    const chosen = this.pickLegalVerboseMove(from, to);
    if (!chosen) {
      return null;
    }
    let g: Chess;
    try {
      g = new Chess(this.logic.fen());
    } catch {
      return null;
    }
    const played = g.move({
      from: chosen.from,
      to: chosen.to,
      promotion: chosen.promotion,
    });
    if (!played) {
      return null;
    }
    const promotion =
      played.promotion && played.promotion.length > 0
        ? played.promotion
        : undefined;
    return { next: g, promotion };
  }

  /** Dots on squares this piece may legally move to (uses overlay + radial gradient). */
  private paintLegalTargets(fromSquare: string): void {
    this.clearCustomHighlights();
    const from = fromSquare.trim().toLowerCase();
    if (!/^[a-h][1-8]$/.test(from)) {
      return;
    }
    let g: Chess;
    try {
      g = new Chess(this.logic.fen());
    } catch {
      return;
    }
    const fromSq = from as Square;
    if (!g.get(fromSq) || g.get(fromSq)!.color !== g.turn()) {
      return;
    }
    const legal = g.moves({ square: fromSq, verbose: true }) as Move[];
    const seen = new Set<string>();
    for (const m of legal) {
      const sq = m.to;
      if (seen.has(sq)) {
        continue;
      }
      seen.add(sq);
      this.highlightSquare(sq, this.legalMovesPointColor);
    }
  }

  private refreshBoardInstance(): void {
    this.destroyBoard();
    this.initBoard();
  }

  private destroyBoard(): void {
    if (this.boardApi && typeof this.boardApi.destroy === 'function') {
      this.boardApi.destroy();
    }
    this.boardApi = null;
  }

  private emitBoardSnapshot(): void {
    this.boardChange.emit({
      check: this.logic.isCheck(),
      stalemate: this.logic.isStalemate(),
      checkmate: this.logic.isCheckmate(),
      fen: this.logic.fen(),
      pgn: { pgn: '' },
      freeMode: false,
    });
  }

  private squareToOverlayGrid(square: string): { col: number; row: number } {
    const f = square.trim().toLowerCase();
    const file = f.charCodeAt(0) - 'a'.charCodeAt(0);
    const rank = parseInt(f.charAt(1), 10);
    let col = file;
    let row = 8 - rank;
    if (this.orientation === 'black') {
      col = 7 - col;
      row = 7 - row;
    }
    return { col, row };
  }

  private observeResize(): void {
    const el = this.hostRef?.nativeElement ?? this.host.nativeElement;
    this.zone.runOutsideAngular(() => {
      this.resizeObserver = new ResizeObserver(() => {
        this.scheduleResize();
      });
      this.resizeObserver.observe(el);
    });
    this.scheduleResize();
  }

  private scheduleResize(): void {
    cancelAnimationFrame(this.resizeRaf);
    this.resizeRaf = requestAnimationFrame(() =>
      this.zone.run(() => this.boardApi?.resize?.())
    );
  }
}
