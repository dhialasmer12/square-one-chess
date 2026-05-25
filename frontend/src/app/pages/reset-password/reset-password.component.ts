import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthShellComponent } from '../../components/auth-shell/auth-shell.component';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, AuthShellComponent],
  template: `
    <app-auth-shell>
      <h1 class="font-display text-2xl font-semibold text-board-light">
        Reset password
      </h1>
      <p class="mt-1 text-sm text-zinc-400">
        Choose a new password for your account.
      </p>

      @if (infoMsg) {
        <div
          class="mt-6 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100"
        >
          {{ infoMsg }}
        </div>
      }
      @if (errorMsg) {
        <div
          class="mt-6 rounded-lg border border-red-500/40 bg-red-950/50 px-3 py-2 text-sm text-red-200"
        >
          {{ errorMsg }}
        </div>
      }

      <form class="mt-8 space-y-5" (ngSubmit)="submit()" [formGroup]="form">
        <div>
          <label
            for="password"
            class="block text-sm font-medium text-zinc-300"
            >New password</label
          >
          <input
            id="password"
            type="password"
            formControlName="newPassword"
            autocomplete="new-password"
            class="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800/80 px-3 py-2.5 text-zinc-100 outline-none ring-amber-600/0 transition focus:border-amber-600/50 focus:ring-2 focus:ring-amber-600/30"
          />
          @if (
            form.controls.newPassword.touched && form.controls.newPassword.invalid
          ) {
            <p class="mt-1 text-xs text-red-400">Min. 6 characters</p>
          }
        </div>

        <button
          type="submit"
          [disabled]="loading || form.invalid || !token"
          class="flex w-full items-center justify-center rounded-lg bg-amber-600 px-4 py-3 text-sm font-semibold text-zinc-950 shadow-lg shadow-amber-900/20 transition hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          @if (loading) { <span>Updating…</span> } @else { <span>Update password</span> }
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
export class ResetPasswordComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  token = '';
  loading = false;
  infoMsg = '';
  errorMsg = '';

  readonly form = this.fb.nonNullable.group({
    newPassword: ['', [Validators.required, Validators.minLength(6)]],
  });

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';
    if (!this.token) {
      this.errorMsg = 'Missing token. Please open the reset link from your email again.';
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (!this.token) {
      this.errorMsg = 'Missing token.';
      return;
    }
    this.loading = true;
    this.infoMsg = '';
    this.errorMsg = '';
    const newPassword = this.form.getRawValue().newPassword;
    this.auth.resetPassword(this.token, newPassword).subscribe({
      next: () => {
        this.loading = false;
        this.infoMsg = 'Password updated. Redirecting to sign in…';
        setTimeout(() => void this.router.navigate(['/login']), 900);
      },
      error: (err: { error?: { error?: string } }) => {
        this.loading = false;
        this.errorMsg = err.error?.error ?? 'Reset link invalid or expired.';
      },
    });
  }
}

