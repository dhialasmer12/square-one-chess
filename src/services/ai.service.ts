import { Chess, type Move, type PieceSymbol, type Square } from 'chess.js';
import * as gameService from './game.service';
import {
  getAnalysisDepth,
  getLeafDepth,
  getPredictDepth,
  initStockfishIfNeeded,
  parseBestmoveUci,
  parseFinalScoreWhitePov,
  parseMultiPvResults,
  parsedPvScore,
  runUciSearch,
  type ParsedMultiPvLine,
} from './stockfish-engine.service';
import {
  HttpError,
  type GameReviewMoveDto,
  type GameReviewResponse,
  type LessonCatalogEntry,
  type LessonPuzzleDto,
  type LessonRecommendation,
  type MistakePatternKey,
  type SkillEstimateFactors,
  type SkillEstimateResponse,
} from '../types';

export interface MoveSuggestion {
  from: string;
  to: string;
  san: string;
  score: number;
  description: string;
}

const CENTER_SQUARES: Square[] = ['d4', 'd5', 'e4', 'e5'];

const PIECE_VALUES: Record<Exclude<PieceSymbol, 'k'>, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
};

/** Pawn = 1, knight/bishop = 3, rook = 5, queen = 9, king = 0 */
export function calculatePieceValue(piece: PieceSymbol | string): number {
  const p = String(piece).toLowerCase() as PieceSymbol;
  if (p === 'k') {
    return 0;
  }
  return PIECE_VALUES[p] ?? 0;
}

function swapActiveColorInFen(fen: string): string {
  const parts = fen.trim().split(/\s+/);
  if (parts.length < 2) {
    return fen;
  }
  parts[1] = parts[1] === 'w' ? 'b' : 'w';
  return parts.join(' ');
}

function mobilityForColor(chess: Chess, color: 'w' | 'b'): number {
  if (chess.turn() === color) {
    return chess.moves().length;
  }
  const swapped = swapActiveColorInFen(chess.fen());
  try {
    const c = new Chess(swapped);
    if (c.turn() === color) {
      return c.moves().length;
    }
  } catch {
    /* invalid FEN */
  }
  return 0;
}

function materialBalance(chess: Chess): number {
  let score = 0;
  for (const row of chess.board()) {
    for (const cell of row) {
      if (!cell) {
        continue;
      }
      const v = calculatePieceValue(cell.type);
      score += cell.color === 'w' ? v : -v;
    }
  }
  return score;
}

function centerControl(chess: Chess): number {
  let score = 0;
  for (const sq of CENTER_SQUARES) {
    const p = chess.get(sq);
    if (!p) {
      continue;
    }
    const bonus = 0.35;
    score += p.color === 'w' ? bonus : -bonus;
  }
  return score;
}

function findKingSquare(chess: Chess, color: 'w' | 'b'): Square | null {
  for (const row of chess.board()) {
    for (const cell of row) {
      if (cell?.type === 'k' && cell.color === color) {
        return cell.square as Square;
      }
    }
  }
  return null;
}

/** Pawns on files adjacent to king, one rank "in front" (toward center). */
function pawnShieldScore(chess: Chess, kingSq: Square, color: 'w' | 'b'): number {
  const file = kingSq.charCodeAt(0) - 'a'.charCodeAt(0);
  const rank = parseInt(kingSq[1]!, 10);
  const forward = color === 'w' ? 1 : -1;
  const targetRank = rank + forward;
  if (targetRank < 1 || targetRank > 8) {
    return 0;
  }
  let bonus = 0;
  for (const df of [-1, 0, 1]) {
    const nf = file + df;
    if (nf < 0 || nf > 7) {
      continue;
    }
    const sq = (String.fromCharCode('a'.charCodeAt(0) + nf) +
      targetRank) as Square;
    const p = chess.get(sq);
    if (p?.type === 'p' && p.color === color) {
      bonus += 0.12;
    }
  }
  return bonus;
}

function kingSafetyForSide(chess: Chess, color: 'w' | 'b'): number {
  let score = 0;
  const fenParts = chess.fen().split(/\s+/);
  const castle = fenParts[2] ?? '-';
  if (color === 'w') {
    if (castle.includes('K') || castle.includes('Q')) {
      score += 0.18;
    }
  } else if (castle.includes('k') || castle.includes('q')) {
    score += 0.18;
  }
  const ksq = findKingSquare(chess, color);
  if (ksq) {
    score += pawnShieldScore(chess, ksq, color);
  }
  return score;
}

function developmentScore(chess: Chess): number {
  let score = 0;
  const board = chess.board();
  for (const row of board) {
    for (const cell of row) {
      if (!cell || cell.type === 'k' || cell.type === 'p') {
        continue;
      }
      const sq = cell.square;
      const rank = parseInt(sq[1]!, 10);
      const file = sq.charCodeAt(0) - 'a'.charCodeAt(0);
      const isWhite = cell.color === 'w';
      const homeRank = isWhite ? 1 : 8;
      if (rank === homeRank && (cell.type === 'n' || cell.type === 'b')) {
        score += isWhite ? -0.08 : 0.08;
        continue;
      }
      const centerDist =
        Math.abs(file - 3.5) + Math.abs(rank - (isWhite ? 4 : 5));
      const towardCenter = isWhite
        ? Math.max(0, 6 - centerDist) * 0.02
        : Math.max(0, 6 - centerDist) * 0.02;
      score += isWhite ? towardCenter : -towardCenter;
    }
  }
  return score;
}

/** Positive = better for White globally (material, structure, activity). */
export function evaluateGlobal(chess: Chess): number {
  let score = materialBalance(chess);
  score += 0.08 * (mobilityForColor(chess, 'w') - mobilityForColor(chess, 'b'));
  score += centerControl(chess);
  score += developmentScore(chess);
  score += kingSafetyForSide(chess, 'w') - kingSafetyForSide(chess, 'b');
  return score;
}

/**
 * Heuristic score for the side to move: positive = favourable for that side.
 */
export function evaluatePosition(fen: string): number {
  const chess = new Chess(fen);
  const g = evaluateGlobal(chess);
  return chess.turn() === 'w' ? g : -g;
}

function scoreMoveForSideToMove(chess: Chess, move: Move): number {
  const turn = chess.turn();
  const before = evaluateGlobal(chess);
  const trial = new Chess(chess.fen());
  trial.move(move);
  const after = evaluateGlobal(trial);
  const diff = after - before;
  return turn === 'w' ? diff : -diff;
}

