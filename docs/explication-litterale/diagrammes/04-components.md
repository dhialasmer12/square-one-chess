# Component / deployment diagram (literal)

Source: `docs/uml/06-component.puml` / `fig-component.png`.

This figure is a **deployment** view: *where* things run, not UML classes.

---

## Nodes (machines / processes)

### Node “Navigateur”

**SPA Angular 17 + Tailwind + chess.js**

- Runs in the user’s browser on `http://localhost:4200` in development.
- Draws pages (login, lobby, board, puzzles, …).
- chess.js on the client is only for **display** (legal highlights). The server still validates.

### Node “Serveur Node.js” (port 3000)

Four inner boxes:

| Box | File / role |
|-----|-------------|
| Express API `/api/*` | `src/app.ts` + `src/routes/*` |
| Socket.io | `src/server.ts` + `src/sockets/*` |
| Services métier | `src/services/*` (auth, game, puzzle, …) |
| Prisma ORM | `src/models/prisma.ts` |

### Database “SQLite”

File database (Prisma `DATABASE_URL`). Tables = User, Game, Move, Friend, … as in the domain class diagram.

### Cloud “Email (Nodemailer)”

Optional. Used for verification / password reset (`src/services/email.service.ts`). If not configured, local register can auto-verify.

### Cloud “Stockfish (optionnel)”

Chess engine (`src/services/stockfish-engine.service.ts`): bot games + analysis / review.

---

## Arrows (read them)

| From → To | Label on the diagram | Literal meaning |
|-----------|----------------------|-----------------|
| SPA → Express | HTTP REST (JSON + cookies) | `fetch` / Angular `HttpClient` to `/api/...` with credentials so the HttpOnly JWT cookie is sent |
| SPA → Socket.io | WebSocket (parties, queue, chat) | live moves, matchmaking, presence, chat |
| Express → Services | (unlabelled) | Controllers call services |
| Socket.io → Services | (unlabelled) | `game.socket` / `social.socket` call GameService, FriendService, … |
| Services → Prisma | | SQL via ORM |
| Prisma → SQLite | | persist rows |
| Services → Email | vérification / reset MDP | Nodemailer |
| Services → Stockfish | analyse moteur | engine process |

There is **no** arrow from the browser straight to SQLite. The browser never talks to Stockfish directly either.
