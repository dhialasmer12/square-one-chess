# Backend middleware, utils, types, constants, models

---

## Middleware

### `src/middleware/auth.middleware.ts`

`verifyToken` (alias `requireAuth`):

1. Read `Authorization: Bearer …` **or** cookie `square_one_access_token`.
2. If missing → 401 `Missing token`.
3. `verifyAccessToken` → set `req.user` `{ userId, … }`.
4. Invalid → 401 `Invalid or expired token`.

This is why login must happen on the **same origin** (Angular proxy): otherwise the browser refuses the cookie.

### `src/middleware/admin.middleware.ts`

- `requireAdmin` — `isAdminUser(userId, email)` else 403.
- `requireAdminOrSelf` — admin **or** the profile owner.

### `src/middleware/error.middleware.ts`

Last Express handler. Converts `HttpError(status, message)` (and unexpected errors) into JSON `{ error: "…" }`. The Angular `error.interceptor` reads that.

---

## Utils

| File | Literal |
|------|---------|
| `src/utils/jwt.ts` | `signAccessToken` / `verifyAccessToken` with `JWT_SECRET` |
| `src/utils/password.ts` | `hashPassword` / `verifyPassword` (bcrypt) |
| `src/utils/asyncHandler.ts` | Wrap async `(req,res,next)` so rejections go to error middleware |
| `src/utils/validation.ts` | Email regex, username length 2–32 |
| `src/utils/elo.ts` | Expected score + new Elo (K=32) |
| `src/utils/admin.ts` | `isAdminUser` — env list of emails/ids or demo flag |
| `src/utils/tokens.ts` | Random tokens hashed for verify/reset mails |
| `src/utils/auth-config.ts` | Flags: is e-mail verification required in this env? |

---

## Types

| File | Literal |
|------|---------|
| `src/types/index.ts` | All DTOs: JWT payload, RegisterBody, GameResponse, FriendListResponse, puzzle/tournament/analytics types, `HttpError` class |
| `src/types/express-augment.ts` | TypeScript: `req.user` exists |
| `src/types/socket-io.d.ts` | Socket data typing |
| `src/types/stockfish-npm.d.ts` | Minimal types for the stockfish package |

---

## Constants

| File | Literal |
|------|---------|
| `src/constants/time-controls.ts` | Lobby presets (`1+0`, `3+0`, `5+0`, `10+0`, …), `normalizeLobbyTimeControl` |
| `src/constants/rating-format.ts` | Map time control → bullet/blitz/rapid Elo field |
| `src/constants/openSeat.ts` | Id/username of the bot / open-seat user |

---

## Models

| File | Literal |
|------|---------|
| `src/models/prisma.ts` | Singleton `PrismaClient` |
| `src/models/index.ts` | Re-exports `prisma` and Prisma types (`User`, `Game`, …) |