function describeMove(chess: Chess, move: Move): string {
  const desc: string[] = [];
  if (move.captured) {
    desc.push(`Captures ${pieceLabel(move.captured)}`);
  }
  if (move.san.includes('O-O')) {
    desc.push('Castling');
  }
  const to = move.to as Square;
  if (CENTER_SQUARES.includes(to)) {
    desc.push('Central square');
  }
  if (move.san.endsWith('+') || move.san.endsWith('#')) {
    desc.push('Check');
  }
  const fromRank = parseInt(move.from[1]!, 10);
  const color = chess.turn();
  const backRank = color === 'w' ? 1 : 8;
  if (
    (move.piece === 'n' || move.piece === 'b') &&
    fromRank === backRank
  ) {
    desc.push('Develops piece');
  }
  if (desc.length === 0) {
    desc.push('Improves position');
  }
  return desc.slice(0, 2).join(' · ');
}

function pieceLabel(t: PieceSymbol): string {
  switch (t) {
    case 'p':
      return 'pawn';
    case 'n':
      return 'knight';
    case 'b':
      return 'bishop';
    case 'r':
      return 'rook';
    case 'q':
      return 'queen';
    default:
      return 'piece';
  }
}

/**
 * Enumerate legal moves, score each for the side to move, return top `numMoves`.
 */
function getBestMovesHeuristic(chess: Chess, numMoves = 3): MoveSuggestion[] {
  const n = Math.min(10, Math.max(1, Math.floor(numMoves)));
  if (chess.isGameOver()) {
    return [];
  }
  const legal = chess.moves({ verbose: true }) as Move[];
  if (!legal.length) {
    return [];
  }
  const rawScores = legal.map((m) => ({
    move: m,
    raw: scoreMoveForSideToMove(chess, m),
  }));
  rawScores.sort((a, b) => b.raw - a.raw);
  const top = rawScores.slice(0, n);
  const maxR = top[0]!.raw;
  const minR = top[top.length - 1]!.raw;
  const span = maxR - minR || 1;

  return top.map((t) => ({
    from: t.move.from,
    to: t.move.to,
    san: t.move.san,
    score: Math.round(((t.raw - minR) / span) * 100) / 100,
    description: describeMove(chess, t.move),
  }));
}

function uciToSan(chess: Chess, uci: string): string | null {
  if (!uci || uci === '(none)') {
    return null;
  }
  const from = uci.slice(0, 2) as Square;
  const to = uci.slice(2, 4) as Square;
  const promotion = (
    uci.length > 4 ? uci[4] : undefined
  ) as 'q' | 'r' | 'b' | 'n' | undefined;
  const moves = chess.moves({ verbose: true }) as Move[];
  const hit = moves.find(
    (mv) =>
      mv.from === from &&
      mv.to === to &&
      (promotion ? mv.promotion === promotion : !mv.promotion)
  );
  return hit?.san ?? null;
}

async function predictMovesStockfish(
  fen: string,
  numSuggestions: number
): Promise<MoveSuggestion[] | null> {
  const lines = await runUciSearch(fen.trim(), getPredictDepth(), numSuggestions);
  if (!lines) {
    return null;
  }
  let chess: Chess;
  try {
    chess = new Chess(fen.trim());
  } catch {
    return null;
  }
  if (chess.isGameOver()) {
    return [];
  }
  const rows = parseMultiPvResults(lines);
  let ordered: ParsedMultiPvLine[] = [...rows].sort(
    (a, b) => a.multipv - b.multipv
  );
  if (!ordered.length) {
    const uci = parseBestmoveUci(lines);
    if (!uci) {
      return null;
    }
    const san = uciToSan(chess, uci);
    if (!san) {
      return null;
    }
    const m = (chess.moves({ verbose: true }) as Move[]).find(
      (mv) => mv.san === san
    );
    if (!m) {
      return null;
    }
    return [
      {
        from: m.from,
        to: m.to,
        san: m.san,
        score: 1,
        description: describeMove(chess, m),
      },
    ];
  }
  ordered = ordered.slice(0, numSuggestions);
  const scores = ordered.map(parsedPvScore);
  const maxR = Math.max(...scores);
  const minR = Math.min(...scores);
  const span = maxR - minR || 1;
  const out: MoveSuggestion[] = [];
  for (let i = 0; i < ordered.length; i++) {
    const row = ordered[i]!;
    const san = uciToSan(chess, row.uciFirst);
    if (!san) {
      continue;
    }
    const m = (chess.moves({ verbose: true }) as Move[]).find(
      (mv) => mv.san === san
    );
    if (!m) {
      continue;
    }
    const raw = scores[i]!;
    out.push({
      from: m.from,
      to: m.to,
      san: m.san,
      score: Math.round(((raw - minR) / span) * 100) / 100,
      description: describeMove(chess, m),
    });
  }
  return out.length ? out : null;
}

function predictMovesHeuristic(fen: string, numSuggestions = 3): MoveSuggestion[] {
  let chess: Chess;
  try {
    chess = new Chess(fen.trim());
  } catch {
    return [];
  }
  return getBestMovesHeuristic(chess, numSuggestions);
}

export async function predictMoves(
  fen: string,
  numSuggestions = 3
): Promise<MoveSuggestion[]> {
  if (await initStockfishIfNeeded()) {
    try {
      const s = await predictMovesStockfish(fen, numSuggestions);
      if (s?.length) {
        return s;
      }
    } catch (e) {
      console.warn('[stockfish] predictMoves:', e);
    }
  }
  return predictMovesHeuristic(fen, numSuggestions);
}

// --- Skill estimation (heuristic ELO from move quality) ---

export type MoveQualityLabel = 'blunder' | 'mistake' | 'good' | 'excellent';

export interface MoveQualityResult {
  label: MoveQualityLabel;
  /** Heuristic loss vs best move (same units as `scoreMoveForSideToMove`). */
  loss: number;
  bestSan: string;
}

/** Rate a single legal SAN in `chessBefore` (side to move plays `san`). */
function analyzeMoveQualityHeuristic(
  chessBefore: Chess,
  san: string
): MoveQualityResult {
  const legal = chessBefore.moves({ verbose: true }) as Move[];
  if (!legal.length) {
    return { label: 'excellent', loss: 0, bestSan: '' };
  }
  let bestScore = -Infinity;
  let bestSan = legal[0]!.san;
  for (const m of legal) {
    const s = scoreMoveForSideToMove(chessBefore, m);
    if (s > bestScore) {
      bestScore = s;
      bestSan = m.san;
    }
  }
  const played = legal.find((m) => m.san === san);
  if (!played) {
    return { label: 'blunder', loss: 99, bestSan };
  }
  const playedScore = scoreMoveForSideToMove(chessBefore, played);
  const loss = Math.max(0, bestScore - playedScore);
  let label: MoveQualityLabel;
  if (loss <= 0.1 || played.san === bestSan) {
    label = 'excellent';
  } else if (loss <= 0.55) {
    label = 'good';
  } else if (loss <= 1.35) {
    label = 'mistake';
  } else {
    label = 'blunder';
  }
  return { label, loss, bestSan };
}

