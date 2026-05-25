import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-queue-status',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="rounded-2xl border border-amber-500/25 bg-zinc-900/70 p-6 shadow-lg ring-1 ring-white/5 backdrop-blur-sm"
    >
      @if (inQueue) {
        <div class="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
          <div
            class="relative h-14 w-14 shrink-0"
            aria-hidden="true"
          >
            <div
              class="absolute inset-0 rounded-full border-2 border-amber-400/25"
            ></div>
            <div
              class="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-amber-400"
            ></div>
            <span
              class="absolute inset-0 flex items-center justify-center text-lg text-amber-300"
              >♟</span
            >
          </div>
          <div class="min-w-0 flex-1 space-y-1">
            <p class="font-display text-lg font-semibold text-amber-100">
              In queue…
            </p>
            <p class="text-sm text-zinc-400">
              Finding a fair match (±100 ELO). Active players in queue:
              <span class="font-medium text-zinc-200">{{ queueSize }}</span>
            </p>
            @if (position != null) {
              <p class="text-xs text-zinc-500">
                Your position: <span class="text-zinc-300">#{{ position }}</span>
              </p>
            }
            @if (estimatedLabel) {
              <p class="text-xs text-zinc-500">
                Est. wait: {{ estimatedLabel }}
              </p>
            }
            @if (clockSummary) {
              <p class="text-xs text-zinc-500">
                Time control:
                <span class="font-medium text-zinc-300">{{ clockSummary }}</span>
              </p>
            }
          </div>
          <button
            type="button"
            (click)="cancel.emit()"
            [disabled]="cancelDisabled"
            class="shrink-0 rounded-xl border border-zinc-600 bg-zinc-800 px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Cancel
          </button>
        </div>
      } @else {
        <div class="text-center sm:text-left">
          <p class="text-sm font-semibold text-emerald-400/90">Find match</p>
          <p class="mt-1 text-sm text-zinc-500">
            {{ idleMessage }}
          </p>
          <p class="mt-2 text-xs text-zinc-600">
            Players searching now:
            <span class="text-zinc-400">{{ queueSize }}</span>
          </p>
          @if (clockSummary) {
            <p class="mt-2 text-xs text-zinc-600">
              Your clock:
              <span class="font-medium text-zinc-400">{{ clockSummary }}</span>
            </p>
          }
        </div>
      }
    </div>
  `,
})
export class QueueStatusComponent {
  @Input() inQueue = false;
  @Input() queueSize = 0;
  @Input() position: number | null = null;
  @Input() estimatedLabel = '';
  @Input() cancelDisabled = false;
  @Input() idleMessage =
    'Pick a clock above, then play — we pair you with someone near your rating (±100 ELO) on the same time.';
  /** Shown while in queue, e.g. "10 min · 0 sec inc". */
  @Input() clockSummary = '';

  @Output() cancel = new EventEmitter<void>();
}
