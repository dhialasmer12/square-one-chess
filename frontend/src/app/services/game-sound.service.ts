import { Injectable } from '@angular/core';
import { Chess } from 'chess.js';
import type { ChessStatusPayload } from '../models';

export type MoveSoundKind = 'move' | 'capture' | 'castle' | 'promote';

/**
 * Lightweight chess move / game feedback using the Web Audio API (no sound files).
 * Browsers may start AudioContext suspended until a user gesture; `resume()` runs on each play.
 */
@Injectable({ providedIn: 'root' })
export class GameSoundService {
  private ctx: AudioContext | null = null;
  /** Avoid double end chord when both `game:moved` and `game:end` fire. */
  private lastGameEndAt = 0;

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') {
      return null;
    }
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) {
      return null;
    }
    if (!this.ctx) {
      this.ctx = new AC();
    }
    return this.ctx;
  }

  private async ensureRunning(): Promise<AudioContext | null> {
    const ctx = this.getAudioContext();
    if (!ctx) {
      return null;
    }
    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch {
        return null;
      }
    }
    return ctx;
  }

  private beep(
    ctx: AudioContext,
    freq: number,
    duration: number,
    type: OscillatorType = 'sine',
    peak = 0.12
  ): void {
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(peak, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }

  /** Classify last move from position before the move was applied. */
  classifyMove(
    fenBefore: string,
    from: string,
    to: string,
    promotion?: string
  ): MoveSoundKind {
    try {
      const g = new Chess(fenBefore);
      const m = g.move({
        from,
        to,
        promotion: promotion as 'q' | 'r' | 'b' | 'n' | undefined,
      });
      if (!m) {
        return 'move';
      }
      const flags = m.flags ?? '';
      if (flags.includes('k') || flags.includes('q')) {
        return 'castle';
      }
      if (m.promotion) {
        return 'promote';
      }
      if (m.captured) {
        return 'capture';
      }
      return 'move';
    } catch {
      return 'move';
    }
  }

  async playMoveKind(kind: MoveSoundKind): Promise<void> {
    const ctx = await this.ensureRunning();
    if (!ctx) {
      return;
    }
    switch (kind) {
      case 'capture':
        this.beep(ctx, 180, 0.07, 'triangle', 0.14);
        setTimeout(() => this.beep(ctx, 120, 0.09, 'triangle', 0.1), 45);
        break;
      case 'castle':
        this.beep(ctx, 320, 0.05, 'sine', 0.1);
        setTimeout(() => this.beep(ctx, 400, 0.06, 'sine', 0.09), 55);
        break;
      case 'promote':
        this.beep(ctx, 520, 0.06, 'square', 0.11);
        setTimeout(() => this.beep(ctx, 660, 0.08, 'square', 0.09), 60);
        break;
      default:
        this.beep(ctx, 440, 0.06, 'sine', 0.11);
    }
  }

  async playCheck(): Promise<void> {
    const ctx = await this.ensureRunning();
    if (!ctx) {
      return;
    }
    this.beep(ctx, 880, 0.05, 'sine', 0.13);
    setTimeout(() => this.beep(ctx, 740, 0.07, 'sine', 0.1), 70);
  }

  async playGameEnd(): Promise<void> {
    const now = Date.now();
    if (now - this.lastGameEndAt < 450) {
      return;
    }
    this.lastGameEndAt = now;
    const ctx = await this.ensureRunning();
    if (!ctx) {
      return;
    }
    this.beep(ctx, 392, 0.12, 'sine', 0.1);
    setTimeout(() => this.beep(ctx, 523, 0.14, 'sine', 0.11), 110);
    setTimeout(() => this.beep(ctx, 659, 0.2, 'sine', 0.12), 240);
  }

  /**
   * After a half-move: piece sound, then check if applicable (not on mate — end chord handled separately).
   */
  async playAfterHalfMove(
    fenBefore: string,
    from: string,
    to: string,
    promotion: string | undefined,
    status: ChessStatusPayload | null
  ): Promise<void> {
    const kind = this.classifyMove(fenBefore, from, to, promotion);
    await this.playMoveKind(kind);
    if (!status) {
      return;
    }
    if (status.isGameOver) {
      await this.playGameEnd();
      return;
    }
    if (status.inCheck) {
      await this.playCheck();
    }
  }

  /** State-only sync (e.g. reconnect) when we don't have from/to. */
  async playGenericMove(): Promise<void> {
    await this.playMoveKind('move');
  }
}
