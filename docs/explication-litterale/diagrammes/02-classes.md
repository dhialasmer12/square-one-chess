# Class diagrams (literal)

A **class diagram** is a static picture: boxes = types/classes, lines = “uses / contains / talks to”. Attributes (`+id: String`) are fields. Methods (`+submit()`) are operations.

---

## 1. Domain model — `02-class-domain.puml` / `fig-class-domain.png`

This is **not** Angular. It is the **Prisma / SQLite** business model.

### Classes (boxes) and what each field means

**User** — a player account.

| Field | Literal meaning |
|-------|-----------------|
| id | UUID primary key |
| email, username | Unique login identifiers |
| password | bcrypt hash (never stored in clear) |
| emailVerified / verify tokens | Optional e-mail confirmation |
| passwordReset* | Forgot-password tokens |
| elo, eloBullet, eloBlitz, eloRapid | Ratings (global + time class) |
| gamesPlayed, gamesWon, winStreak, longestWinStreak | Counters for stats |
| createdAt, updatedAt | Timestamps |

**Game** — one chess party.

| Field | Literal meaning |
|-------|-----------------|
| whitePlayerId / blackPlayerId | The two users (bot is also a User row) |
| status | waiting / playing / finished / aborted… |
| fen | Current board position |
| pgn | Optional PGN text |
| timeControl | Clock label e.g. `10+0` |
| botDifficulty | Set only for engine games |
| winner | Who won, or draw |
| startedAt / endedAt | Dates |

**Move** — one ply stored for replay.

| Field | Literal meaning |
|-------|-----------------|
| fromSquare / toSquare | e2, e4 (Prisma cannot use `from`/`to`) |
| piece, promotion | Piece moved / promotion choice |
| fen | Position **after** this ply |
| moveNumber, timestamp | Order |

**QueueEntry** — a player waiting in matchmaking (userId, elo, joinedAt).

**Friend** — a request or accepted friendship (`status`: pending / accepted / blocked). Unique pair (userId, friendId).

**ChatMessage** — one chat line: fromUserId, optional toUserId, roomId, content, type (global vs DM).

**Tournament** — event (name, type, maxPlayers, status, currentRound).

**TournamentRegistration** — “this user joined this tournament”.

**TournamentMatch** — one bracket cell: round, colours, optional winnerId, optional gameId.

**TournamentMessage** — chat inside a tournament.

**Puzzle** — trainer position: fen, SAN `moves` line, theme, rating, tries/successes.

**DailyPuzzle** — which puzzle is “today”.

**UserPuzzleStats** — did this user solve this puzzle (attempts, solvedAt).

### Associations (the lines)

- User 1 — * Game as white **and** as black (two relations).
- Game 1 *— * Move (composition: delete game → delete moves).
- User 1 — * QueueEntry.
- User initiates / receives Friend rows.
- User sends / receives ChatMessage.
- Tournament 1 — * Registration, Match, Message.
- TournamentMatch 0..1 — 0..1 Game (the live board of that bracket cell).
- Puzzle 1 — * DailyPuzzle and UserPuzzleStats.

---

## 2. Architecture classes — `03-class-architecture.puml`

This is the **software layers**, not the database.

**Frontend package**

| Class | Literal role |
|-------|----------------|
| AppComponent | Root: `<router-outlet>` + chat sidebar |
| AuthGuard | Blocks `/lobby`, `/game`, … if no session |
| GuestGuard | Blocks `/login`, `/register` if already logged in |
| AuthService | HTTP login/register/me |
| GamePlayService | Live game HTTP/socket from the client |
| MatchmakingService | Queue join/leave |
| ChessBoardComponent | Draws the board |
| LobbyPageComponent | `/lobby` |
| GamePageComponent | `/game/:id` |

**Backend packages**

- **ExpressApp** — `app.ts`: middlewares + `/api`.
- **HttpServer** + **SocketIOServer** — `server.ts`.
- **Routes** — one class per router file (`AuthRoutes`, `GameRoutes`, …).
- **Controllers** — HTTP handlers.
- **Services** — business logic (AuthService, GameService, …).
- **Sockets** — GameSocketHandler, SocialSocketHandler, ActiveGamesStore.
- **PrismaClient**, **VerifyTokenMiddleware**, **ErrorMiddleware**.

**External:** SQLiteDB, ChessJs, Stockfish.

**Important arrows**

- Pages → front services → HTTP or WebSocket.
- Guards depend on AuthService (`..>` dashed).
- Each Route → its Controller → its Service → PrismaClient.
- GameService → ChessJs (legal moves).
- StockfishEngineService → Stockfish.
- GameSocketHandler → GameService + ActiveGamesStore.

---

## 3. Register — `class-register.puml` / `fig-class-register.png`

| Class | Fields / methods | Meaning |
|-------|------------------|---------|
| RegisterPage | username, email, password, submit() | Angular `/register` form |
| AuthController | register() | `POST /api/auth/register` |
| AuthService | registerUser() | Validate, hash, create User |
| User | id, email, username, password, emailVerified, elo | DB row |

**Arrows:** RegisterPage → AuthController (HTTP, cookie if account is active) → AuthService → User (create).

---

## 4. Login / profile — `class-login.puml` / `fig-class-login.png`

Same idea: Login page + Profile page talk to AuthController / AuthService / User. Session is the JWT **cookie**, not a class on the diagram.

---

## 5. Play — `class-play.puml` / `fig-class-play.png`

Collaborators for a live party: **GamePage**, **ChessBoard**, **GameController**, **GameService**, **Game**, **Move**. GameService applies chess.js and writes FEN + Move rows.

---

## 6. Matchmaking / history / replay — `class-match.puml` / `fig-class-match.png`

Adds **QueueEntry**, lobby/matchmaking services, history page, replay component, and Game/Move already defined. Queue is how two players get a Game; history/replay only **read** finished games.

---

## 7. Social — `class-social.puml` / `fig-class-social.png`

**FriendsList**, **ChatSidebar**, FriendApiService, SocialChatService, FriendController, ChatController, FriendService, ChatService, **Friend**, **ChatMessage**.

---

## 8. Tournaments — `class-tournament.puml` / `fig-class-tournament.png`

Tournament page + TournamentApiService + TournamentController + TournamentService + Tournament / Registration / Match / Message.

---

## 9. Training — `class-train.puml` / `fig-class-train.png`

PuzzlePage + PuzzleService (front and back) + Puzzle / DailyPuzzle / UserPuzzleStats. The public DTO does **not** include the solution line.

---

## 10. Stats / admin — `class-stats.puml` / `fig-class-stats.png`

Leaderboard page, dashboard, StatsController, AnalyticsController, StatsService, AnalyticsService, User counters / Elo.
