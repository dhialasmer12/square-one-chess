import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthShellComponent } from '../../components/auth-shell/auth-shell.component';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-check-email',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, AuthShellComponent],
  template: `
    <app-auth-shell>
      <h1 class="font-display text-2xl font-semibold text-board-light">
        Verify your email
      </h1>
      <p class="mt-1 text-sm text-zinc-400">
        We sent a verification link to your inbox. In local dev without SMTP,
        check the <strong class="text-zinc-300">backend terminal</strong> for a
        <code class="text-amber-400">[mail:log]</code> line with the link.
      </p>

      <form class="mt-6 space-y-4" (ngSubmit)="resend()" [formGroup]="form">
        <div>
          <label for="email" class="block text-sm font-medium text-zinc-300"
            >Your email</label
          >
          <input
            id="email"
            type="email"
            formControlName="email"
            class="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800/80 px-3 py-2.5 text-zinc-100 outline-none focus:border-amber-600/50 focus:ring-2 focus:ring-amber-600/30"
            placeholder="you@university.edu"
          />
        </div>

        @if (infoMsg) {
          <div
            class="rounded-lg border border-amber-500/30 bg-amber-950/30 px-3 py-2 text-sm text-amber-100"
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

        <button
          type="submit"
          [disabled]="loading || form.invalid"
          class="flex w-full items-center justify-center rounded-lg bg-amber-600 px-4 py-3 text-sm font-semibold text-zinc-950 hover:bg-amber-500 disabled:opacity-50"
        >
          @if (loading) {
            <span>Sending…</span>
          } @else {
            <span>Resend verification email</span>
          }
        </button>
      </form>

      <div class="mt-8">
        <a
          routerLink="/login"
          class="block rounded-lg border border-zinc-700 bg-zinc-900/60 px-4 py-3 text-center text-sm font-medium text-zinc-200 hover:bg-zinc-800/60"
        >
          Back to sign in
        </a>
      </div>
    </app-auth-shell>
  `,
})
export class CheckEmailComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);

  loading = false;
  infoMsg = '';
  errorMsg = '';

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  ngOnInit(): void {
    const email = this.route.snapshot.queryParamMap.get('email');
    if (email) {
      this.form.controls.email.setValue(email);
    }
  }

  resend(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading = true;
    this.infoMsg = '';
    this.errorMsg = '';
    const email = this.form.controls.email.value;
    this.auth.resendVerificationEmail(email).subscribe({
      next: (res) => {
        this.loading = false;
        this.infoMsg = res.delivered
          ? 'Sent. Check your inbox (and spam folder).'
          : 'Link logged on the server console ([mail:log]). Copy it into your browser.';
      },
      error: (err: { error?: { error?: string } }) => {
        this.loading = false;
        this.errorMsg = err.error?.error ?? 'Could not resend. Try again.';
      },
    });
  }
}