async function analyzeMoveQualityEngine(
  chessBefore: Chess,
  san: string
): Promise<MoveQualityResult> {
  const fen = chessBefore.fen();
  const legal = chessBefore.moves({ verbose: true }) as Move[];
  if (!legal.length) {
    return { label: 'excellent', loss: 0, bestSan: '' };
  }
  const lines = await runUciSearch(fen, getAnalysisDepth(), 1);
  if (!lines) {
    return analyzeMoveQualityHeuristic(chessBefore, san);
  }
  const bestUci = parseBestmoveUci(lines);
  if (!bestUci) {
    return analyzeMoveQualityHeuristic(chessBefore, san);
  }
  const bestSan = uciToSan(chessBefore, bestUci) ?? legal[0]!.san;
  const played = legal.find((m) => m.san === san);
  if (!played) {
    return { label: 'blunder', loss: 999, bestSan };
  }
  const afterBest = new Chess(fen);
  afterBest.move(bestSan);
  const afterPlayed = new Chess(fen);
  afterPlayed.move(san);
  const leafLinesBest = await runUciSearch(afterBest.fen(), getLeafDepth(), 1);
  const leafLinesPlayed = await runUciSearch(afterPlayed.fen(), getLeafDepth(), 1);
  if (!leafLinesBest || !leafLinesPlayed) {
    return analyzeMoveQualityHeuristic(chessBefore, san);
  }
  const cpBest = parseFinalScoreWhitePov(leafLinesBest);
  const cpPlayed = parseFinalScoreWhitePov(leafLinesPlayed);
  const stm = chessBefore.turn();
  const cpLoss = stm === 'w' ? cpBest - cpPlayed : cpPlayed - cpBest;
  const loss = Math.max(0, Math.round(cpLoss));
  let label: MoveQualityLabel;
  if (loss <= 10 || san === bestSan) {
    label = 'excellent';
  } else if (loss <= 60) {
    label = 'good';
  } else if (loss <= 150) {
    label = 'mistake';
  } else {
    label = 'blunder';
  }
  return { label, loss, bestSan };
}

export async function analyzeMoveQuality(
  chessBefore: Chess,
  san: string
): Promise<MoveQualityResult> {
  if (await initStockfishIfNeeded()) {
    try {
      return await analyzeMoveQualityEngine(chessBefore, san);
    } catch (e) {
      console.warn('[stockfish] analyzeMoveQuality:', e);
    }
  }
  return analyzeMoveQualityHeuristic(chessBefore, san);
}

/** Count blunders / mistakes for one side over a full game SAN list. */
export async function countBlunders(
  sanMoves: string[],
  perspective: 'white' | 'black'
): Promise<{ blunders: number; mistakes: number }> {
  const chess = new Chess();
  let blunders = 0;
  let mistakes = 0;
  for (let i = 0; i < sanMoves.length; i++) {
    const san = sanMoves[i];
    if (!san) {
      break;
    }
    const isWhiteMove = i % 2 === 0;
    if (isWhiteMove !== (perspective === 'white')) {
      const r = chess.move(san);
      if (!r) {
        break;
      }
      continue;
    }
    const q = await analyzeMoveQuality(chess, san);
    if (q.label === 'blunder') {
      blunders++;
    } else if (q.label === 'mistake') {
      mistakes++;
    }
    const r = chess.move(san);
    if (!r) {
      break;
    }
  }
  return { blunders, mistakes };
}

/** Common opening SANs (first ~8 moves) — heuristic book. */
const OPENING_BOOK = new Set<string>([
  'e4',
  'e5',
  'd4',
  'd5',
  'c4',
  'Nf3',
  'Nc3',
  'g3',
  'b3',
  'f4',
  'Bc4',
  'Bb5',
  'Bd3',
  'Bb4',
  'Ba5',
  'Bc5',
  'Bd6',
  'Be7',
  'Bg5',
  'Bh4',
  'Nf6',
  'Nc6',
  'Nd7',
  'Nb8',
  'Nb4',
  'Nd4',
  'Ne7',
  'Ng4',
  'Nh5',
  'c5',
  'c6',
  'e6',
  'g6',
  'a6',
  'h6',
  'a3',
  'h3',
  'O-O',
  'O-O-O',
  'd6',
  'dxe4',
  'dxe5',
  'exd5',
  'exd4',
  'Nxe4',
  'Nxe5',
  'Qxd4',
  'Qxd5',
]);

