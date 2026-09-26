# Explanation of every UML diagram (Square One Chess)

One paragraph per diagram. Use this when writing the rapport commentary or answering the jury (“What does this figure show?”).

Sources: `docs/uml/*.puml` and the exported figures `docs/fig-*.png`.

---

## 1. Global / architecture diagrams

### Global use-case diagram (`01-use-case` / `fig-usecase-global.png`)

This diagram shows only features that exist in the delivered app: Visitor (register, log in), Player (profile, live play, history/replay, puzzles, game review, tournaments, friends/chat, leaderboard, dashboard stats), and Administrator (platform analytics on the dashboard). There is no public “browse without account” use case, because the Angular client has no such page.

### Component diagram (`06-component.puml`)

This logical deployment diagram shows how the pieces run together: the Angular SPA in the browser talks to the Node.js server over HTTP REST (JSON + cookies) and Socket.io (live games, queue, chat); inside the server, Express and Socket.io call business services, Prisma talks to SQLite, and optional external pieces (Nodemailer for e-mail, Stockfish for the engine) support verification and AI features.

### Architecture class diagram (`03-class-architecture.puml`)

This diagram is not the database model but the software structure: Angular pages, guards and front services on one side, Express routes, controllers, middleware and back services on the other, linked by HTTP and WebSocket, which matches the layered design used in the codebase (UI → API → services → Prisma).

### Domain class diagram (`02-class-domain` / `fig-class-domain.png`)

This class diagram mirrors the Prisma business model: User, Game, Move, QueueEntry, Friend, ChatMessage, Tournament and related entities, Puzzle, DailyPuzzle and UserPuzzleStats, with associations that explain how players, games, social features, events and training data are stored and related in SQLite.

---

## 2. Use-case diagrams (per feature)

### Register (`UC-register` / `fig-uc-register.png`, also `UC-01-inscrire`)

This use case focuses on the Visitor creating an account: one actor (Visitor) and one oval (Register), with a simple association and no include/extend, matching the `/register` page and `POST /api/auth/register`.

### Manage account (`fig-uc-manage-account.png` / `UC-manage-account`)

This diagram covers post-registration account actions for a logged-in player—view and update profile, change settings related to the account—linked to the profile pages and protected auth routes.

### Play online games (`fig-uc-play.png` / `UC-play`)

This use case shows that a Player can play online against another human and/or play against the engine (bot), which matches the lobby and live game screens plus the open-seat / Stockfish bot path.

### Matchmaking, history and replay (`fig-uc-match-history.png` / `UC-match-history`)

This package groups finding an opponent, consulting past games, and replaying them, so the reader understands that matchmaking, history and replay belong to the same “competition / archive” functional area.

### Communicate with players (`fig-uc-social.png` / `UC-social`)

This use case covers the social side: friends and chat between players, corresponding to the friends API, chat messages and Socket.io presence/chat events.

### Take part in tournaments (`fig-uc-tournament.png` / `UC-tournament`)

This diagram shows tournament participation (join / play event matches) as a distinct use case from casual online play, matching the tournaments module and registrations.

### Train at chess (`fig-uc-train.png` / `UC-train`)

This use case is about training: solving tactical puzzles (and related review/lessons ideas), matching the puzzles page and puzzle bank in the database.

### Statistics and administration (`fig-uc-stats-admin.png` / `UC-stats-admin`)

This diagram separates player-facing statistics (leaderboard, personal performance) from administrator analytics on the platform, matching the stats/leaderboard UI and the admin-protected `/api/analytics` endpoints.

---

## 3. Class diagrams (per feature)

### Register (`fig-class-register.png` / `class-register`)

This design class diagram shows the Register page, AuthController / AuthService and User entity involved when creating an account, so the inscription chapter has a static view of the collaborating classes.

### Log in and manage profile (`fig-class-login.png` / `class-login`)

This diagram links login/profile UI components to authentication and user services, illustrating how session and profile data are handled after the visitor becomes a player.

### Play online games (`fig-class-play.png` / `class-play`)

This diagram centres on GamePage, GameController, GameService, Game and Move: it shows which classes collaborate to create a game, apply moves and end a party on the board.

