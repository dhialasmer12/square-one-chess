# Square One Chess — Complete understanding & defense guide

One file to learn the whole project: **what each page does**, **errors you may see**, and **technical questions** a jury can ask (with short answers you can say out loud).

Use this to study. At the oral exam, speak shorter versions of the answers.

---

# Part A — How the system works (simple)

## A1. Two programs

| Program | Folder | Port | Job |
|---------|--------|------|-----|
| **Backend (API)** | project root `src/` | **3000** | Rules, database, matchmaking, AI, cookies |
| **Frontend (UI)** | `frontend/` | **4200** | Screens, buttons, chess board |

You open **http://localhost:4200**. The UI calls `/api/...`. In development, Angular **proxies** those calls to port 3000 so the **login cookie** stays on the same site.

## A2. Request path (every feature)

```text
User clicks → Angular page → AuthService / HttpClient
    → (proxy) → Express route → Controller → Service
    → Prisma / chess.js / Stockfish / Socket.io
    → JSON or live event → UI updates
```

## A3. Important words

| Word | Meaning |
|------|---------|
| **FEN** | One string = full board position |
| **SAN** | Move text like `Nf3`, `O-O`, `Qxe8#` |
| **JWT** | Signed “ticket” proving who you are |
| **HttpOnly cookie** | Ticket stored by the browser; JavaScript cannot read it |
| **Socket.io** | Live connection (moves appear without refresh) |
| **Elo** | Rating number that goes up/down after games |
| **Prisma** | Tool that turns DB tables into typed code |
| **SQLite** | Database = one file on disk |
| **Guard** | Angular check: “are you logged in?” before opening a page |
| **Interceptor** | Adds `withCredentials` so cookies are sent on every API call |

---

# Part B — Page by page (what happens when you click)

## B1. Register (`/register`)

1. You enter username, email, password.  
2. Angular validates the form (email format, password ≥ 6).  
3. `POST /api/auth/register`.  
4. Backend hashes password with **bcrypt**, creates `User` in SQLite.  
5. If email verification is required and SMTP works → account not fully active; you go to **check-email**.  
6. In local dev without SMTP → email is often **auto-verified**; cookie is set; you go to **dashboard**.  
7. After register, frontend calls `/api/auth/me` to confirm the cookie works.

**If it fails:** see Part C (duplicate email, weak password, cookie blocked).

## B2. Login (`/login`)

1. `POST /api/auth/login` with email + password.  
2. Backend verifies bcrypt hash.  
3. If email not verified → **403** → redirect to check-email.  
4. Else: set cookie `square_one_access_token`, return JSON (user id, expires).  
5. Frontend calls `/me`; if OK → navigate to dashboard.  
6. `guestGuard`: if already logged in, login page redirects to dashboard.

## B3. Dashboard (`/dashboard`)

- Protected by `authGuard` → must succeed `/api/auth/me`.  
- Shows overview / links to lobby, puzzles, history, etc.  
- Loads profile stats from API.

## B4. Lobby (`/lobby`)

1. Choose time control (e.g. 10+0).  
2. Join matchmaking queue (`QueueEntry` in DB + Socket.io events).  
3. When two compatible players wait → create `Game`, notify both.  
4. Or play vs **bot** (open-seat user + Stockfish).  
5. Navigate to `/game/:gameId`.

## B5. Live game (`/game/:gameId`)

1. Load game FEN from API.  
2. Open Socket.io connection (cookie session).  
3. Join game room.  
4. You drag a piece → UI checks with chess.js → send move to server.  
5. Server re-checks with chess.js, saves `Move`, updates FEN, broadcasts.  
6. Clocks tick; resign / leave may forfeit.  
7. On end: update Elo, show result, optional review link.

## B6. History (`/history`) → Replay (`/replay/:id`) → Review (`/review/:id`)

- **History:** list finished games for your user.  
- **Replay:** step through stored moves on the board (no live opponent).  
- **Review:** AI/engine comments on critical moments (Stockfish / AI service).

## B7. Puzzles (`/puzzles`)

1. Load daily or random puzzle (or filter by **theme**).  
2. Board shows FEN; label shows **White/Black to move**.  
3. You play a move → `POST /api/puzzles/:id/solve` with `move` + `lineIndex`.  
4. If wrong → attempts++, board resets to start.  
5. If correct → opponent reply auto-plays from the solution line → next ply.  
6. When line finished → marked **solved**, stats/streak update.  
7. Hint highlights the piece’s **from** square for the current ply.

