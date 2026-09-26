# Backend route files (`src/routes/`)

Each file is an Express `Router`. They **do not** contain business logic: they only bind HTTP method + path → controller. Protected routes add `verifyToken` (JWT cookie or Bearer).

---

## `src/routes/index.ts`

Mounts every sub-router under `/api`:

| Mount | File | Meaning |
|-------|------|---------|
| `/auth` | `auth.routes.ts` | register, login, me, profile, mail, password |
| `/games` | `game.routes.ts` | create game, history, board, resign… |
| `/stats` | `stats.routes.ts` | leaderboard, user stats, Elo history |
| `/ai` | `ai.routes.ts` | hints, skill estimate, game review |
| `/tournaments` | `tournament.routes.ts` | list, create, join, bracket |
| `/analytics` | `analytics.routes.ts` | admin platform charts |
| `/friends` | `friends.routes.ts` | requests, list, remove |
| `/chat` | `chat.routes.ts` | message history |
| `/puzzles` | `puzzle.routes.ts` | daily/random, solve, hint |

Full URL example: `POST /api/auth/login`.

---

## `src/routes/auth.routes.ts`

| Method + path | Auth? | Controller | Literal |
|---------------|-------|------------|---------|
| `POST /register` | no | `register` | Create account |
| `POST /login` | no | `login` | Set HttpOnly cookie |
| `POST /logout` | no | `logout` | Clear cookie |
| `GET /me` | yes | `getMe` | Current user |
| `PUT /profile` | yes | `updateProfile` | Edit profile |
| `PUT /elo` | yes | `updateElo` | Manual Elo (rare / admin-ish) |
| `POST /request-email-verification` | yes | … | Send verify mail |
| `GET /verify-email` | no | `verifyEmail` | Link from mailbox |
| `POST /resend-verification` | no | … | Resend |
| `POST /forgot-password` | no | … | Reset mail |
| `GET /reset-password` | no | form | Token landing |
| `POST /reset-password` | no | … | New password |

---

## `src/routes/game.routes.ts`

REST around `Game` / `Move`: create, get session, history pages, valid moves, PGN, resign, etc. Live **moves** are not here — they go through Socket.io (`game:move`).

---

## `src/routes/stats.routes.ts`

Leaderboard, Elo history, user stats, rank, top winners. Used by `/leaderboard` and dashboard widgets.

---

## `src/routes/ai.routes.ts`

Engine / heuristic helpers: predict moves, analyse quality, estimate skill, recommend lessons, extract review of a finished game. Used by `/review/:id` and skill modal.

---

## `src/routes/tournament.routes.ts`

List tournaments, create, join, start, bracket, messages. Backed by `tournament.controller.ts`.

---

## `src/routes/analytics.routes.ts`

Admin-only (`requireAdmin`): platform totals, games volume, per-user analytics. Powers admin dashboard charts.

---

## `src/routes/friends.routes.ts`

| Method | Path | Meaning |
|--------|------|---------|
| `POST /request` | send friend request (username or id) |
| `PUT /:requestId` | accept or reject |
| `GET /` | friends + incoming + outgoing + online ids |
| `DELETE /:friendId` | remove friend |

All behind `verifyToken`.

---

## `src/routes/chat.routes.ts`

`GET` history for a room / DM. Sending live messages is Socket.io (`social.socket.ts`).

---

## `src/routes/puzzle.routes.ts`

Public puzzle payload (no solution): daily, random, themes. `POST /:id/solve` with `{ move, lineIndex }`. `GET /:id/hint`. Stats of the current user.
