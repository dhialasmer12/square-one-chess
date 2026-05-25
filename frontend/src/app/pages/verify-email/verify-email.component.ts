import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthShellComponent } from '../../components/auth-shell/auth-shell.component';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [CommonModule, RouterLink, AuthShellComponent],
  template: `
    <app-auth-shell>
      <h1 class="font-display text-2xl font-semibold text-board-light">
        Email verification
      </h1>
      <p class="mt-1 text-sm text-zinc-400">
        @if (status === 'loading') {
          Verifying your email…
        } @else if (status === 'success') {
          Your email is verified. You can sign in now.
        } @else {
          Verification link is invalid or expired.
        }
      </p>

      @if (status === 'error') {
        <div
          class="mt-6 rounded-lg border border-red-500/40 bg-red-950/50 px-3 py-2 text-sm text-red-200"
        >
          {{ errorMsg || 'Could not verify email.' }}
        </div>
      }

      <div class="mt-8 flex flex-col gap-2">
        <a
          routerLink="/login"
          class="rounded-lg bg-amber-600 px-4 py-3 text-center text-sm font-semibold text-zinc-950 hover:bg-amber-500"
        >
          Go to sign in
        </a>
        <a
          routerLink="/check-email"
          class="rounded-lg border border-zinc-700 bg-zinc-900/60 px-4 py-3 text-center text-sm font-medium text-zinc-200 hover:bg-zinc-800/60"
        >
          Resend verification email
        </a>
      </div>
    </app-auth-shell>
  `,
})
export class VerifyEmailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);

  status: 'loading' | 'success' | 'error' = 'loading';
  errorMsg = '';

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token') ?? '';
    if (!token) {
      this.status = 'error';
      this.errorMsg = 'Missing token.';
      return;
    }
    this.auth.verifyEmail(token).subscribe({
      next: () => (this.status = 'success'),
      error: (err: { error?: { error?: string } }) => {
        this.status = 'error';
        this.errorMsg = err.error?.error ?? 'Invalid or expired token.';
      },
    });
  }
}