**Themes:** mate_in_1, mate_in_2, fork, pin, skewer, endgame.

## B8. Tournaments (`/tournaments`)

1. Create or join a tournament.  
2. Register players.  
3. Start when enough players (creator can start early in demo).  
4. Matches create games; results update bracket.  
5. Optional tournament chat.

## B9. Friends & chat

- Send/accept friend requests.  
- Chat messages via REST + Socket.io presence (“online”).  

## B10. Leaderboard / Profile

- Leaderboard: sorted Elo (and formats).  
- Profile: username, ratings, games played/won, edit profile if allowed.

## B11. Logout

- `POST /api/auth/logout` clears cookie.  
- Disconnect sockets.  
- Go to login.

---

# Part C — Possible errors (symptom → cause → what to do)

## C1. Auth / session

| What you see | Likely cause | Fix / explanation |
|--------------|--------------|-------------------|
| Stuck on “Signing in…” then back to login | Cookie not stored (localhost vs 127.0.0.1) | Use **http://localhost:4200**, keep proxy; hard refresh |
| Login 200 then `/me` 401 | Same cookie problem | Proxy makes `/api` same-origin |
| “Email not verified” | Verification required, user not verified | Check-email / verify link / auto-verify in dev |
| “Invalid credentials” | Wrong password or email | Recheck; open-seat system user cannot login |
| “Email already registered” | Duplicate email | Use another email or login |
| “Username already taken” | Duplicate username | Change display name |
| Register 503 email error | SMTP misconfigured | Set `REQUIRE_EMAIL_VERIFICATION=false` or fix SMTP |
| Suddenly logged out | Cookie expired / cleared / different browser profile | Login again |
| Guard loop login ↔ dashboard | Cookie missing but UI thought logged in | Fixed by verifying `/me` after login |

## C2. Servers / network

| What you see | Likely cause | Fix |
|--------------|--------------|-----|
| Network error / failed to fetch | Backend not running | `npm run dev` on port 3000 |
| Port 4200 in use | Old `ng serve` still running | Kill port 4200, restart |
| Port 3000 in use | Old API still running | Kill port 3000, restart |
| CORS error in console | Wrong origin / credentials | CORS `origin: true` + `credentials: true`; use proxy |
| Blank page | Frontend build/serve crash | Check Angular terminal for compile errors |

## C3. Games / sockets

| What you see | Likely cause | Fix / explanation |
|--------------|--------------|-------------------|
| Opponent moves don’t appear | Socket not connected / wrong room | Refresh; check cookie; WS_URL empty + proxy `/socket.io` |
| Move rejected | Illegal move or not your turn | Server is authority (chess.js) |
| Stuck in queue | No second player | Use 2 accounts or play vs bot |
| Refresh mid-game weird state | Client lost in-memory socket state | Rejoin game room; server has DB FEN |
| Leave = forfeit | By design for fairness | Explain as anti-abuse |
| Bot doesn’t move | Stockfish fail / difficulty | Check server logs; fallback heuristics may apply |

## C4. Puzzles

| What you see | Likely cause | Fix |
|--------------|--------------|-----|
| “No puzzles” | DB not seeded | `npx prisma db seed` or puzzle seed script |
| Correct move marked wrong | SAN mismatch (old bug) | `sameMoveOnPosition` compares resulting FEN |
| Hint wrong piece | Hint used wrong ply index | Hint uses current `lineIndex` |
| Multi-move feels stuck | Waiting for your next ply after auto-reply | Play again; progress label shows move N/M |
| Theme empty | No puzzles for theme / all solved | Pick “All” or lower rating band |

## C5. Database / Prisma

| What you see | Likely cause | Fix |
|--------------|--------------|-----|
| Prisma client out of date | Schema changed | `npx prisma generate` |
| Table missing | Schema not applied | `npx prisma db push` |
| DB locked (SQLite) | Two writers (seed + server) | Stop server, seed, restart |
| Seed deletes puzzle stats | Fresh puzzle bank by design | Expected after puzzle reseed |

## C6. Security / demo mishaps

| What you see | Likely cause | Explanation for jury |
|--------------|--------------|----------------------|
| Token not in localStorage | Intentional | HttpOnly cookie only |
| Can’t read cookie in DevTools Application as JS | Intentional | HttpOnly |
| Admin vs user | Role / middleware | Only admin routes for analytics if configured |

