import { CommonModule } from '@angular/common';
import {
  Component,
  NgZone,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom, forkJoin } from 'rxjs';
import { ChessBoardComponent } from '../../components/chess-board/chess-board.component';
import type { ChessMoveEvent } from '../../components/chess-board/chess-board.models';
import { GameChatComponent } from '../../components/social/game-chat.component';
import { SkillEstimateModalComponent } from '../../components/skill-estimate-modal/skill-estimate-modal.component';
import type {
  ChessStatusPayload,
  GameEndPayload,
  GameMovedPayload,
  GameResponse,
  GameSessionResponse,
  MoveSuggestion,
  OpponentAwayPayload,
  SkillEstimateResponse,
} from '../../models';
import { AiSuggestionService } from '../../services/ai-suggestion.service';
import { GamePlayService } from '../../services/game-play.service';
import { GameSoundService } from '../../services/game-sound.service';
import { SocketService } from '../../services/socket.service';
import { OPEN_SEAT_USER_ID } from '../../constants/system';

@Component({
  selector: 'app-game-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ChessBoardComponent,
    SkillEstimateModalComponent,
    GameChatComponent,
  ],
  templateUrl: './game-page.component.html',
  styleUrl: './game-page.component.scss',
})
export class GamePageComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly gamePlay = inject(GamePlayService);
  private readonly sockets = inject(SocketService);
  private readonly aiSuggest = inject(AiSuggestionService);
  private readonly sounds = inject(GameSoundService);
  private readonly ngZone = inject(NgZone);

  @ViewChild('chessBoard') chessBoard?: ChessBoardComponent;

  gameId = '';
  /** Read-only review: no socket, no moves. */
  replayMode = false;
  session: GameSessionResponse | null = null;
  chessStatus: ChessStatusPayload | null = null;
  moves: string[] = [];

  connecting = true;
  loadError = '';
  /** True while a player move is being confirmed (no full-board spinner). */
  moveInFlight = false;
  boardLoading = false;
  resignBusy = false;
  drawBusy = false;

  gameOver = false;
  opponentAway = false;
  graceSeconds = 8;
  incomingDraw = false;
  drawBanner = '';

  suggestBusy = false;
  suggestError = '';
  moveSuggestions: MoveSuggestion[] = [];

  skillModalOpen = false;
  skillModalLoading = false;
  skillModalError = '';
  skillModalResult: SkillEstimateResponse | null = null;

  private lastEndReason: string | undefined;
  private destroyed = false;

  private readonly onMoved = (payload: GameMovedPayload) =>
    this.ngZone.run(() => this.handleRemoteMove(payload));
  private readonly onEnded = (payload: GameEndPayload) =>
    this.ngZone.run(() => this.handleGameEnd(payload));
  private readonly onState = (payload: GameResponse) =>
    this.ngZone.run(() => this.handleGameState(payload));
  private readonly onOpponentAway = (payload: OpponentAwayPayload) =>
    this.ngZone.run(() => this.handleOpponentAway(payload));
  private readonly onDrawOffered = (payload: { fromUserId: string }) =>
    this.ngZone.run(() => this.handleDrawOffered(payload));
  private readonly onDrawDeclined = (_payload: { byUserId: string }) =>
    this.ngZone.run(() => this.handleDrawDeclined());
  private readonly onSocketConnect = () =>
    this.ngZone.run(() => void this.onReconnect());

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('gameId');
    if (!id) {
      void this.router.navigate(['/lobby']);
      return;
    }
    this.gameId = id;
    const rp = this.route.snapshot.queryParamMap.get('replay');
    this.replayMode = rp === '1' || rp === 'true';
    if (this.replayMode) {
      void this.bootstrapReplay();
    } else {
      void this.bootstrap();
    }
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.detachSocketListeners();
    if (this.gameId && !this.replayMode) {
      this.gamePlay.leaveGame(this.gameId);
    }
  }

  get myTurn(): boolean {
    if (!this.session || !this.chessStatus || this.gameOver) {
      return false;
    }
    return this.chessStatus.turn === this.session.myColor;
  }

  get vsBot(): boolean {
    const opp = this.session?.opponent;
    return !!opp && opp.id === OPEN_SEAT_USER_ID;
  }

  get boardDisabled(): boolean {
    if (this.replayMode) {
      return true;
    }
    return (
      this.gameOver ||
      !this.myTurn ||
      this.connecting ||
      this.moveInFlight ||
      this.boardLoading
    );
  }

  get moveRows(): { num: number; white: string; black: string }[] {
    const rows: { num: number; white: string; black: string }[] = [];
    for (let i = 0; i < this.moves.length; i += 2) {
      rows.push({
        num: rows.length + 1,
        white: this.moves[i] ?? '',
        black: this.moves[i + 1] ?? '',
      });
    }
    return rows;
  }

  get statusLinePrimary(): string {
    if (!this.chessStatus) {
      return 'Loading position…';
    }
    if (this.gameOver) {
      return this.endMessage;
    }
    if (this.chessStatus.isCheckmate) {
      return 'Checkmate';
    }
    if (this.chessStatus.isStalemate) {
      return 'Stalemate';
    }
    if (this.chessStatus.isDraw && !this.chessStatus.isStalemate) {
      return 'Draw';
    }
    if (this.chessStatus.inCheck) {
      return 'Check';
    }
    return 'In progress';
  }

  get statusLineSecondary(): string {
    if (!this.chessStatus || this.gameOver) {
      return '';
    }
    const t =
      this.chessStatus.turn === 'white' ? 'White to move' : 'Black to move';
    if (this.chessStatus.inCheck && !this.chessStatus.isGameOver) {
      return `${t} — king in check`;
    }
    return t;
  }

  get endMessage(): string {
    const g = this.session?.game;
    if (!g) {
      return 'Game over';
    }
    const reason = this.lastEndReason ?? '';
    const my = this.session?.myColor;
    const won = g.winner === my;
    const lost = g.winner && g.winner !== my;

    if (reason === 'disconnect') {
      if (g.winner === my) {
        return 'You win — opponent disconnected';
      }
      return 'You lost — connection forfeited';
    }
    if (reason === 'resign') {
      if (lost) {
        return 'You resigned';
      }
      if (won) {
        return 'Opponent resigned — you win';
      }
    }
    if (reason === 'draw' || (!g.winner && g.status === 'finished')) {
      return 'Draw';
    }
    if (g.winner && this.chessStatus?.isCheckmate) {
      return won ? 'Checkmate — you won' : 'Checkmate — you lost';
    }
    if (this.chessStatus?.isStalemate) {
      return 'Draw by stalemate';
    }
    return g.winner
      ? won
        ? 'You won'
        : 'You lost'
      : 'Game over';
  }

  get endDetail(): string {
    const g = this.session?.game;
    if (!g?.winner && g?.status === 'finished') {
      return 'Neither player wins — ELO updated as a draw.';
    }
    if (g?.winner && this.session) {
      return `Winner: ${g.winner} pieces.`;
    }
    return '';
  }

  async onBoardMove(ev: ChessMoveEvent): Promise<void> {
    if (!this.session || this.boardDisabled) {
      return;
    }
    const fenBefore = this.session.game.fen;
    // Soft lock only — no full-board spinner (that looked like a page refresh vs AI).
    this.moveInFlight = true;
    try {
      const updated = await this.gamePlay.makeMove(
        this.gameId,
        ev.from,
        ev.to,
        ev.promotion as 'q' | 'r' | 'b' | 'n' | undefined
      );
      this.patchGame(updated);
      this.clearMoveSuggestions();
      await this.refreshAuxiliaryState();
      void this.sounds.playAfterHalfMove(
        fenBefore,
        ev.from,
        ev.to,
        ev.promotion,
        this.chessStatus
      );
      this.opponentAway = false;
    } catch {
      this.chessBoard?.setPosition(fenBefore);
    } finally {
      this.moveInFlight = false;
    }
  }

  async onSuggestBestMove(): Promise<void> {
    if (!this.session || this.replayMode || !this.myTurn || this.gameOver) {
      return;
    }
    this.suggestBusy = true;
    this.suggestError = '';
    try {
      const res = await firstValueFrom(
        this.aiSuggest.predictMove(this.session.game.fen, 3)
      );
      this.moveSuggestions = res.suggestions ?? [];
      if (this.moveSuggestions.length === 0) {
        this.suggestError = 'No legal moves to rank.';
        this.chessBoard?.clearCustomHighlights();
        return;
      }
      this.applySuggestionHighlight(this.moveSuggestions[0]!);
    } catch {
      this.suggestError = 'Could not get suggestions.';
      this.moveSuggestions = [];
      this.chessBoard?.clearCustomHighlights();
    } finally {
      this.suggestBusy = false;
    }
  }

  selectSuggestion(s: MoveSuggestion): void {
    this.applySuggestionHighlight(s);
  }

  private applySuggestionHighlight(s: MoveSuggestion): void {
    const b = this.chessBoard;
    if (!b) {
      return;
    }
    b.clearCustomHighlights();
    b.highlightSquare(s.from, 'rgba(56, 189, 248, 0.55)');
    b.highlightSquare(s.to, 'rgba(52, 211, 153, 0.55)');
  }

  private clearMoveSuggestions(): void {
    this.moveSuggestions = [];
    this.suggestError = '';
    this.chessBoard?.clearCustomHighlights();
  }

  async onOfferDraw(): Promise<void> {
    if (this.gameOver) {
      return;
    }
    this.drawBusy = true;
    this.drawBanner = '';
    try {
      await this.gamePlay.offerDraw(this.gameId);
      this.drawBanner = 'Draw offer sent — waiting for response.';
    } catch {
      this.drawBanner = 'Could not send draw offer.';
    } finally {
      this.drawBusy = false;
    }
  }

  async onAcceptDraw(): Promise<void> {
    this.drawBusy = true;
    try {
      const g = await this.gamePlay.acceptDraw(this.gameId);
      this.patchGame(g);
      this.incomingDraw = false;
      this.drawBanner = '';
      this.gameOver = true;
      this.lastEndReason = 'draw';
      await this.refreshAuxiliaryState();
      void this.sounds.playGameEnd();
    } catch {
      this.drawBanner = 'Could not accept draw.';
    } finally {
      this.drawBusy = false;
    }
  }

  async onDeclineDraw(): Promise<void> {
    this.drawBusy = true;
    try {
      await this.gamePlay.declineDraw(this.gameId);
      this.incomingDraw = false;
    } catch {
      /* ignore */
    } finally {
      this.drawBusy = false;
    }
  }

  async onResign(): Promise<void> {
    if (this.gameOver) {
      return;
    }
    this.resignBusy = true;
    try {
      const g = await firstValueFrom(this.gamePlay.resignGame(this.gameId));
      if (g) {
        this.patchGame(g);
        this.gameOver = true;
        this.lastEndReason = 'resign';
        await this.refreshAuxiliaryState();
        void this.sounds.playGameEnd();
      }
    } catch {
      /* game:end may still arrive */
    } finally {
      this.resignBusy = false;
    }
  }

  private async bootstrapReplay(): Promise<void> {
    this.connecting = true;
    this.loadError = '';
    try {
      const session = await firstValueFrom(
        this.gamePlay.getSession(this.gameId)
      );
      this.session = session;
      await this.refreshAuxiliaryState();
      if (this.session.game.status === 'finished') {
        this.gameOver = true;
      }
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : 'Could not open this game.';
      if (/not found|forbidden/i.test(msg)) {
        await this.router.navigate(['/lobby']);
        return;
      }
      this.loadError = msg;
    } finally {
      this.connecting = false;
    }
  }

  private async bootstrap(): Promise<void> {
    this.connecting = true;
    this.loadError = '';
    try {
      const joined = await this.gamePlay.joinGame(this.gameId);
      this.session = joined;
      if (joined.game.status === 'finished') {
        this.gameOver = true;
        this.maybeOfferSkillEstimate();
      }
      await this.refreshAuxiliaryState();
      this.attachSocketListeners();
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : 'Could not open this game.';
      if (/not found|forbidden/i.test(msg)) {
        await this.router.navigate(['/lobby']);
        return;
      }
      this.loadError = msg;
    } finally {
      this.connecting = false;
    }
  }

  private async refreshAuxiliaryState(): Promise<void> {
    try {
      const { hist, st } = await firstValueFrom(
        forkJoin({
          hist: this.gamePlay.getMoveHistory(this.gameId),
          st: this.gamePlay.getChessStatus(this.gameId),
        })
      );
      this.moves = hist.moves ?? [];
      this.chessStatus = st;
      if (st.isGameOver) {
        this.gameOver = true;
      }
      // Suggestions are on-demand only (auto-analyze after every bot reply felt like a refresh).
    } catch {
      /* non-fatal */
    }
  }

  private patchGame(g: GameResponse): void {
    if (!this.session) {
      return;
    }
    const prevStatus = this.session.game.status;
    this.session = { ...this.session, game: g };
    if (g.status === 'finished') {
      this.gameOver = true;
      if (prevStatus !== 'finished') {
        this.maybeOfferSkillEstimate();
      }
    }
  }

  closeSkillModal(): void {
    this.skillModalOpen = false;
    this.skillModalLoading = false;
    this.skillModalError = '';
    this.skillModalResult = null;
  }

  openSkillEstimateAgain(): void {
    if (!this.gameId || this.replayMode) {
      return;
    }
    this.skillModalOpen = true;
    this.skillModalLoading = true;
    this.skillModalError = '';
    this.skillModalResult = null;
    void this.loadSkillEstimate(this.gameId);
  }

  private maybeOfferSkillEstimate(): void {
    if (this.replayMode || !this.gameId) {
      return;
    }
    const key = `skill-estimate:${this.gameId}`;
    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(key)) {
      return;
    }
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(key, '1');
    }
    this.skillModalOpen = true;
    this.skillModalLoading = true;
    this.skillModalError = '';
    this.skillModalResult = null;
    void this.loadSkillEstimate(this.gameId);
  }

  private async loadSkillEstimate(gameId: string): Promise<void> {
    try {
      const res = await firstValueFrom(
        this.aiSuggest.estimateSkill({ gameId })
      );
      this.skillModalResult = res;
    } catch {
      this.skillModalError = 'Could not analyze this game.';
    } finally {
      this.skillModalLoading = false;
    }
  }

  private handleRemoteMove(payload: GameMovedPayload): void {
    if (payload.gameId !== this.gameId || !this.session) {
      return;
    }
    const fenBefore = this.session.game.fen;
    this.patchGame(payload.game);
    void this.refreshAuxiliaryState().then(() => {
      void this.sounds.playAfterHalfMove(
        fenBefore,
        payload.from,
        payload.to,
        payload.promotion,
        this.chessStatus
      );
    });
    this.chessBoard?.setPosition(payload.game.fen);
    this.opponentAway = false;
    if (payload.game.status === 'finished') {
      this.gameOver = true;
    }
  }

  private handleGameEnd(payload: GameEndPayload): void {
    if (!payload.game || payload.game.id !== this.gameId) {
      return;
    }
    this.lastEndReason = payload.reason;
    const wasFinished = this.session?.game.status === 'finished';
    this.patchGame(payload.game);
    this.gameOver = true;
    this.incomingDraw = false;
    this.drawBanner = '';
    void this.refreshAuxiliaryState();
    if (!wasFinished && payload.game.status === 'finished') {
      void this.sounds.playGameEnd();
    }
  }

  private handleGameState(payload: GameResponse): void {
    if (payload.id !== this.gameId || !this.session) {
      return;
    }
    const fenBefore = this.session.game.fen;
    const fenChanged = fenBefore !== payload.fen;
    const wasFinished = this.session.game.status === 'finished';
    this.patchGame(payload);
    this.clearMoveSuggestions();
    void this.refreshAuxiliaryState().then(() => {
      if (fenChanged && !this.replayMode) {
        void this.sounds.playGenericMove();
        if (
          this.chessStatus &&
          !this.chessStatus.isGameOver &&
          this.chessStatus.inCheck
        ) {
          void this.sounds.playCheck();
        }
      }
      if (
        !this.replayMode &&
        payload.status === 'finished' &&
        !wasFinished &&
        !fenChanged
      ) {
        void this.sounds.playGameEnd();
      }
    });
    this.chessBoard?.setPosition(payload.fen);
  }

  private handleOpponentAway(payload: OpponentAwayPayload): void {
    if (
      payload.gameId !== this.gameId ||
      !this.session ||
      payload.userId === this.session.self.id
    ) {
      return;
    }
    this.opponentAway = true;
    this.graceSeconds = Math.ceil((payload.graceMs ?? 8000) / 1000);
  }

  private handleDrawOffered(payload: { fromUserId: string }): void {
    if (!this.session || payload.fromUserId !== this.session.opponent.id) {
      return;
    }
    this.incomingDraw = true;
    this.drawBanner = '';
  }

  private handleDrawDeclined(): void {
    this.incomingDraw = false;
    this.drawBanner = 'Opponent declined the draw offer.';
  }

  private attachSocketListeners(): void {
    const socket = this.sockets.connect();
    socket.on('game:moved', this.onMoved);
    socket.on('move-made', this.onMoved as (p: GameMovedPayload) => void);
    socket.on('game:end', this.onEnded);
    socket.on('game-end', this.onEnded);
    socket.on('game:state', this.onState);
    socket.on('game:opponent-away', this.onOpponentAway);
    socket.on('draw:offered', this.onDrawOffered);
    socket.on('draw:declined', this.onDrawDeclined);
    socket.on('connect', this.onSocketConnect);
  }

  private detachSocketListeners(): void {
    const socket = this.sockets.getSocket();
    if (!socket) {
      return;
    }
    socket.off('game:moved', this.onMoved);
    socket.off('move-made', this.onMoved as (p: GameMovedPayload) => void);
    socket.off('game:end', this.onEnded);
    socket.off('game-end', this.onEnded);
    socket.off('game:state', this.onState);
    socket.off('game:opponent-away', this.onOpponentAway);
    socket.off('draw:offered', this.onDrawOffered);
    socket.off('draw:declined', this.onDrawDeclined);
    socket.off('connect', this.onSocketConnect);
  }

  private async onReconnect(): Promise<void> {
    if (this.destroyed || !this.gameId) {
      return;
    }
    try {
      const joined = await this.gamePlay.joinGame(this.gameId);
      this.session = joined;
      await this.refreshAuxiliaryState();
      this.chessBoard?.setPosition(joined.game.fen);
      this.opponentAway = false;
    } catch {
      /* ignore */
    }
  }
}
