import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../environments/environment';
import type {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  UserProfile,
} from '../models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly baseUrl = environment.API_URL;

  isAuthenticated(): boolean {
    // HttpOnly cookie can't be read from JS.
    // We consider the user authenticated if `/me` succeeds (see authGuard).
    return false;
  }

  /** Session is stored in HttpOnly cookie only (`withCredentials` on all API calls). */
  login(body: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(
      `${this.baseUrl}/api/auth/login`,
      body
    );
  }

  register(body: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(
      `${this.baseUrl}/api/auth/register`,
      body
    );
  }

  logout(): void {
    this.http.post(`${this.baseUrl}/api/auth/logout`, {}).subscribe({
      next: () => void this.router.navigate(['/login']),
      error: () => void this.router.navigate(['/login']),
    });
  }

  me(): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.baseUrl}/api/auth/me`);
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
