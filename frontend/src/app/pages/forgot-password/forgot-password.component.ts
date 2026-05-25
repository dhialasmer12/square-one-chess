import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthShellComponent } from '../../components/auth-shell/auth-shell.component';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, AuthShellComponent],
  template: `
    <app-auth-shell>
      <h1 class="font-display text-2xl font-semibold text-board-light">
        Forgot password
      </h1>
      <p class="mt-1 text-sm text-zinc-400">
        Enter your email and we’ll send you a reset link.
      </p>

      <form class="mt-8 space-y-5" (ngSubmit)="submit()" [formGroup]="form">
        @if (infoMsg) {
          <div
            class="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100"
          >
            {{ infoMsg }}
          </div>
        }
        @if (errorMsg) {
          <div
            class="rounded-lg border border-red-500/40 bg-red-950/50 px-3 py-2 text-sm text-red-200"
          >
            {{ errorMsg }}
          </div>
        }

        <div>
          <label for="email" class="block text-sm font-medium text-zinc-300"
            >Email</label
          >
          <input
            id="email"
            type="email"
            formControlName="email"
            autocomplete="email"
            class="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800/80 px-3 py-2.5 text-zinc-100 placeholder-zinc-500 outline-none ring-amber-600/0 transition focus:border-amber-600/50 focus:ring-2 focus:ring-amber-600/30"
            placeholder="you@university.edu"
          />
          @if (form.controls.email.touched && form.controls.email.invalid) {
            <p class="mt-1 text-xs text-red-400">Valid email required</p>
          }
        </div>

        <button
          type="submit"
          [disabled]="loading || form.invalid"
          class="flex w-full items-center justify-center rounded-lg bg-amber-600 px-4 py-3 text-sm font-semibold text-zinc-950 shadow-lg shadow-amber-900/20 transition hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          @if (loading) { <span>Sending…</span> } @else { <span>Send reset link</span> }
        </button>
      </form>

      <p class="mt-6 text-center text-sm text-zinc-400">
        <a
          routerLink="/login"
          class="font-medium text-amber-500 hover:text-amber-400"
          >Back to sign in</a
        >
      </p>
    </app-auth-shell>
  `,
})
export class ForgotPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  loading = false;
  infoMsg = '';
  errorMsg = '';

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading = true;
    this.infoMsg = '';
    this.errorMsg = '';
    const email = this.form.getRawValue().email;
    this.auth.forgotPassword(email).subscribe({
      next: () => {
        this.loading = false;
        // Always same message to avoid account enumeration.
        this.infoMsg = 'If this email exists, a reset link has been sent.';
      },
      error: () => {
        this.loading = false;
        this.errorMsg = 'Could not send reset email. Try again later.';
      },
    });
  }
}

