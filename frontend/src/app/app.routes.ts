import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { guestGuard } from './guards/guest.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./pages/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./pages/forgot-password/forgot-password.component').then(
        (m) => m.ForgotPasswordComponent
      ),
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./pages/reset-password/reset-password.component').then(
        (m) => m.ResetPasswordComponent
      ),
  },
  {
    path: 'check-email',
    loadComponent: () =>
      import('./pages/check-email/check-email.component').then(
        (m) => m.CheckEmailComponent
      ),
  },
  {
    path: 'verify-email',
    loadComponent: () =>
      import('./pages/verify-email/verify-email.component').then(
        (m) => m.VerifyEmailComponent
      ),
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./pages/register/register.component').then(
        (m) => m.RegisterComponent
      ),
  },
  // Home page removed: dashboard is the default landing page now.
  {
    path: 'lobby',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/lobby/lobby-page.component').then((m) => m.LobbyPageComponent),
  },
  {
    path: 'tournaments',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/tournaments/tournament-page.component').then(
        (m) => m.TournamentPageComponent
      ),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/dashboard/dashboard-page.component').then(
        (m) => m.DashboardPageComponent
      ),
  },
  {
    path: 'puzzles',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/puzzle/puzzle-page.component').then(
        (m) => m.PuzzlePageComponent
      ),
  },
  {
    path: 'leaderboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/leaderboard/leaderboard-page.component').then(
        (m) => m.LeaderboardPageComponent
      ),
  },
  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/profile/profile-page.component').then(
        (m) => m.ProfilePageComponent
      ),
  },
  {
    path: 'history',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/game-history/game-history-page.component').then(
        (m) => m.GameHistoryPageComponent
      ),
  },
  {
    path: 'replay/:gameId',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/replay/replay-page.component').then(
        (m) => m.ReplayPageComponent
      ),
  },
  {
    path: 'review/:gameId',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/game-review/game-review-page.component').then(
        (m) => m.GameReviewPageComponent
      ),
  },
  {
    path: 'game/:gameId',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/game/game-page.component').then((m) => m.GamePageComponent),
  },
  { path: '**', redirectTo: 'dashboard' },
];