### Matchmaking, history and replay (`fig-class-match.png` / `class-match`)

This class view adds queue / matchmaking and history-related types around Game, explaining how waiting players, finished games and replay data connect in the design of that chapter.

### Communicate with players (`fig-class-social.png` / `class-social`)

This diagram presents Friend and ChatMessage (and related UI/services) as the structural backbone of the social features described in the rapport.

### Tournaments (`fig-class-tournament.png` / `class-tournament`)

This diagram shows Tournament, TournamentRegistration, TournamentMatch (and messages) as the static model behind creating events, joining them and linking matches to games.

### Training (`fig-class-train.png` / `class-train`)

This diagram shows PuzzlePage and PuzzleService with Puzzle, UserPuzzleStats and DailyPuzzle (plus review), reflecting multi-ply solving and the public puzzle API without exposing the solution line to the client DTO.

### Statistics and administration (`fig-class-stats.png` / `class-stats`)

This diagram connects Leaderboard / analytics UI to StatsService and AnalyticsService, showing how rankings and admin dashboards are structured in the design.

---

## 4. Sequence diagrams (per scenario)

### Register (`fig-seq-register.png` / `seq-register`, also `07-sequence-inscription`)

This sequence follows the Visitor from the register form through `POST /api/auth/register`: validation, bcrypt hash, User creation, optional verification e-mail, then either redirect to check-email or Set-Cookie + `/me` + dashboard when the account is active.

### Log in (`fig-seq-login.png` / `seq-login`, also `05-sequence-auth`)

This sequence shows a Player submitting credentials, the server verifying bcrypt and issuing a JWT only inside an HttpOnly cookie, then the front calling `GET /api/auth/me` to confirm the session before redirecting to `/dashboard` (or check-email if not verified).

### Manage profile (`fig-seq-profile.png` / `seq-profile`)

This sequence describes loading and updating the player profile through the authenticated API after the session cookie is present, corresponding to the profile page behaviour.

### Live move (`fig-seq-move.png` / `seq-move`)

This sequence shows one move in a live game: the player acts on the Angular board, Socket.io emits the move, GameService validates it with chess.js, persists Move/FEN, and broadcasts the new position to both clients (or returns an error if illegal).

### Matchmaking (`fig-seq-match.png` / `seq-match`, also `04-sequence-matchmaking`)

This sequence shows two players joining the queue over Socket.io, QueueEntry rows in SQLite, pairing, Game creation, `match:found` events, navigation to `/game/:id`, and (in the longer version) a live move until game end and Elo update.

### Replay (`fig-seq-replay.png` / `seq-replay`)

This sequence explains opening a finished game and stepping through stored moves for replay, without a live opponent, using the history/replay pages and saved Move rows.

### Chat (`fig-seq-chat.png` / `seq-chat`)

This sequence shows sending a chat message: the UI emits via Socket.io, the server saves ChatMessage, and the message is broadcast to the room or friend channel.

### Join a tournament (`fig-seq-tournament.png` / `seq-tournament`)

This sequence covers joining a tournament via REST (`POST .../join`), creating a TournamentRegistration, and returning success or an error if the event is full or the player already joined.

### Solve a puzzle (`fig-seq-puzzle.png` / `seq-puzzle`)

This sequence matches the current trainer: load daily/random puzzle without leaking the solution, submit each ply with `lineIndex`, auto-play opponent replies on success, reset on failure, mark solved when the line ends, and optionally request a hint for the current ply.

### Leaderboard (`fig-seq-leaderboard.png` / `seq-leaderboard`)

This sequence shows requesting the ranking from the stats API, reading user Elo data from the database, and displaying the ordered leaderboard on the Angular page.

---

## 5. How to use this in the rapport / soutenance

For each figure in LaTeX, you can paste or shorten the matching paragraph above as the caption commentary (“This figure illustrates…”).

If the jury asks “Does the diagram match the code?”, answer that use-case and component diagrams match the delivered features, domain classes match Prisma, and the updated sequences (login cookie, Socket.io matchmaking, multi-ply puzzles) match the current implementation.

---

*File: `docs/EXPLICATION-DIAGRAMMES.md`*
