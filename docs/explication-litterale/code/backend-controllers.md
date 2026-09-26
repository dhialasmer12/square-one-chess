# Backend controllers (`src/controllers/`)

A controller is a thin HTTP adapter: read `req.body` / `req.params` / `req.user`, call a service, `res.json`. Wrapped in `asyncHandler` so thrown `HttpError` reach `error.middleware.ts`.

---

## `src/controllers/auth.controller.ts`

Sets / clears cookie `square_one_access_token` (HttpOnly, SameSite, optional Secure).

| Export | Literal job |
|--------|-------------|
| `register` | Create user; cookie only if account is already usable |
| `login` | Verify password; set cookie |
| `getMe` | Profile of `req.user.userId` |
| `updateProfile` | Username / email change |
| `updateElo` | Write Elo |
| `requestEmailVerification` / `resendVerification` / `verifyEmail` | Mail flow |
| `forgotPassword` / `resetPasswordForm` / `resetPassword` | Reset flow |
| `logout` | Clear cookie |

---

## `src/controllers/game.controller.ts`

HTTP for games: create (or bot game), get session/board, history, resign, draw, PGN, valid moves. Does not apply live plies (sockets do).

---

## `src/controllers/puzzle.controller.ts`

- Return **PuzzlePublic** (fen, theme, rating, number of plies — not SAN line).
- `solve`: body `{ move, lineIndex }` → service compares with secret line.
- `hint`: `fromSquare` of current ply only.

---

## `src/controllers/tournament.controller.ts`

Create / list / join / start / bracket / tournament chat HTTP.

---

## `src/controllers/friend.controller.ts`

| Export | Calls |
|--------|--------|
| `sendRequest` | `friendService.sendFriendRequest` |
| `respond` | accept / reject |
| `list` | friends + incoming + outgoing |
| `remove` | delete friendship |

---

## `src/controllers/chat.controller.ts`

`getHistory` — load messages for a room from DB (and/or memory cache).

---

## `src/controllers/stats.controller.ts`

Parses `limit` / `period` query. Exports `getLeaderboard`, `getEloHistory`, `getUserStats`, `getUserRank`, `getTopWinners`.

---

## `src/controllers/analytics.controller.ts`

Admin: `getPlatform`, `getGames`, `getUser` — last N days query param.

---

## `src/controllers/ai.controller.ts`

Forwards to `ai.service.ts`: move suggestions, blunder counts, skill estimate, lesson recommendations, full game review DTO.