function openingSanKey(san: string): string {
  return san.replace(/[+#]+$/, '').trim();
}

/** 0–1 score: how often early moves look like standard development. */
export function evaluateOpeningKnowledge(
  sanMoves: string[],
  perspective: 'white' | 'black'
): number {
  const mine: string[] = [];
  for (let i = 0; i < sanMoves.length; i++) {
    const isWhite = i % 2 === 0;
    if (isWhite === (perspective === 'white')) {
      mine.push(sanMoves[i]!);
    }
    if (mine.length >= 6) {
      break;
    }
  }
  if (!mine.length) {
    return 0.5;
  }
  let hits = 0;
  for (const s of mine) {
    const k = openingSanKey(s);
    if (OPENING_BOOK.has(k) || OPENING_BOOK.has(s)) {
      hits++;
    }
  }
  return hits / mine.length;
}

function pieceAttacksFrom(
  chess: Chess,
  fromSq: Square,
  target: Square,
  byColor: 'w' | 'b'
): boolean {
  const trial = new Chess(chess.fen());
  const piece = trial.get(fromSq);
  if (!piece || piece.color !== byColor) {
    return false;
  }
  const moves = trial.moves({ verbose: true, square: fromSq }) as Move[];
  return moves.some((m) => m.to === target);
}

/** Rough fork: moved piece attacks 2+ valuable enemy units (incl. king). */
function isForkAfter(
  chess: Chess,
  toSq: Square,
  byColor: 'w' | 'b'
): boolean {
  const enemy: 'w' | 'b' = byColor === 'w' ? 'b' : 'w';
  let targets = 0;
  for (const row of chess.board()) {
    for (const cell of row) {
      if (!cell || cell.color !== enemy) {
        continue;
      }
      const sq = cell.square as Square;
      const v =
        cell.type === 'k' ? 4 : calculatePieceValue(cell.type as PieceSymbol);
      if (v < 2) {
        continue;
      }
      if (pieceAttacksFrom(chess, toSq, sq, byColor)) {
        targets++;
      }
    }
  }
  return targets >= 2;
}

/** 0–1: frequency of checks, heavy captures, forks in player's moves. */
export function evaluateTacticalAwareness(
  sanMoves: string[],
  perspective: 'white' | 'black'
): number {
  const chess = new Chess();
  let scored = 0;
  let total = 0;
  for (let i = 0; i < sanMoves.length; i++) {
    const san = sanMoves[i]!;
    const isWhite = i % 2 === 0;
    if (isWhite !== (perspective === 'white')) {
      chess.move(san);
      continue;
    }
    total++;
    const legal = chess.moves({ verbose: true }) as Move[];
    const played = legal.find((m) => m.san === san);
    if (!played) {
      break;
    }
    let bump = 0;
    if (played.captured && calculatePieceValue(played.captured) >= 3) {
      bump += 0.35;
    }
    const trial = new Chess(chess.fen());
    trial.move(played);
    if (trial.isCheck()) {
      bump += 0.3;
    }
    if (
      isForkAfter(
        trial,
        played.to as Square,
        isWhite ? 'w' : 'b'
      )
    ) {
      bump += 0.35;
    }
    if (played.san.includes('=Q') || played.san.includes('=R')) {
      bump += 0.2;
    }
    scored += Math.min(1, bump);
    chess.move(san);
  }
  return total ? scored / total : 0.4;
}

function materialOnBoard(chess: Chess): number {
  let n = 0;
  for (const row of chess.board()) {
    for (const cell of row) {
      if (cell && cell.type !== 'k') {
        n += calculatePieceValue(cell.type as PieceSymbol);
      }
    }
  }
  return n;
}

function hasQueen(chess: Chess, color: 'w' | 'b'): boolean {
  for (const row of chess.board()) {
    for (const cell of row) {
      if (cell?.type === 'q' && cell.color === color) {
        return true;
      }
    }
  }
  return false;
}

function isEndgamePosition(chess: Chess): boolean {
  return materialOnBoard(chess) <= 24 || !hasQueen(chess, 'w') || !hasQueen(chess, 'b');
}

/** 0–1: promotions, mate threats, play in simplified positions. */
export async function calculateEndgameSkill(
  sanMoves: string[],
  perspective: 'white' | 'black'
): Promise<number> {
  const chess = new Chess();
  let endgamePlies = 0;
  let good = 0;
  for (let i = 0; i < sanMoves.length; i++) {
    const san = sanMoves[i]!;
    const isWhite = i % 2 === 0;
    const mine = isWhite === (perspective === 'white');
    if (mine && isEndgamePosition(chess)) {
      endgamePlies++;
      if (san.includes('=')) {
        good += 1;
      } else if (san.endsWith('#')) {
        good += 1;
      } else {
        const q = await analyzeMoveQuality(chess, san);
        if (q.label === 'excellent' || q.label === 'good') {
          good += 0.6;
        }
      }
    }
    const r = chess.move(san);
    if (!r) {
      break;
    }
  }
  if (!endgamePlies) {
    return 0.45;
  }
  return Math.min(1, good / endgamePlies);
}

function tierFromScore(s: number): 'good' | 'average' | 'poor' {
  if (s >= 0.62) {
    return 'good';
  }
  if (s >= 0.38) {
    return 'average';
  }
  return 'poor';
}

function tierBonus(
  tier: 'good' | 'average' | 'poor',
  cap: number
): number {
  if (tier === 'good') {
    return cap;
  }
  if (tier === 'average') {
    return Math.round(cap * 0.55);
  }
  return 0;
}

function confidenceFromMoves(n: number): 'low' | 'medium' | 'high' {
  if (n >= 22) {
    return 'high';
  }
  if (n >= 12) {
    return 'medium';
  }
  return 'low';
}

function userMoveCount(sanMoves: string[], perspective: 'white' | 'black'): number {
  let c = 0;
  for (let i = 0; i < sanMoves.length; i++) {
    const isWhite = i % 2 === 0;
    if (isWhite === (perspective === 'white')) {
      c++;
    }
  }
  return c;
}

function buildStrengthsWeaknesses(
  f: SkillEstimateFactors,
  accuracyPercent: number
): {
  strengths: string[];
  weaknesses: string[];
} {
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  if (f.development === 'good') {
    strengths.push('Opening knowledge');
    strengths.push('Center control');
  } else if (f.development === 'poor') {
    weaknesses.push('Opening principles');
  }
  if (f.tactics === 'good') {
    strengths.push('Tactical awareness');
  } else if (f.tactics === 'poor') {
    weaknesses.push('Tactics (forks / forcing moves)');
  }
  if (f.endgame === 'good') {
    strengths.push('Endgame technique');
  } else if (f.endgame === 'poor' && f.movesAnalyzed >= 20) {
    weaknesses.push('Endgame technique');
  }
  if (accuracyPercent >= 75) {
    strengths.push(`High accuracy (${accuracyPercent}%)`);
  } else if (accuracyPercent <= 45 && f.movesAnalyzed >= 6) {
    weaknesses.push(`Low accuracy (${accuracyPercent}%)`);
  }
  if (f.blunders === 0 && f.mistakes <= 1 && f.movesAnalyzed >= 8) {
    strengths.push('Clean game — few serious errors');
  }
  if (f.blunders >= 2) {
    weaknesses.push(`${f.blunders} blunders in this game`);
  }
  if (f.mistakes >= 3) {
    weaknesses.push(`${f.mistakes} inaccuracies / mistakes`);
  }
  if (f.movesAnalyzed < 8) {
    weaknesses.push('Short sample — play longer games for a clearer estimate');
  }
  return { strengths, weaknesses };
}

async function classifySideMoves(
  sanMoves: string[],
  perspective: 'white' | 'black'
): Promise<{
  blunders: number;
  mistakes: number;
  goods: number;
  excellents: number;
  totalLoss: number;
  movesAnalyzed: number;
}> {
  const chess = new Chess();
  let blunders = 0;
  let mistakes = 0;
  let goods = 0;
  let excellents = 0;
  let totalLoss = 0;
  let movesAnalyzed = 0;
  for (let i = 0; i < sanMoves.length; i++) {
    const san = sanMoves[i];
    if (!san) {
      break;
    }
    const isWhiteMove = i % 2 === 0;
    if (isWhiteMove !== (perspective === 'white')) {
      const r = chess.move(san);
      if (!r) {
        break;
      }
      continue;
    }
    const q = await analyzeMoveQuality(chess, san);
    movesAnalyzed += 1;
    totalLoss += q.loss;
    if (q.label === 'blunder') {
      blunders += 1;
    } else if (q.label === 'mistake') {
      mistakes += 1;
    } else if (q.label === 'good') {
      goods += 1;
    } else {
      excellents += 1;
    }
    const r = chess.move(san);
    if (!r) {
      break;
    }
  }
  return { blunders, mistakes, goods, excellents, totalLoss, movesAnalyzed };
}

async function estimateSkillOneSide(
  sanMoves: string[],
  perspective: 'white' | 'black'
): Promise<SkillEstimateResponse> {
  const classified = await classifySideMoves(sanMoves, perspective);
  const { blunders, mistakes, goods, excellents, totalLoss, movesAnalyzed } =
    classified;
  const open = evaluateOpeningKnowledge(sanMoves, perspective);
  const tact = evaluateTacticalAwareness(sanMoves, perspective);
  const end = await calculateEndgameSkill(sanMoves, perspective);
  const devTier = tierFromScore(open);
  const tactTier = tierFromScore(tact);
  const endTier = tierFromScore(end);

  const accuracyPercent =
    movesAnalyzed === 0
      ? 50
      : Math.round(
          ((excellents * 1 + goods * 0.75 + mistakes * 0.35 + blunders * 0) /
            movesAnalyzed) *
            100
        );

  const avgLoss = movesAnalyzed ? totalLoss / movesAnalyzed : 2;

  // Continuous formula so similar-looking games still diverge.
  let elo = 900 + accuracyPercent * 11;
  elo += (open - 0.5) * 220;
  elo += (tact - 0.5) * 180;
  elo += (end - 0.5) * 120;
  elo -= avgLoss * 45;
  elo -= blunders * 85;
  elo -= mistakes * 32;
  elo += Math.min(80, movesAnalyzed * 2);
  if (movesAnalyzed < 8) {
    // Short games: pull toward mid-range but keep accuracy signal.
    elo = Math.round(elo * 0.65 + 1200 * 0.35);
  }
  elo = Math.max(700, Math.min(2400, Math.round(elo)));

  const factors: SkillEstimateFactors = {
    development: devTier,
    tactics: tactTier,
    endgame: endTier,
    blunders,
    mistakes,
    accuracyPercent,
    movesAnalyzed,
  };
  const { strengths, weaknesses } = buildStrengthsWeaknesses(
    factors,
    accuracyPercent
  );
  return {
    estimatedElo: elo,
    confidence: confidenceFromMoves(movesAnalyzed),
    factors,
    strengths: strengths.slice(0, 4),
    weaknesses: weaknesses.slice(0, 4),
  };
}

function mergeEstimates(
  a: SkillEstimateResponse,
  b: SkillEstimateResponse
): SkillEstimateResponse {
  const elo = Math.round((a.estimatedElo + b.estimatedElo) / 2);
  const confOrder = { low: 0, medium: 1, high: 2 };
  const conf =
    confOrder[a.confidence] <= confOrder[b.confidence]
      ? a.confidence
      : b.confidence;
  const worseDev =
    a.factors.development === 'poor' || b.factors.development === 'poor'
      ? 'poor'
      : a.factors.development === 'average' ||
          b.factors.development === 'average'
        ? 'average'
        : 'good';
  const worseTac =
    a.factors.tactics === 'poor' || b.factors.tactics === 'poor'
      ? 'poor'
      : a.factors.tactics === 'average' || b.factors.tactics === 'average'
        ? 'average'
        : 'good';
  const worseEnd =
    a.factors.endgame === 'poor' || b.factors.endgame === 'poor'
      ? 'poor'
      : a.factors.endgame === 'average' || b.factors.endgame === 'average'
        ? 'average'
        : 'good';
  const accuracyPercent = Math.round(
    (a.factors.accuracyPercent + b.factors.accuracyPercent) / 2
  );
  const movesAnalyzed = a.factors.movesAnalyzed + b.factors.movesAnalyzed;
  const factors: SkillEstimateFactors = {
    development: worseDev,
    tactics: worseTac,
    endgame: worseEnd,
    blunders: Math.round((a.factors.blunders + b.factors.blunders) / 2),
    mistakes: Math.round((a.factors.mistakes + b.factors.mistakes) / 2),
    accuracyPercent,
    movesAnalyzed,
  };
  const strengths = [...new Set([...a.strengths, ...b.strengths])].slice(0, 4);
  const weaknesses = [...new Set([...a.weaknesses, ...b.weaknesses])].slice(
    0,
    4
  );
  return {
    estimatedElo: elo,
    confidence: conf,
    factors,
    strengths,
    weaknesses,
  };
}

/**
 * Predict skill ELO from a full game's SAN list.
 * With `perspective`, judges only that side; otherwise averages both colors.
 */
export async function estimateSkill(
  sanMoves: string[],
  options?: { perspective?: 'white' | 'black' }
): Promise<SkillEstimateResponse> {
  if (!sanMoves.length) {
    return {
      estimatedElo: 1200,
      confidence: 'low',
      factors: {
        development: 'poor',
        tactics: 'poor',
        endgame: 'poor',
        blunders: 0,
        mistakes: 0,
        accuracyPercent: 0,
        movesAnalyzed: 0,
      },
      strengths: [],
      weaknesses: ['No moves to analyze'],
    };
  }
  const verify = new Chess();
  for (const san of sanMoves) {
    const r = verify.move(san);
    if (!r) {
      return {
        estimatedElo: 1200,
        confidence: 'low',
        factors: {
          development: 'poor',
          tactics: 'poor',
          endgame: 'poor',
          blunders: 0,
          mistakes: 0,
          accuracyPercent: 0,
          movesAnalyzed: 0,
        },
        strengths: [],
        weaknesses: ['Invalid move sequence'],
      };
    }
  }
  if (options?.perspective) {
    return estimateSkillOneSide(sanMoves, options.perspective);
  }
  const w = await estimateSkillOneSide(sanMoves, 'white');
  const bl = await estimateSkillOneSide(sanMoves, 'black');
  return mergeEstimates(w, bl);
}

// --- Lesson recommender (mistake patterns → in-memory catalog) ---

export interface MistakeTally {
  hanging_piece: number;
  missed_fork: number;
  missed_pin: number;
  castling_mistake: number;
  pawn_weakness: number;
  endgame_error: number;
}

function emptyTally(): MistakeTally {
  return {
    hanging_piece: 0,
    missed_fork: 0,
    missed_pin: 0,
    castling_mistake: 0,
    pawn_weakness: 0,
    endgame_error: 0,
  };
}

function anyLegalMoveCreatesFork(chess: Chess, color: 'w' | 'b'): boolean {
  const legal = chess.moves({ verbose: true }) as Move[];
  for (const m of legal) {
    const t = new Chess(chess.fen());
    t.move(m);
    if (isForkAfter(t, m.to as Square, color)) {
      return true;
    }
  }
  return false;
}

function anySliderCheckAvailable(chess: Chess): boolean {
  const legal = chess.moves({ verbose: true }) as Move[];
  for (const m of legal) {
    if (m.piece !== 'b' && m.piece !== 'r' && m.piece !== 'q') {
      continue;
    }
    const t = new Chess(chess.fen());
    t.move(m);
    if (t.isCheck()) {
      return true;
    }
  }
  return false;
}

function countPawnStructureProblems(chess: Chess, us: 'w' | 'b'): number {
  const filesWithPawn = new Array(8).fill(false);
  const fileCounts = new Array(8).fill(0);
  for (const row of chess.board()) {
    for (const cell of row) {
      if (!cell || cell.type !== 'p' || cell.color !== us) {
        continue;
      }
      const f = cell.square.charCodeAt(0) - 'a'.charCodeAt(0);
      fileCounts[f]++;
      filesWithPawn[f] = true;
    }
  }
  let problems = 0;
  for (let f = 0; f < 8; f++) {
    if (fileCounts[f] >= 2) {
      problems++;
    }
    if (filesWithPawn[f]) {
      const hasNeighbor =
        (f > 0 && filesWithPawn[f - 1]) || (f < 7 && filesWithPawn[f + 1]);
      if (!hasNeighbor) {
        problems++;
      }
    }
  }
  return problems;
}

/**
 * Heuristic mistake patterns for one player over a full SAN game.
 */
export async function identifyCommonMistakes(
  sanMoves: string[],
  perspective: 'white' | 'black'
): Promise<MistakeTally> {
  const tally = emptyTally();
  const chess = new Chess();
  for (let i = 0; i < sanMoves.length; i++) {
    const san = sanMoves[i]!;
    const isWhite = i % 2 === 0;
    const mine = isWhite === (perspective === 'white');
    if (!mine) {
      const r = chess.move(san);
      if (!r) {
        break;
      }
      continue;
    }
    const color = isWhite ? 'w' : 'b';
    const q = await analyzeMoveQuality(chess, san);
    const legal = chess.moves({ verbose: true }) as Move[];
    const played = legal.find((m) => m.san === san);
    if (!played) {
      break;
    }

    const forkPossible = anyLegalMoveCreatesFork(chess, color);
    const trialPlayed = new Chess(chess.fen());
    trialPlayed.move(played);
    const playedFork = isForkAfter(trialPlayed, played.to as Square, color);
    if (forkPossible && !playedFork && q.label !== 'excellent') {
      tally.missed_fork++;
    }

    const canSliderCheck = anySliderCheckAvailable(chess);
    if (
      canSliderCheck &&
      !trialPlayed.isCheck() &&
      (q.label === 'mistake' || q.label === 'blunder')
    ) {
      tally.missed_pin++;
    }

    const castleLegal = chess
      .moves()
      .some((m) => m === 'O-O' || m === 'O-O-O');
    if (
      castleLegal &&
      played.piece === 'k' &&
      !/^O-O/.test(played.san) &&
      (q.label === 'mistake' || q.label === 'blunder')
    ) {
      tally.castling_mistake++;
    }

    if (isEndgamePosition(chess) && (q.label === 'blunder' || q.label === 'mistake')) {
      tally.endgame_error++;
    }

    chess.move(san);

    if (q.label === 'blunder') {
      const opp = chess.moves({ verbose: true }) as Move[];
      const bigCap = opp.some(
        (m) =>
          m.captured &&
          calculatePieceValue(m.captured as PieceSymbol) >= 3
      );
      if (bigCap) {
        tally.hanging_piece++;
      }
    }

    if (countPawnStructureProblems(chess, color) >= 3) {
      tally.pawn_weakness++;
    }
  }
  return tally;
}

const LESSON_CATALOG: LessonCatalogEntry[] = [
  {
    id: 'fork_101',
    title: 'Mastering Forks',
    description: 'Learn how to attack two pieces at once with knights and other pieces.',
    difficulty: 'beginner',
    relatedMistake: 'missed_fork',
    puzzleCount: 5,
    videoUrl: 'https://example.com/courses/fork-101',
  },
  {
    id: 'hanging_102',
    title: 'Stop Hanging Pieces',
    description: 'Spot undefended targets and avoid leaving pieces en prise.',
    difficulty: 'beginner',
    relatedMistake: 'hanging_piece',
    puzzleCount: 6,
  },
  {
    id: 'pin_201',
    title: 'Pins & Skewers',
    description: 'Align enemy king and pieces to win material with line pieces.',
    difficulty: 'intermediate',
    relatedMistake: 'missed_pin',
    puzzleCount: 4,
    videoUrl: 'https://example.com/courses/pins-201',
  },
  {
    id: 'castle_110',
    title: 'King Safety & Castling',
    description: 'When and how to castle for a safer king.',
    difficulty: 'beginner',
    relatedMistake: 'castling_mistake',
    puzzleCount: 3,
  },
  {
    id: 'pawn_220',
    title: 'Pawn Structure Basics',
    description: 'Doubled, isolated, and passed pawns — strengths and weaknesses.',
    difficulty: 'intermediate',
    relatedMistake: 'pawn_weakness',
    puzzleCount: 5,
  },
  {
    id: 'endgame_301',
    title: 'Practical Endgames',
    description: 'Promotion races, king activity, and basic checkmates.',
    difficulty: 'advanced',
    relatedMistake: 'endgame_error',
    puzzleCount: 8,
  },
];

function catalogDifficultyToUi(
  d: LessonCatalogEntry['difficulty']
): LessonRecommendation['difficulty'] {
  if (d === 'beginner') {
    return 'easy';
  }
  if (d === 'intermediate') {
    return 'medium';
  }
  return 'hard';
}

function estimatedTimeForLesson(d: LessonCatalogEntry['difficulty']): string {
  if (d === 'beginner') {
    return '10 min';
  }
  if (d === 'intermediate') {
    return '20 min';
  }
  return '35 min';
}

function reasonForPattern(
  key: MistakePatternKey,
  count: number,
  gamesSampled: number
): string {
  const scope =
    gamesSampled > 1
      ? `across your last ${gamesSampled} finished games`
      : 'in your recent games';
  const c = Math.max(1, Math.round(count));
  switch (key) {
    case 'hanging_piece':
      return `Heavy pieces were left loose or capturable ${scope} (~${c} pattern${c > 1 ? 's' : ''}).`;
    case 'missed_fork':
      return `You missed about ${c} fork opportunity${c > 1 ? 'ies' : 'y'} ${scope}.`;
    case 'missed_pin':
      return `Forcing line moves (pins / checks) were overlooked ${scope} (~${c} time${c > 1 ? 's' : ''}).`;
    case 'castling_mistake':
      return `King moves without castling hurt your safety ~${c} time${c > 1 ? 's' : ''} ${scope}.`;
    case 'pawn_weakness':
      return `Pawn structure issues (doubled / isolated) showed up ${scope}.`;
    case 'endgame_error':
      return `Accuracy dropped in simplified positions ${scope} (~${c} slip${c > 1 ? 's' : ''}).`;
    default:
      return `Pattern detected ${scope}.`;
  }
}

function priorityFromRank(
  rank: number,
  total: number
): LessonRecommendation['priority'] {
  if (total <= 1) {
    return 'high';
  }
  const third = Math.ceil(total / 3);
  if (rank < third) {
    return 'high';
  }
  if (rank < third * 2) {
    return 'medium';
  }
  return 'low';
}

/**
 * Aggregate mistake patterns from the user's last finished games and map to lessons.
 */
export async function recommendLessons(
  userId: string,
  numRecommendations = 5
): Promise<LessonRecommendation[]> {
  const n = Math.min(10, Math.max(1, Math.floor(numRecommendations)));
  const games = await gameService.getRecentFinishedGamesForUser(userId, 5);
  const aggregate = emptyTally();
  if (!games.length) {
    return LESSON_CATALOG.slice(0, n).map((L, idx) => ({
      id: L.id,
      title: L.title,
      priority: priorityFromRank(idx, n),
      reason:
        'Play a few rated games to get personalized recommendations from your moves.',
      difficulty: catalogDifficultyToUi(L.difficulty),
      estimatedTime: estimatedTimeForLesson(L.difficulty),
    }));
  }

  for (const g of games) {
    const moves = await gameService.getMoveHistory(g.id, userId);
    const perspective =
      g.whitePlayerId === userId ? ('white' as const) : ('black' as const);
    const m = await identifyCommonMistakes(moves, perspective);
    aggregate.hanging_piece += m.hanging_piece;
    aggregate.missed_fork += m.missed_fork;
    aggregate.missed_pin += m.missed_pin;
    aggregate.castling_mistake += m.castling_mistake;
    aggregate.pawn_weakness += m.pawn_weakness;
    aggregate.endgame_error += m.endgame_error;
  }

  const scored = LESSON_CATALOG.map((L) => {
    const key = L.relatedMistake as keyof MistakeTally;
    const score = aggregate[key] ?? 0;
    return { L, score };
  });
  scored.sort((a, b) => b.score - a.score);

  const picked: LessonRecommendation[] = [];
  const used = new Set<string>();
  for (const { L, score } of scored) {
    if (picked.length >= n) {
      break;
    }
    const key = L.relatedMistake as keyof MistakeTally;
    const reason =
      score > 0
        ? reasonForPattern(key, score, games.length)
        : `Keep sharpening: ${L.title.toLowerCase()} helps long-term growth.`;
    picked.push({
      id: L.id,
      title: L.title,
      priority: priorityFromRank(picked.length, n),
      reason,
      difficulty: catalogDifficultyToUi(L.difficulty),
      estimatedTime: estimatedTimeForLesson(L.difficulty),
    });
    used.add(L.id);
  }

  for (const L of LESSON_CATALOG) {
    if (picked.length >= n) {
      break;
    }
    if (used.has(L.id)) {
      continue;
    }
    picked.push({
      id: L.id,
      title: L.title,
      priority: 'low',
      reason: `General study: ${L.description.slice(0, 80)}…`,
      difficulty: catalogDifficultyToUi(L.difficulty),
      estimatedTime: estimatedTimeForLesson(L.difficulty),
    });
  }

  return picked.slice(0, n);
}

function findCatalogLesson(lessonId: string): LessonCatalogEntry | undefined {
  return LESSON_CATALOG.find((L) => L.id === lessonId);
}

function puzzleCopyForPattern(
  pattern: MistakePatternKey,
  playedSan: string,
  bestSan: string
): { prompt: string; solutionHint: string } {
  const hint =
    bestSan && bestSan !== playedSan
      ? `Engine-style pick for this position: ${bestSan} (you played ${playedSan}).`
      : `Look for a stronger alternative to ${playedSan}.`;
  switch (pattern) {
    case 'hanging_piece':
      return {
        prompt:
          'From this game: you dropped material or allowed a heavy capture. Replay the moment and find a safe line.',
        solutionHint: hint,
      };
    case 'missed_fork':
      return {
        prompt:
          'From this game: a knight or piece fork was available and the move you chose missed that tactic.',
        solutionHint: hint,
      };
    case 'missed_pin':
      return {
        prompt:
          'From this game: a forcing line with a slider (pin / skewer / check) was stronger than what you played.',
        solutionHint: hint,
      };
    case 'castling_mistake':
      return {
        prompt:
          'From this game: castling was still legal but you moved the king another way in a sharp position.',
        solutionHint: hint,
      };
    case 'pawn_weakness':
      return {
        prompt:
          'From this game: your move worsened pawn structure (doubled / isolated files). Find a healthier plan.',
        solutionHint: hint,
      };
    case 'endgame_error':
      return {
        prompt:
          'From this game: accuracy slipped in a simplified position — practice choosing the most useful move.',
        solutionHint: hint,
      };
    default:
      return {
        prompt:
          'From this game: the heuristic marks this as a slip — compare your move to a stronger alternative.',
        solutionHint: hint,
      };
  }
}

function pickPrimaryMistakePattern(args: {
  q: MoveQualityResult;
  played: Move;
  color: 'w' | 'b';
  chessBefore: Chess;
  trialPlayed: Chess;
  hangingHeavy: boolean;
  pawnWeakAfter: boolean;
}): MistakePatternKey | null {
  const { q, played, color, chessBefore, trialPlayed, hangingHeavy, pawnWeakAfter } =
    args;

  const forkPossible = anyLegalMoveCreatesFork(chessBefore, color);
  const playedFork = isForkAfter(trialPlayed, played.to as Square, color);
  const missedFork =
    forkPossible && !playedFork && q.label !== 'excellent';

  const canSliderCheck = anySliderCheckAvailable(chessBefore);
  const missedPin =
    canSliderCheck &&
    !trialPlayed.isCheck() &&
    (q.label === 'mistake' || q.label === 'blunder');

  const castleLegal = chessBefore
    .moves()
    .some((m) => m === 'O-O' || m === 'O-O-O');
  const castlingMistake =
    castleLegal &&
    played.piece === 'k' &&
    !/^O-O/.test(played.san) &&
    (q.label === 'mistake' || q.label === 'blunder');

  const endgameError =
    isEndgamePosition(chessBefore) &&
    (q.label === 'blunder' || q.label === 'mistake');

  if (hangingHeavy) {
    return 'hanging_piece';
  }
  if (missedFork) {
    return 'missed_fork';
  }
  if (missedPin) {
    return 'missed_pin';
  }
  if (castlingMistake) {
    return 'castling_mistake';
  }
  if (endgameError) {
    return 'endgame_error';
  }
  if (pawnWeakAfter && (q.label === 'mistake' || q.label === 'blunder')) {
    return 'pawn_weakness';
  }
  if (q.label === 'mistake' || q.label === 'blunder') {
    return 'suboptimal';
  }
  return null;
}

/**
 * Extract personalized puzzles from one game's SAN list (user perspective).
 * @param patternFilter when set, only positions classified with that theme are kept.
 */
export async function extractPuzzlesFromSanGame(
  gameId: string,
  sanMoves: string[],
  perspective: 'white' | 'black',
  options: { patternFilter: MistakePatternKey | null; max: number }
): Promise<LessonPuzzleDto[]> {
  const out: LessonPuzzleDto[] = [];
  const chess = new Chess();
  for (let i = 0; i < sanMoves.length && out.length < options.max; i++) {
    const san = sanMoves[i]!;
    const isWhite = i % 2 === 0;
    const mine = isWhite === (perspective === 'white');
    if (!mine) {
      const r = chess.move(san);
      if (!r) {
        break;
      }
      continue;
    }
    const color = isWhite ? 'w' : 'b';
    const fenBefore = chess.fen();
    const chessBefore = new Chess(fenBefore);
    const q = await analyzeMoveQuality(chessBefore, san);
    const legal = chessBefore.moves({ verbose: true }) as Move[];
    const played = legal.find((m) => m.san === san);
    if (!played) {
      break;
    }
    const trialPlayed = new Chess(fenBefore);
    trialPlayed.move(played);
    chess.move(san);

    let hangingHeavy = false;
    if (q.label === 'blunder') {
      const opp = chess.moves({ verbose: true }) as Move[];
      hangingHeavy = opp.some(
        (m) =>
          m.captured &&
          calculatePieceValue(m.captured as PieceSymbol) >= 3
      );
    }
    const pawnWeakAfter =
      countPawnStructureProblems(chess, color) >= 3;

    const primary = pickPrimaryMistakePattern({
      q,
      played,
      color,
      chessBefore: new Chess(fenBefore),
      trialPlayed,
      hangingHeavy,
      pawnWeakAfter,
    });
    if (!primary) {
      continue;
    }
    if (options.patternFilter && primary !== options.patternFilter) {
      continue;
    }
    const { prompt, solutionHint } = puzzleCopyForPattern(
      primary,
      played.san,
      q.bestSan
    );
    out.push({
      id: `${gameId}-${i}-${primary}`,
      gameId,
      plyIndex: i,
      fen: fenBefore,
      pattern: primary,
      playedSan: played.san,
      bestSan: q.bestSan,
      prompt,
      solutionHint,
    });
  }
  return out;
}

export async function buildGameReviewMoves(
  sanMoves: string[],
  perspective: 'white' | 'black'
): Promise<GameReviewMoveDto[]> {
  const rows: GameReviewMoveDto[] = [];
  const chess = new Chess();
  for (let i = 0; i < sanMoves.length; i++) {
    const san = sanMoves[i]!;
    const isWhite = i % 2 === 0;
    const mine = isWhite === (perspective === 'white');
    if (!mine) {
      const r = chess.move(san);
      if (!r) {
        break;
      }
      rows.push({
        plyIndex: i,
        san,
        byWhite: isWhite,
        isMine: false,
      });
      continue;
    }
    const q = await analyzeMoveQuality(chess, san);
    const note =
      q.label === 'excellent'
        ? 'In line with the engine best line.'
        : q.label === 'good'
          ? 'Playable — a stronger idea existed.'
          : q.label === 'mistake'
            ? 'Meaningful drop vs the top candidate.'
            : 'Large swing vs the top candidate.';
    chess.move(san);
    rows.push({
      plyIndex: i,
      san,
      byWhite: isWhite,
      isMine: true,
      quality: q.label,
      bestSan: q.bestSan !== san ? q.bestSan : undefined,
      note,
    });
  }
  return rows;
}

export async function getLessonPuzzles(
  userId: string,
  lessonId: string,
  limit: number
): Promise<LessonPuzzleDto[]> {
  const catalog = findCatalogLesson(lessonId);
  if (!catalog) {
    return [];
  }
  const pattern = catalog.relatedMistake as MistakePatternKey;
  const maxTotal = Math.min(20, Math.max(1, Math.floor(limit)));
  const games = await gameService.getRecentFinishedGamesForUser(userId, 10);
  const out: LessonPuzzleDto[] = [];
  for (const g of games) {
    if (out.length >= maxTotal) {
      break;
    }
    const moves = await gameService.getMoveHistory(g.id, userId);
    const perspective =
      g.whitePlayerId === userId ? ('white' as const) : ('black' as const);
    const chunk = await extractPuzzlesFromSanGame(g.id, moves, perspective, {
      patternFilter: pattern,
      max: maxTotal - out.length,
    });
    out.push(...chunk);
  }
  return out;
}

export async function getGameReview(
  gameId: string,
  userId: string
): Promise<GameReviewResponse> {
  const game = await gameService.loadGameOrThrow(gameId);
  if (game.whitePlayerId !== userId && game.blackPlayerId !== userId) {
    throw new HttpError(403, 'You are not a player in this game');
  }
  if (game.status !== 'finished') {
    throw new HttpError(400, 'Game must be finished to open review');
  }
  const sanMoves = await gameService.getMoveHistory(gameId, userId);
  const perspective =
    game.whitePlayerId === userId ? ('white' as const) : ('black' as const);
  const moves = await buildGameReviewMoves(sanMoves, perspective);
  const puzzles = await extractPuzzlesFromSanGame(gameId, sanMoves, perspective, {
    patternFilter: null,
    max: 20,
  });
  return {
    gameId,
    myColor: perspective,
    moves,
    puzzles,
  };
}