---

# Part D — Technical questions & answers (defense)

Speak 20–40 seconds per answer unless they ask for depth.

## D1. Project & architecture

**Q. What is the goal of the application?**  
A. A web chess platform: accounts, live games, matchmaking, puzzles, tournaments, friends/chat, history/replay, and AI-assisted review — for training and online play.

**Q. Why separate frontend and backend?**  
A. Clear responsibilities: UI vs business rules and security. They can evolve and deploy independently; the API can serve other clients later (mobile).

**Q. Why Angular?**  
A. Structured SPA: components, routing, guards, reactive forms, TypeScript, good for a large multi-page app with a team/academic structure.

**Q. Why Express + TypeScript?**  
A. Lightweight Node API, fast to build REST + Socket.io on one server; TypeScript reduces bugs for a PFE-sized codebase.

**Q. Describe the architecture in one minute.**  
A. Angular SPA talks to Express REST under `/api`. Auth via JWT in HttpOnly cookie. Prisma persists to SQLite. Same HTTP server hosts Socket.io for live play and chat. chess.js validates moves server-side; Stockfish powers bots and analysis.

**Q. What is MVC / layered design here?**  
A. Routes → Controllers (HTTP) → Services (business) → Prisma/engines. UI never touches the DB.

**Q. Why Prisma?**  
A. Schema-first models, typed client, less raw SQL errors; easy to switch SQLite → PostgreSQL later.

**Q. Why SQLite?**  
A. Zero ops for demo/dev; one file. Limit: heavy concurrent writes. Production: PostgreSQL.

**Q. What would you change for production?**  
A. PostgreSQL, Redis for queues/sessions, process manager, HTTPS, rate limits, puzzle CDN/import, horizontal scaling with sticky sessions or Redis adapter for Socket.io.

## D2. Security

**Q. How do you store passwords?**  
A. bcrypt hashes only; never plaintext.

**Q. How does login work?**  
A. Verify password → sign JWT → Set-Cookie HttpOnly, SameSite=Lax → browser sends cookie on later requests → middleware reads cookie → `req.user`.

**Q. Why not localStorage for the JWT?**  
A. Any XSS can steal localStorage tokens. HttpOnly cookies are not readable from JavaScript.

**Q. What is XSS / CSRF in your context?**  
A. XSS: inject script to steal data — mitigated by not exposing JWT to JS, Helmet, careful rendering. CSRF: cross-site form posting cookies — SameSite=Lax reduces risk; sensitive actions are same-site SPA + JSON API.

**Q. How do you protect API routes?**  
A. `verifyToken` middleware: require valid JWT from cookie (or Bearer). Unauthorized → 401.

**Q. What about email verification?**  
A. Optional via env. With SMTP, user must verify. In local dev without SMTP, auto-verify so demos work.

**Q. Can someone cheat by editing the frontend?**  
A. They can send fake moves, but the **server** validates with chess.js and turn/player checks. UI trust is zero for rules.

## D3. Real-time & games

**Q. Why Socket.io instead of only REST?**  
A. Moves and matchmaking need push updates. REST would require polling (slow, heavy).

**Q. What happens when a player moves?**  
A. Client emits move → server checks identity, turn, legality → save Move + FEN → emit to room → opponent UI updates; bot may respond via Stockfish.

**Q. What if a player disconnects?**  
A. Presence/socket handlers; leaving can forfeit active games so queues stay fair (demo policy).

**Q. How does matchmaking work?**  
A. Players join a queue (time control). Server pairs waiting players and creates a Game, then notifies both sockets.

**Q. How is the bot implemented?**  
A. Special open-seat user as opponent; engine chooses moves by difficulty/depth.

**Q. FEN vs PGN?**  
A. FEN = one position. PGN = full game notation/history. We store FEN for live state and moves for replay.

## D4. Puzzles

**Q. How are puzzles stored?**  
A. Table `Puzzle`: FEN, JSON array of SAN moves, theme, rating. User progress in `UserPuzzleStats`.

**Q. How do you validate puzzle quality?**  
A. Seed runs chess.js on every line; rejects illegal FENs, king captures, mate themes that don’t mate.

**Q. What is multi-ply solving?**  
A. Player move → auto opponent reply from line → next player move until line ends; wrong move resets.

