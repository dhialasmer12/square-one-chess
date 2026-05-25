import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../services/auth.service';

/** Redirects to `/dashboard` when the user is already signed in (login/register). */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.hasSession().pipe(
    map((ok) => {
      if (ok) {
        return router.createUrlTree(['/dashboard']);
      }
      return true;
    })
  );
};
