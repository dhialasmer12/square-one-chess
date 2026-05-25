# Codebase guide (PFE / Square One Chess)

This document is a **map of the repository**: what each major part does, how requests flow, and where to look when you change behavior.

---

## 1. What this project is

- **Backend** (`/` root): **Express** + **TypeScript** + **Prisma** (SQLite) + **Socket.io** for live chess, matchmaking, chat, friends, tournaments, stats, and heuristic “AI” features (move hints, skill estimate, lessons, game review).
- **Frontend** (`frontend/`): **Angular 17** (standalone components), **Tailwind**, **chess.js**, **socket.io-client** — SPA that talks to the API and sockets.

Two separate `package.json` files: run installs and scripts from **root** for the API and from **`frontend/`** for the UI.

---

## 2. Repository layout

| Path | Role |
|------|------|
| `src/` | API server source (compiled to `dist/`). |
| `prisma/` | `schema.prisma`, migrations, `seed.ts`. |
| `frontend/src/app/` | Angular app: pages, components, services, guards. |
| `frontend/src/environments/` | `API_URL` and env flags for the SPA. |
| `docs/CODEBASE.md` | This file. |

---

## 3. How to run (dev)

**Backend** (from repo root):

- `npm install`
- Set `DATABASE_URL` (see `.env` example if present) and run migrations: `npx prisma migrate dev`
- `npm run dev` — typically **port 3000** (see `src/server.ts`).

**Frontend** (from `frontend/`):

- `npm install`
- Point `environment.ts` / `environment.development.ts` at your API (e.g. `http://localhost:3000`).
- `npm start` — typically **port 4200**.

**Process**: HTTP API under `/api`, WebSocket server attached to the same HTTP server in `src/server.ts`.

---

## 4. Data model (Prisma)

File: `prisma/schema.prisma`.

**Core:**

- **User** — auth identity, `username`, `elo`, game counters, streaks.
- **Game** — `whitePlayerId`, `blackPlayerId`, `fen`, `pgn`, `status`, `winner`, `timeControl`, timestamps.
- **Move** — per-game ordered moves: `fromSquare`, `toSquare`, `piece`, `promotion`, `fen` snapshot.

**Other:**

- **QueueEntry** — matchmaking queue row per user.
- **Tournament** / **TournamentRegistration** / **TournamentMatch** / **TournamentMessage** — tournament flows.
- **Friend** — friend requests / links.
- **ChatMessage** — chat payloads keyed by `roomId` (and user relations).

Prisma client is created in `src/models` (or equivalent) and imported in services as `prisma`.

---

## 5. Backend architecture

### 5.1 Boot sequence

1. **`src/server.ts`** — Creates HTTP server from **`src/app.ts`**, attaches **Socket.io**, calls `setSocketServer(io)` and `registerGameSockets(io)`, listens on `PORT`.
2. **`src/app.ts`** — Express app: security (`helmet`), `cors`, `json`, `morgan`, mounts **`/api`** → `src/routes/index.ts`, then 404 + **`errorHandler`**.

### 5.2 HTTP routes (`src/routes/index.ts`)

| Mount | File | Purpose |
|-------|------|---------|
| `/api/auth` | `auth.routes.ts` | Register, login, JWT refresh/me patterns (see controllers). |
| `/api/games` | `game.routes.ts` | Create/join games, play moves, history, session, etc. |
| `/api/stats` | `stats.routes.ts` | Leaderboard, user stats. |
| `/api/ai` | `ai.routes.ts` | Predict move, estimate skill, recommend lessons, lesson puzzles, game review. |
| `/api/tournaments` | `tournament.routes.ts` | Tournament CRUD / join / play hooks. |
| `/api/analytics` | `analytics.routes.ts` | Platform or user analytics (often admin-guarded). |
| `/api/friends` | `friends.routes.ts` | Friend list / requests. |
| `/api/chat` | `chat.routes.ts` | Chat rooms / messages. |
| `/api/puzzles` | `puzzle.routes.ts` | Daily/random puzzles, themed puzzles, solve tracking. |

Each route file wires **middleware** (e.g. `verifyToken`) to **controllers**; controllers stay thin and call **services**.

### 5.2.1 Full API reference (all endpoints)

Base URL:

- Health check: `GET /health`
- API root: everything below is mounted under `POST/GET/... /api/*` (see `src/app.ts`)

