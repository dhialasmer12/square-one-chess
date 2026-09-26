# Frontend pages (`frontend/src/app/pages/`)

Each page is a standalone component. `.ts` = logic, `.html` = markup, `.scss` = styles. If a `.html` / `.scss` is missing, the template/styles are inline in the `.ts`.

---

## Auth pages

### `login/login.component.ts`

Form: identifier + password → `AuthService.login` → `POST /api/auth/login` → then `GET /me`. On success navigate `/dashboard`. Shows API errors.

### `register/register.component.ts`

Form: username, email, password → `POST /api/auth/register`. If `emailVerificationRequired` → `/check-email`, else dashboard.

### `forgot-password/forgot-password.component.ts`

Asks email → `POST /api/auth/forgot-password`. Always a generic “check your mail” style response.

### `reset-password/reset-password.component.ts`

Reads token from URL → new password → `POST /api/auth/reset-password`.

### `check-email/check-email.component.ts`

Waiting screen after register: “we sent a mail”, resend button.

### `verify-email/verify-email.component.ts`

Opens the link from the mailbox (`GET /api/auth/verify-email?token=`).

---

## `home/home.component.ts`

Old landing page. Routes no longer use it (`''` → dashboard). File may still exist unused.

---

## `dashboard/dashboard-page.component.ts` (+ html/scss)

After login. Player: personal stats, recent games, leaderboard preview. If admin: analytics charts (`analytics-dashboard/*`). Calls stats + analytics services.

---

## `lobby/lobby-page.component.ts` (+ html/scss)

Choose time control, join queue, play vs bot (open seat). Uses `MatchmakingService` / `QueueService` / `LobbyDataService`. On `match:found` navigates `/game/:id`.

---

## `game/game-page.component.ts` (+ html)

Live board: `ChessBoardComponent`, clocks, resign/draw, `GameChatComponent`. `GamePlayService` listens to `game:moved` / `game:end`. Plays sounds via `GameSoundService`.

---

## `game-history/game-history-page.component.ts` (+ html/scss)

Table of finished games (`GameHistoryService`). Links to replay and review.

---

## `replay/replay-page.component.ts`

Loads one game + moves; embeds `ReplayModeComponent` (step forward/back).

---

## `game-review/game-review-page.component.ts` (+ html/scss)

Calls AI `getGameReview` for `/review/:id`: move list with quality labels, optional lessons.

---

## `puzzle/puzzle-page.component.ts` (+ html/scss)

Trainer: load daily/random, theme filter, board, submit ply, show opponent auto-reply, hint, “solved”. Uses `PuzzleService` (`lineIndex` state).

---

## `profile/profile-page.component.ts` (+ html/scss)

Shows `UserProfileCard`, Elo, history snippet, `EditProfileModal`. `ProfileService`.

---

## `leaderboard/leaderboard-page.component.ts` (+ html)

Full ranking table (`LeaderboardService`), period filters.

---

## `tournaments/tournament-page.component.ts` (+ html/scss)

List events, create, join, bracket, tournament messages (`TournamentApiService`).
