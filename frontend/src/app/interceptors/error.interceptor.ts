import {
  HttpInterceptorFn,
  HttpErrorResponse,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

function isPublicAuthRequest(url: string): boolean {
  return (
    url.includes('/api/auth/login') ||
    url.includes('/api/auth/register') ||
    // `/me` is used by guards to detect a session; it will 401 when logged out.
    // Treat it as "public" so we don't force a logout redirect loop.
    url.includes('/api/auth/me') ||
    url.includes('/api/auth/logout') ||
    url.includes('/api/auth/resend-verification') ||
    url.includes('/api/auth/verify-email')
  );
}

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401 && !isPublicAuthRequest(req.url)) {
        auth.logout();
      }
      return throwError(() => err);
    })
  );
};
