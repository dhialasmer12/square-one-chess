export const DEFAULT_START_FEN =
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export interface ChessMoveEvent {
  from: string;
  to: string;
  promotion?: string;
}

export type BoardOrientation = 'white' | 'black';

/** Snapshot emitted after local moves remplace l’ancien type ngx-chess-board. */
export interface MoveChange {
  check?: boolean;
  stalemate?: boolean;
  checkmate?: boolean;
  fen?: string;
  pgn?: { pgn: string };
  freeMode?: boolean;
}

export interface CustomSquareHighlight {
  square: string;
  color: string;
}
