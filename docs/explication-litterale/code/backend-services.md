# Backend services (`src/services/`)

Services contain the **rules**. Controllers and sockets only call them.

---

## `src/services/auth.service.ts`

| Function | Literal |
|----------|---------|
| `registerUser` | Validate email/username, unique check, bcrypt, create User, optional verify mail, JWT |
| `loginUser` | Resolve identifier (email or username), verify password, return user + token |
| `getUserProfile` | Safe profile (no password hash) |
| `updateUserElo` / `updateUserProfile` | Writes |
| `requestEmailVerification` / `resendVerificationByEmail` / `verifyEmailByToken` | Token hash in DB |
| `requestPasswordReset` / `resetPasswordWithToken` | Same pattern for reset |

---

## `src/services/game.service.ts`

Core of live chess.

| Function | Literal |
|----------|---------|
| `createGame` | Insert Game, two human ids, time control, starting FEN |
| `createBotGame` | Second player is the engine user; `botDifficulty` |
| `makeMove` | Load game, chess.js legal + turn, write Move + fen; if over: winner, Elo, tournament hook |
| `playBotReplyAsync` | After human ply vs bot, Stockfish answers |
| `getBoardState` / `getGameSession` | What the Angular board needs |
| `getValidMoves` | For highlighting |
| `resignGame` / `acceptAgreedDraw` / `clearDrawOffer` | End conditions |
| `getGamesForUser` / history page helpers | `/history` |
| `exportPGN` | PGN string |
| `abortGameByDisconnect` | After grace timeout |

Draw offers are in-memory maps, not Prisma.

---

## `src/services/puzzle.service.ts`

Loads puzzles **without** sending `Puzzle.moves` to the client. `checkAndRecordSolve(move, lineIndex)`:

1. Replay SAN prefix up to `lineIndex`.
2. Compare the submitted UCI/SAN with the expected player ply.
3. Wrong → reset. Right → maybe auto-play opponent SAN. Line finished → mark solved.

Hints return only `fromSquare`.

---

## `src/services/tournament.service.ts`

Create event, register player, start when enough players, build bracket (`TournamentMatch`), hook when a Game ends to advance winner. Demo: creator can start early.

---

## `src/services/friend.service.ts`

Send request by username/id, respond, list accepted / incoming / outgoing, `listAcceptedFriendIds`, `assertFriendship` (used before DM), remove.

---

## `src/services/chat.service.ts`

Persist and list `ChatMessage` by roomId / DM pair.

---

## `src/services/stats.service.ts`

`updateUserStats` / `applyFinishedGameStats` after a game (Elo K=32, streaks). Leaderboard queries, Elo history points, rank, top winners. Open-seat bot user is excluded from rankings where needed.

---

## `src/services/analytics.service.ts`

Aggregations for admin: user growth, game volume, openings, Elo buckets, heatmap. No game mutation.

---

## `src/services/ai.service.ts`

Large file: heuristic evaluation (material, mobility, king safety) **and** Stockfish when available.

| Export | Literal |
|--------|---------|
| `evaluatePosition` / `predictMoves` | Best-move suggestions |
| `analyzeMoveQuality` | blunder / mistake / good / excellent |
| `estimateSkill` | Skill modal after games |
| `identifyCommonMistakes` / `recommendLessons` | Lesson list |
| `getGameReview` / `buildGameReviewMoves` | `/review/:id` |

---

## `src/services/stockfish-engine.service.ts`

Spawns / talks to the `stockfish` npm engine (UCI). Used by bot replies and AI analysis. If engine missing, AI falls back to heuristics.

---

## `src/services/email.service.ts`

Nodemailer wrapper: verification link, password reset. No-op or skip if SMTP env vars absent.
