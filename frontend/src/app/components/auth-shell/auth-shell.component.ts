import { Component } from '@angular/core';

@Component({
  selector: 'app-auth-shell',
  standalone: true,
  template: `
    <div
      class="relative min-h-screen flex items-center justify-center px-4 py-12 overflow-hidden"
    >
      <div class="absolute inset-0 bg-gradient-to-b from-zinc-950 via-board-frame to-zinc-950"></div>
      <div
        class="absolute inset-0 opacity-[0.12] bg-[length:32px_32px]"
        style="background-image: linear-gradient(45deg, #3f3a32 25%, transparent 25%), linear-gradient(-45deg, #3f3a32 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #3f3a32 75%), linear-gradient(-45deg, transparent 75%, #3f3a32 75%); background-position: 0 0, 0 16px, 16px -16px, -16px 0px;"
      ></div>
      <div
        class="pointer-events-none absolute -top-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-amber-600/10 blur-3xl"
      ></div>
      <div class="relative z-10 w-full max-w-md">
        <div
          class="mb-8 text-center font-display text-3xl font-semibold tracking-tight text-board-light drop-shadow-sm"
        >
          ♔ Square One
        </div>
        <div
          class="rounded-2xl border-2 border-board-light/25 bg-zinc-900/85 p-8 shadow-2xl shadow-black/50 backdrop-blur-md ring-1 ring-white/5"
        >
          <ng-content />
        </div>
        <p class="mt-6 text-center text-xs text-zinc-500">
          University chess & learning platform
        </p>
      </div>
    </div>
  `,
})
export class AuthShellComponent {}
