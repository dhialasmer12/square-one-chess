import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { AuthShellComponent } from '../../components/auth-shell/auth-shell.component';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    AuthShellComponent,
  ],
  template: `
    <app-auth-shell>
      <h1 class="font-display text-2xl font-semibold text-board-light">
        Join the club
      </h1>
      <p class="mt-1 text-sm text-zinc-400">
        Create your player profile — same account for lessons and games.
      </p>

      <form class="mt-8 space-y-5" (ngSubmit)="submit()" [formGroup]="form">
        @if (errorMsg) {
          <div
            class="rounded-lg border border-red-500/40 bg-red-950/50 px-3 py-2 text-sm text-red-200"
          >
            {{ errorMsg }}
          </div>
        }

        <div>
          <label for="username" class="block text-sm font-medium text-zinc-300"
            >Display name</label
          >
          <input
            id="username"
            type="text"
            formControlName="username"
            autocomplete="nickname"
            class="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800/80 px-3 py-2.5 text-zinc-100 placeholder-zinc-500 outline-none ring-amber-600/0 transition focus:border-amber-600/50 focus:ring-2 focus:ring-amber-600/30"
            placeholder="Your name or handle"
          />
          @if (
            form.controls.username.touched && form.controls.username.invalid
          ) {
            <p class="mt-1 text-xs text-red-400">Name required</p>
          }
        </div>

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

        <div>
          <label
            for="password"
            class="block text-sm font-medium text-zinc-300"
            >Password</label
          >
          <input
            id="password"
            type="password"
            formControlName="password"
            autocomplete="new-password"
            class="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800/80 px-3 py-2.5 text-zinc-100 outline-none ring-amber-600/0 transition focus:border-amber-600/50 focus:ring-2 focus:ring-amber-600/30"
          />
          @if (form.controls.password.touched && form.controls.password.invalid) {
            <p class="mt-1 text-xs text-red-400">Min. 6 characters</p>
          }
        </div>

        <button
          type="submit"
          [disabled]="loading || form.invalid"
          class="flex w-full items-center justify-center rounded-lg bg-amber-600 px-4 py-3 text-sm font-semibold text-zinc-950 shadow-lg shadow-amber-900/20 transition hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          @if (loading) {
            <span>Creating account…</span>
          } @else {
            <span>Start playing</span>
          }
        </button>
      </form>

      <p class="mt-6 text-center text-sm text-zinc-400">
        Already have an account?
        <a
          routerLink="/login"
          class="font-medium text-amber-500 hover:text-amber-400"
          >Sign in</a
        >
      </p>
    </app-auth-shell>
  `,
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  errorMsg = '';
  loading = false;

  readonly form = this.fb.nonNullable.group({
    username: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.loading = true;
    this.errorMsg = '';
    this.auth
      .register({
        email: v.email,
        username: v.username,
        password: v.password,
      })
      .subscribe({
        next: (res) => {
          this.loading = false;
          if (res.emailVerificationRequired) {
            void this.router.navigate(['/check-email'], {
              queryParams: { email: v.email },
            });
          } else {
            void this.router.navigate(['/dashboard']);
          }
        },
        error: (err: { error?: { error?: string } }) => {
          this.loading = false;
          this.errorMsg = err.error?.error ?? 'Unable to register.';
        },
      });
  }
}