**Q. Why compare positions instead of SAN strings?**  
A. chess.js may print `Rxe1` while seed has `Re1+`; same move, different text — comparing resulting FEN avoids false “wrong”.

## D5. AI / Stockfish

**Q. What is Stockfish?**  
A. Strong open-source chess engine. We use it for bot play and analysis suggestions.

**Q. What if Stockfish fails?**  
A. Fallbacks / heuristics in AI service so the app doesn’t fully break (depending on feature).

**Q. Is your “AI coach” a neural LLM?**  
A. No — engine evaluation + rule-based coaching around positions/mistakes (be honest if that’s how it’s built).

## D6. Frontend specifics

**Q. What are Angular guards?**  
A. `authGuard` blocks private pages without session; `guestGuard` sends logged-in users away from login/register.

**Q. What is lazy loading?**  
A. Pages load on demand (`loadComponent`) → smaller first download.

**Q. What does the HTTP interceptor do?**  
A. Clones requests with `withCredentials: true` so cookies are always sent.

**Q. Why the dev proxy?**  
A. Cookie auth is same-site. Proxy makes browser talk only to `:4200` while Node serves API on `:3000`.

**Q. localhost vs 127.0.0.1?**  
A. Different hosts for cookies. Mixing them broke login (200 then 401 on `/me`). Always use one, preferably localhost with proxy.

## D7. Data & Elo

**Q. How is Elo updated?**  
A. After finished rated games, compute expected score vs opponent rating, adjust (classic Elo). Separate ratings for bullet/blitz/rapid by time control.

**Q. What is stored per move?**  
A. Game id, move number, from/to squares, piece, promotion, resulting FEN, timestamp.

## D8. Testing & quality

**Q. How did you test?**  
A. Manual demo flows; API via browser/network logs; chess.js validation at puzzle seed; fix bugs found in rehearsal (auth cookie, puzzles, matchmaking edge cases).

**Q. Known limitations?**  
A. SQLite concurrency; single Node process; puzzle bank size; Stockfish CPU cost; email needs real SMTP in production.

## D9. Project management / PFE

**Q. What was hardest?**  
A. Pick honestly: real-time sync, cookie auth across ports, or legal multi-move puzzles.

**Q. What did you learn?**  
A. Full-stack ownership: security of sessions, server-authoritative game rules, UX of training tools.

**Q. If you had one more month?**  
A. PostgreSQL, more puzzles (Lichess import), automated tests, better mobile layout, stronger tournament UX.

---

# Part E — Demo script (8–10 minutes)

1. **Register or login** (show cookie session works → dashboard).  
2. **Lobby** → vs bot or second account → play 3–4 moves → resign.  
3. **History** → open **replay**.  
4. **Puzzles** → solve a mate-in-1, show a mate-in-2 multi-ply, theme filter, hint.  
5. **Dashboard / leaderboard** briefly.  
6. Optional: **tournament** create + 2 players + start.  
7. Close with **limits + future work** (30 seconds).

Have **two accounts** ready with similar Elo and the same time control.

---

# Part F — Quick “if they interrupt you” cheat sheet

| Topic | One sentence |
|-------|----------------|
| Architecture | Angular ↔ Express ↔ Prisma/SQLite + Socket.io |
| Auth | bcrypt + JWT in HttpOnly cookie |
| Fair play | Server validates every move with chess.js |
| Live | Socket.io rooms per game |
| Puzzles | Seed-validated SAN lines, multi-ply solve |
| AI | Stockfish engine |
| Scale limit | SQLite + one Node process |
| Cookie bug we fixed | Same-origin proxy; don’t mix localhost/127.0.0.1 |

---

# Part G — Env flags you may mention

| Variable | Role |
|----------|------|
| `DATABASE_URL` | SQLite path for Prisma |
| `JWT_SECRET` / `JWT_EXPIRES_IN` | Sign tokens |
| `REQUIRE_EMAIL_VERIFICATION` | Force verify before login |
| `DEV_AUTO_VERIFY_EMAIL` | Local convenience |
| `COOKIE_SECURE` | HTTPS-only cookies in production |
| `FRONTEND_URL` | Links in emails |

---

*File: `docs/GUIDE-COMPLET-COMPRENDRE-ET-DEFENDRE.md` — study companion for understanding the codebase and defending the PFE.*
