import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { UpdateProfileRequest, UserProfileApi } from '../../models/profile.model';
import { ProfileService } from '../../services/profile.service';

@Component({
  selector: 'app-edit-profile-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (open) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-profile-title"
        (click)="onBackdrop($event)"
      >
        <div
          class="w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl ring-1 ring-white/10"
          (click)="$event.stopPropagation()"
        >
          <h2
            id="edit-profile-title"
            class="font-display text-xl font-semibold text-board-light"
          >
            Edit profile
          </h2>
          <form class="mt-4 space-y-4" (ngSubmit)="submit()">
            <div>
              <label class="text-xs font-medium text-zinc-500" for="ep-user"
                >Username</label
              >
              <input
                id="ep-user"
                name="username"
                [(ngModel)]="username"
                class="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
              />
            </div>
            <div>
              <label class="text-xs font-medium text-zinc-500" for="ep-cur"
                >Current password</label
              >
              <input
                id="ep-cur"
                name="cur"
                type="password"
                [(ngModel)]="currentPassword"
                autocomplete="current-password"
                class="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
              />
            </div>
            <div>
              <label class="text-xs font-medium text-zinc-500" for="ep-new"
                >New password</label
              >
              <input
                id="ep-new"
                name="newp"
                type="password"
                [(ngModel)]="newPassword"
                autocomplete="new-password"
                class="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
              />
            </div>
            @if (error) {
              <p class="text-sm text-red-400">{{ error }}</p>
            }
            <div class="flex justify-end gap-2 pt-2">
              <button
                type="button"
                (click)="close()"
                class="rounded-lg border border-zinc-600 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                [disabled]="busy"
                class="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-amber-400 disabled:opacity-50"
              >
                @if (busy) {
                  Saving…
                } @else {
                  Save
                }
              </button>
            </div>
          </form>
        </div>
      </div>
    }
  `,
})
export class EditProfileModalComponent implements OnChanges {
  private readonly profileApi = inject(ProfileService);

  @Input() open = false;
  @Input() initialUsername = '';

  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<UserProfileApi>();

  username = '';
  currentPassword = '';
  newPassword = '';
  error = '';
  busy = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open']?.currentValue || changes['initialUsername']) {
      if (this.open) {
        this.username = this.initialUsername;
        this.currentPassword = '';
        this.newPassword = '';
        this.error = '';
      }
    }
  }

  onBackdrop(ev: MouseEvent): void {
    if (ev.target === ev.currentTarget) {
      this.close();
    }
  }

  close(): void {
    this.closed.emit();
  }

  submit(): void {
    this.error = '';
    const body: UpdateProfileRequest = {};
    if (this.username.trim() && this.username.trim() !== this.initialUsername) {
      body.username = this.username.trim();
    }
    if (this.newPassword) {
      body.newPassword = this.newPassword;
      body.currentPassword = this.currentPassword;
    }
    if (!body.username && !body.newPassword) {
      this.error = 'Change username or set a new password.';
      return;
    }
    if (body.newPassword && !body.currentPassword) {
      this.error = 'Enter your current password to set a new one.';
      return;
    }
    this.busy = true;
    this.profileApi.updateProfile(body).subscribe({
      next: (p) => {
        this.busy = false;
        this.saved.emit(p);
        this.close();
      },
      error: (err: HttpErrorResponse) => {
        this.busy = false;
        const body = err.error as { message?: string } | string | undefined;
        this.error =
          typeof body === 'object' && body?.message
            ? body.message
            : typeof body === 'string'
              ? body
              : err.message || 'Update failed.';
      },
    });
  }
}
