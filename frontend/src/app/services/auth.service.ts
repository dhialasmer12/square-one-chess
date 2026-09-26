import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, catchError, map, of, switchMap } from 'rxjs';
import { environment } from '../../environments/environment';
import type {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  UserProfile,
} from '../models';
import { SocketService } from './socket.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly sockets = inject(SocketService);

  private readonly baseUrl = environment.API_URL;

  /**
   * Cached session flag. HttpOnly cookie can't be read from JS, so this is
   * updated from login/register/me/logout (and hasSession).
   */
  private sessionOk = false;
  private profile: UserProfile | null = null;

  isAuthenticated(): boolean {
    return this.sessionOk;
  }

  isAdmin(): boolean {
    return this.profile?.isAdmin === true;
  }

  currentUser(): UserProfile | null {
    return this.profile;
  }

  /** Session is stored in HttpOnly cookie only (`withCredentials` on all API calls). */
  login(body: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/api/auth/login`, body).pipe(
      // Confirm the HttpOnly cookie actually stuck (avoids “signed in” UI with a dead session).
      switchMap((res) =>
        this.me().pipe(
          map(() => res),
          catchError(() => {
            this.sessionOk = false;
            throw { error: { error: 'Session cookie was blocked. Use the same host for the app (localhost or 127.0.0.1), or refresh and try again.' } };
          })
        )
      )
    );
  }

  register(body: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/api/auth/register`, body).pipe(
      switchMap((res) => {
        if (res.emailVerificationRequired) {
          this.sessionOk = false;
          this.profile = null;
          return of(res);
        }
        return this.me().pipe(
          map(() => res),
          catchError(() => {
            this.sessionOk = false;
            throw { error: { error: 'Account created but session cookie was blocked. Sign in from the same host you use for the app.' } };
          })
        );
      })
    );
  }

  logout(): void {
    this.sessionOk = false;
    this.profile = null;
    this.sockets.disconnect();
    this.http.post(`${this.baseUrl}/api/auth/logout`, {}).subscribe({
      next: () => void this.router.navigate(['/login']),
      error: () => void this.router.navigate(['/login']),
    });
  }

  me(): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.baseUrl}/api/auth/me`).pipe(
      map((profile) => {
        this.sessionOk = true;
        this.profile = profile;
        return profile;
      }),
      catchError((err) => {
        this.sessionOk = false;
        this.profile = null;
        throw err;
      })
    );
  }

  hasSession(): Observable<boolean> {
    return this.me().pipe(
      map(() => true),
      catchError(() => of(false))
    );
  }

  requestEmailVerification(): Observable<{ ok: true }> {
    return this.http.post<{ ok: true }>(
      `${this.baseUrl}/api/auth/request-email-verification`,
      {}
    );
  }

  forgotPassword(email: string): Observable<{ ok: true }> {
    return this.http.post<{ ok: true }>(`${this.baseUrl}/api/auth/forgot-password`, {
      email,
    });
  }

  resetPassword(token: string, newPassword: string): Observable<string> {
    // Backend returns HTML; we treat it as a success marker.
    return this.http.post(`${this.baseUrl}/api/auth/reset-password`, { token, newPassword }, { responseType: 'text' });
  }

  verifyEmail(token: string): Observable<{ ok: true; message: string }> {
    return this.http.get<{ ok: true; message: string }>(
      `${this.baseUrl}/api/auth/verify-email?token=${encodeURIComponent(token)}&format=json`
    );
  }

  resendVerificationEmail(email: string): Observable<{ ok: true; delivered: boolean }> {
    return this.http.post<{ ok: true; delivered: boolean }>(
      `${this.baseUrl}/api/auth/resend-verification`,
      { email }
    );
  }
}
