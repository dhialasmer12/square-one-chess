# Sequence diagrams (literal)

A **sequence diagram** is time going **down**. Boxes on top = participants. Horizontal arrows = one call/message. `alt` / `opt` = if / optional.

Read every arrow as: *who sends what to whom*.

---

## 1. Register — `seq-register.puml` / `fig-seq-register.png` (also `07-sequence-inscription.puml`)

**Participants:** Visitor, Register page (Angular), AuthController, AuthService, SQLite (Prisma), E-mail (Nodemailer).

| Step | Arrow | What happens in code |
|------|-------|----------------------|
| 1 | Visitor → UI | Opens `/register`, fills username / email / password, submits |
| 2 | UI → Controller | `POST /api/auth/register` with `withCredentials` (cookies) |
| 3 | Controller → Service | `registerUser(...)` |
| 4 | Service | Validates fields |
| 5 | Service → DB | `findUnique` on email and username |
| **alt already used** | Service → Controller → UI | HTTP **409**, error message |
| **else valid** | Service | bcrypt hash |
| | Service → DB | `create User` |
| **opt verification** | Service → MAIL | send verification e-mail |
| | Service | Generate JWT |
| **alt need verify** | Controller → UI | Clear cookie + `emailVerificationRequired: true` → `/check-email` |
| **else local auto-verify** | Controller → UI | `Set-Cookie` HttpOnly + `{ userId }` |
| | UI → Controller | `GET /api/auth/me` |
| | Controller → UI | profile OK → `/dashboard` |

---

## 2. Log in — `seq-login.puml` / `fig-seq-login.png` (also `05-sequence-auth.puml`)

Same style: form → `POST /api/auth/login` → bcrypt check → JWT **only in HttpOnly cookie** → front calls `GET /api/auth/me` → `/dashboard` (or check-email if not verified). Wrong password → 401, no cookie.

---

## 3. Manage profile — `seq-profile.puml` / `fig-seq-profile.png`

Player on `/profile` → `GET /api/auth/me` (cookie) → show data. Save → `PUT /api/auth/profile` → AuthService updates User → response with new profile.

---

## 4. Live move — `seq-move.puml` / `fig-seq-move.png`

**Participants:** Player, Game page, Socket.io (`game.socket`), GameService, SQLite.

| Step | Arrow | Literal |
|------|-------|---------|
| 1 | Player → UI | Clicks a legal piece move on the board |
| 2 | UI → Socket | `emit game:move` `{ gameId, from, to, promotion? }` |
| 3 | Socket → GameService | apply move for this `userId` |
| 4 | GameService | chess.js: is it legal **and** this player’s turn? |
| **alt illegal** | Service → Socket → UI | reject, board does not change |
| **else legal** | Service → DB | insert `Move`, update `Game.fen` |
| | Socket → both UIs | `game:moved` |
| **opt finished** | Service → DB | status, winner, Elo |
| | Socket → UIs | `game:end` |

The **server** is the authority. The Angular board only displays.

---

## 5. Matchmaking — `seq-match.puml` / `fig-seq-match.png` (also `04-sequence-matchmaking.puml`)

Two actors: Player A and Player B, two lobby UIs, one Socket.io, GameService, DB.

**Queue**

1. A joins queue (time control) → UI_A `emit queue:join`.
2. Socket stores a waiting entry (elo + time control).
3. B does the same.

**alt opponent found**

- Socket → GameService `createGame(white, black, timeControl)`.
- DB insert Game `playing`.
- Remove queue entries.
- Both UIs receive `match:found(gameId, color)`.
- Both navigate to `/game/:id`.

**else** A stays in “waiting”.

Pairing rule in code: same `timeControl` and Elo difference ≤ `MATCHMAKING_ELO_RANGE` (default 400).

---

## 6. Replay — `seq-replay.puml` / `fig-seq-replay.png`

Player opens `/replay/:id` → HTTP load game + move list → ReplayMode steps index 0..n on stored `Move` rows. **No** Socket.io, **no** opponent.

---

## 7. Chat — `seq-chat.puml` / `fig-seq-chat.png`

UI emits a chat event → server checks auth (and friendship for DM) → save `ChatMessage` → broadcast to the room / friend. History can also be loaded with `GET /api/chat/...`.

---

## 8. Join tournament — `seq-tournament.puml` / `fig-seq-tournament.png`

Player on `/tournaments` → `POST /api/tournaments/:id/join` → TournamentService creates `TournamentRegistration` or error (full / already joined).

---

## 9. Solve a puzzle — `seq-puzzle.puml` / `fig-seq-puzzle.png`

**Load**

- Player opens `/puzzles`.
- UI → `GET /api/puzzles/daily` or `/random?theme=`.
- Service picks a Puzzle; response is **public**: id, fen, theme, rating, plies — **not** the SAN solution.

**Each ply**

- Player moves → `POST /api/puzzles/:id/solve` `{ move, lineIndex }`.
- Server replays the line prefix with chess.js and compares.

| Branch | Result |
|--------|--------|
| Wrong | attempts++, board reset to start, `lineIndex = 0` |
| Right, more plies | apply player move + auto-play opponent SAN; return new fen + next index |
| Right, line done | `UserPuzzleStats.solved = true` |

**opt Hint:** `GET /api/puzzles/:id/hint?lineIndex` → only `fromSquare` of the current player ply.

---

## 10. Leaderboard — `seq-leaderboard.puml` / `fig-seq-leaderboard.png`

Page `/leaderboard` → `GET /api/stats/leaderboard` → StatsService reads User Elo (and period filters) → JSON list → Angular table.
