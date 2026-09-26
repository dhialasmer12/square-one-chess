# Frontend core (bootstrap, routing, guards, interceptors)

Angular 17 **standalone** app in `frontend/`. Dev server: port **4200**, proxy `frontend/proxy.conf.json` forwards `/api` and `/socket.io` to `:3000`.

---

## `frontend/src/main.ts`

Starts the app: `bootstrapApplication(AppComponent, appConfig)`. If bootstrap fails, logs the error. There is no `NgModule` root.

---

## `frontend/src/index.html`

The HTML shell: `<app-root></app-root>`, title, fonts. Angular injects the SPA here.

---

## `frontend/src/app/app.config.ts`

Providers:

- `provideRouter(routes)` from `app.routes.ts`
- `provideHttpClient(withInterceptors([authInterceptor, errorInterceptor]))`

---

## `frontend/src/app/app.component.ts`

Root component. Template is only:

```html
<router-outlet /><app-chat-sidebar />
```

So **every** page shows the chat/friends button (if logged in). `title = 'Square One'`.

---

## `frontend/src/app/app.component.spec.ts`

Default Angular unit test for AppComponent. Not used in the live demo.

---

## `frontend/src/app/app.routes.ts`

URL table. `''` redirects to `dashboard`. Unknown paths (`**`) also go to dashboard.

| Path | Guard | Page |
|------|-------|------|
| `login` | guestGuard | LoginComponent |
| `register` | guestGuard | RegisterComponent |
| `forgot-password` | — | ForgotPasswordComponent |
| `reset-password` | — | ResetPasswordComponent |
| `check-email` | — | CheckEmailComponent |
| `verify-email` | — | VerifyEmailComponent |
| `lobby` | authGuard | LobbyPageComponent |
| `tournaments` | authGuard | TournamentPageComponent |
| `dashboard` | authGuard | DashboardPageComponent |
| `puzzles` | authGuard | PuzzlePageComponent |
| `leaderboard` | authGuard | LeaderboardPageComponent |
| `profile` | authGuard | ProfilePageComponent |
| `history` | authGuard | GameHistoryPageComponent |
| `replay/:gameId` | authGuard | ReplayPageComponent |
| `review/:gameId` | authGuard | GameReviewPageComponent |
| `game/:gameId` | authGuard | GamePageComponent |

Pages are **lazy-loaded** (`loadComponent`).

---

## `frontend/src/app/guards/auth.guard.ts`

If there is no session, redirect to `/login`. Protects lobby, game, puzzles, …

---

## `frontend/src/app/guards/guest.guard.ts`

If already logged in, redirect away from `/login` and `/register` (usually to dashboard).

---

## `frontend/src/app/interceptors/auth.interceptor.ts`

Adds `withCredentials` so the HttpOnly cookie is sent on every `/api` call. May attach Authorization header if a token exists (cookie is the real session).

---

## `frontend/src/app/interceptors/error.interceptor.ts`

On HTTP error, reads `{ error }` from the API and surfaces a message (toast / throw). Avoids silent 401/409.

---

## `frontend/src/environments/environment.ts`

Dev: `API_URL: ''`, `WS_URL: ''` → same origin as :4200 (proxy).

---

## `frontend/src/environments/environment.prod.ts`

Production URLs if the API is on another host (must then be careful with cookies).

---

## `frontend/proxy.conf.json`

`ng serve` proxy: `/api` and `/socket.io` → `http://localhost:3000`. This is why login cookies work.