Auth:

- **Authentication**: Most routes require `verifyToken` middleware.
  - Accepts either `Authorization: Bearer <JWT>` **or** the HttpOnly cookie `square_one_access_token` (see `src/middleware/auth.middleware.ts`).
  - The backend sets/clears the cookie on login/register/logout (see `src/controllers/auth.controller.ts`).

Errors:

- Central error shape: `{ "error": string, "details"?: any }` for `HttpError` (see `src/middleware/error.middleware.ts`).

#### `/api/auth` (`src/routes/auth.routes.ts`)

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout` (auth required)
- `GET /api/auth/me` (auth required)
- `PUT /api/auth/profile` (auth required)
- `PUT /api/auth/elo` (auth required)
- `POST /api/auth/request-email-verification` (auth required)
- `GET /api/auth/verify-email?token=...`
- `POST /api/auth/forgot-password` (body `{ email }`)
- `GET /api/auth/reset-password?token=...` (returns an HTML form)
- `POST /api/auth/reset-password` (accepts JSON or form post: `{ token, newPassword }`)

#### `/api/games` (`src/routes/game.routes.ts`) — all require auth

- `POST /api/games/create`
- `POST /api/games/bot` (unrated vs AI / open-seat)
- `GET /api/games/history/:userId` (paginated; query supports `page`, `pageSize`, `result`, `opponent`, `dateFrom`, `dateTo`, `sort`)
- `GET /api/games/user/:userId/history` (query `limit`)
- `GET /api/games/user/:userId/recent` (query `limit`)
- `GET /api/games/user/:userId`

Per-game:

- `GET /api/games/:gameId/board`
- `GET /api/games/:gameId/moves` (query `verbose=1` for verbose)
- `GET /api/games/:gameId/valid-moves` (query `square=e2`)
- `GET /api/games/:gameId/pgn` (query `format=json` for `{ pgn }`)
- `GET /api/games/:gameId/status`
- `POST /api/games/:gameId/move`
- `POST /api/games/:gameId/resign`
- `GET /api/games/:gameId`

#### `/api/stats` (`src/routes/stats.routes.ts`) — all require auth

- `GET /api/stats/leaderboard` (query: `limit`, `period=week|month|all`, `search`, `format=bullet|blitz|rapid|all`)
- `GET /api/stats/top-winners` (query `limit`)
- `GET /api/stats/user/:userId/elo-history` (only self)
- `GET /api/stats/user/:userId/rank` (query `format`)
- `GET /api/stats/user/:userId` (public-safe if not self)

#### `/api/ai` (`src/routes/ai.routes.ts`) — all require auth

- `POST /api/ai/predict-move` (body `{ fen, numMoves? }`)
- `POST /api/ai/estimate-skill` (body `{ gameId }` for finished games, or `{ moves: string[] }`)
- `POST /api/ai/recommend-lessons` (body `{ userId, numRecommendations? }` — only self)
- `POST /api/ai/lesson-puzzles` (body `{ lessonId, limit? }`)
- `GET /api/ai/game-review/:gameId`

#### `/api/tournaments` (`src/routes/tournament.routes.ts`) — all require auth

- `POST /api/tournaments/create` (body `{ name, type, maxPlayers }`)
- `GET /api/tournaments/active`
- `POST /api/tournaments/:tournamentId/join`
- `GET /api/tournaments/:tournamentId/bracket`
- `GET /api/tournaments/:tournamentId/matches`
- `GET /api/tournaments/:tournamentId/chat` (query `limit`)
- `POST /api/tournaments/:tournamentId/chat` (body `{ text }`)

#### `/api/analytics` (`src/routes/analytics.routes.ts`) — all require auth

- `GET /api/analytics/platform` (admin only; query `lastDays`, default 30)
- `GET /api/analytics/games` (admin only; query `lastDays`, default 30)
- `GET /api/analytics/user/:userId` (admin or self)

#### `/api/friends` (`src/routes/friends.routes.ts`) — all require auth

- `POST /api/friends/request` (body: `friendUsername` or `friendId`)
- `PUT /api/friends/:requestId` (body `{ action: "accept" | "reject" }`)
- `GET /api/friends`
- `DELETE /api/friends/:friendId`

#### `/api/chat` (`src/routes/chat.routes.ts`) — all require auth

- `GET /api/chat/history` (query: `roomId=global` OR `gameId` OR `withUserId`)

#### `/api/puzzles` (`src/routes/puzzle.routes.ts`) — all require auth

- `GET /api/puzzles/daily`
- `GET /api/puzzles/random` (query: `minRating`, `maxRating`)
- `GET /api/puzzles/stats`
- `GET /api/puzzles/theme/:theme` (query: `limit`)
- `POST /api/puzzles/:id/solve` (body: `{ move }` or `{ san }`)
- `GET /api/puzzles/:id/hint`
- `GET /api/puzzles/:id`

### 5.3 Middleware (representative)

- **`auth.middleware.ts`** — JWT verification; sets `req.user` (see `src/types/express-augment.ts` for typing).
- **`admin.middleware.ts`** — Optional admin checks for analytics.
- **`error.middleware.ts`** — Central error → JSON responses.

### 5.4 Services (business logic)

Located under **`src/services/`**. Controllers should delegate here.

| Service (examples) | Responsibility |
|--------------------|----------------|
| `game.service.ts` | Load/update games, legal moves, persist moves, finish games, move history, recent games for lessons, assert participant. |
| `auth.service.ts` | Credentials, hashing, tokens. |
| `stats.service.ts` | ELO updates, leaderboard queries. |
| `ai.service.ts` | chess.js heuristics: `evaluateGlobal`, `analyzeMoveQuality`, `predictMoves`, `estimateSkill`, `identifyCommonMistakes`, `recommendLessons`, `extractPuzzlesFromSanGame`, `buildGameReviewMoves`, `getLessonPuzzles`, `getGameReview`. |
| `tournament.service.ts` | Tournament lifecycle. |
| `friends.service.ts`, chat-related | Social features. |

**Rule of thumb:** If it touches the DB or chess rules for persisted games, look in **`game.service.ts`** first.

### 5.5 Types / errors

- **`src/types/index.ts`** — Shared DTOs and request bodies (`GameResponse`, `LessonPuzzleDto`, `GameReviewResponse`, `HttpError`, etc.).
- **`HttpError`** — Thrown from services/controllers; **`asyncHandler`** wraps async route handlers.

### 5.6 Realtime (`src/sockets/`)

- **`io.ts`** — Holds the Socket.io server instance for code that is not the socket file itself.
- **`game.socket.ts`** — Registers namespaces/events for live play: join game, moves, draw/resign, disconnect cleanup. Often coordinates with **`activeGames`** in memory + Prisma persistence via `game.service`.

When debugging “move didn’t apply” or “opponent didn’t see update”, trace: **client emit** → **game.socket handler** → **`game.service`** → **DB** → **broadcast**.

### 5.7 Utilities

Examples: `src/utils/jwt.ts`, `src/utils/admin.ts`, `src/utils/asyncHandler.ts`, `src/constants/time-controls.ts` — small shared helpers; keep them dependency-free where possible.

---

## 6. Frontend architecture (Angular)

### 6.1 Entry and shell

- **`frontend/src/main.ts`** — Bootstraps the app.
- **`frontend/src/app/app.config.ts`** — Providers (`provideRouter`, `provideHttpClient`, interceptors if any).
- **`frontend/src/app/app.routes.ts`** — All routes (lazy `loadComponent` for pages).

**Guards:**

- **`auth.guard.ts`** — Must be logged in for home, lobby, game, etc.
- **`guest.guard.ts`** — Login/register only when not logged in.

### 6.2 Pages (`frontend/src/app/pages/`)

| Route | Component folder | Role |
|-------|------------------|------|
| `/home` | `home/` | Landing after login. |
| `/lobby` | `lobby/` | Queue, challenges, open games. |
| `/game/:gameId` | `game/` | Live board + clocks + socket play. |
| `/replay/:gameId` | `replay/` | Read-only replay. |
| `/review/:gameId` | `game-review/` | Post-game heuristic review + puzzles from that game. |
| `/history` | `game-history/` | Paginated history; links to replay/review. |
| `/dashboard` | `dashboard/` | Overview; may embed lesson recommendations. |
| `/profile` | `profile/` | User profile and stats. |
| `/leaderboard` | `leaderboard/` | Rankings. |
| `/tournaments` | `tournaments/` | Tournament UI. |
| `/login`, `/register` | `login/`, `register/` | Auth forms. |

### 6.3 Shared components (`frontend/src/app/components/`)

Reusable UI: chess board, replay mode, lesson carousel, queue status, etc. Prefer **standalone** components (`imports: [...]` in `@Component`).

### 6.4 Services (`frontend/src/app/services/`)

| Service | Role |
|---------|------|
| `auth.service.ts` | Login/register/me, token storage, auth header behavior. |
| `game-play.service.ts` | HTTP + coordination for active game session. |
| Socket wrappers (e.g. queue / game) | Realtime events to components. |
| `ai-suggestion.service.ts` | POST/GET to `/api/ai/*` (predict, skill, lessons, lesson puzzles, game review). |
| `game-history.service.ts`, `stats` / `profile` APIs | Typed HTTP to matching backend routes. |

**Environment:** `frontend/src/environments/environment*.ts` → `API_URL` must match your backend origin.

### 6.5 Models (`frontend/src/app/models/`)

TypeScript interfaces mirroring API payloads (game rows, AI responses, etc.). Keep in sync with **`src/types/index.ts`** when you change APIs.

---

## 7. End-to-end flows (mental model)

### 7.1 Login → lobby → game

1. User registers/logs in → backend sets HttpOnly cookie `square_one_access_token` (token is not returned in JSON). Optionally, clients can also send `Authorization: Bearer …`.
2. Lobby uses HTTP (queue entry) + **sockets** (match found, invited to game).
3. **`/game/:id`** loads session, subscribes to socket room for that `gameId`, sends moves with UCI/from-to per your API contract.
4. Server validates turn + legality in **`game.service`**, writes **Move** rows, updates **Game.fen**, emits state to both players.

### 7.2 Game end → stats → history

Finishing a game updates users (**ELO**, counters) in **`stats.service`** (or from `game.service` calling into it). History endpoints read **Game** + **Move** counts / metadata.

### 7.3 AI / lessons / review (heuristic, not Stockfish)

All in **`src/services/ai.service.ts`** using **chess.js**:

- **Move quality** — Compares your move’s heuristic score to the best legal move’s score → label + `bestSan`.
- **Lessons** — Scans recent finished games, **`identifyCommonMistakes`**, maps tallies to a static **lesson catalog**, returns **`recommendLessons`**.
- **Lesson puzzles** — **`getLessonPuzzles`**: same mistake themes, returns FEN + played vs best from **your** games.
- **Game review** — **`getGameReview`**: full move list annotations + puzzles for one game.

Frontend: **`AiSuggestionService`** + dashboard lesson component + **`game-review`** page.

---

## 8. Configuration and security notes

- **Secrets** — JWT secret, DB URL: environment variables only; never commit real secrets.
- **CORS** — Backend allows credentials; frontend origin must be permitted in production configs.
- **Admin** — If present, admin lists are env- or ID-based (`admin.ts`); analytics routes may require admin.

---

## 9. Where to change things (quick index)

| Goal | Likely location |
|------|-----------------|
| New REST endpoint | `src/routes/*.routes.ts` → controller → service |
| DB shape | `prisma/schema.prisma` + migration |
| Chess rules / move validation | `game.service.ts` + chess.js |
| Socket events | `src/sockets/game.socket.ts` + client socket service |
| New Angular page | `pages/…`, add route in `app.routes.ts` |
| New API type | `src/types/index.ts` + `frontend/src/app/models/…` |
| Heuristic “engine” / lessons | `ai.service.ts` |
| Auth behavior | `auth.service.ts` (API) + `auth.service.ts` (Angular) |

---

## 10. Tests and quality

- Backend: Typecheck with `npx tsc --noEmit` from root after `npm run build` / CI pattern you prefer.
- Frontend: `ng build`; unit tests via `ng test` if configured.

---

## 11. Suggested reading order (for a new developer)

1. `prisma/schema.prisma` — know the entities.
2. `src/routes/index.ts` + one full vertical slice (e.g. `game.routes.ts` → `game.controller.ts` → `game.service.ts`).
3. `src/sockets/game.socket.ts` — how live state is pushed.
4. `frontend/src/app/app.routes.ts` + `pages/game/` + socket/game HTTP services.
5. `src/services/ai.service.ts` — if you work on coaching features.

This file is intentionally high-level; for exact request/response shapes, read the **route + controller + `src/types`** for that feature.

