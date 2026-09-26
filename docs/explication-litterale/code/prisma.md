# Prisma and database files

---

## `prisma/schema.prisma`

This is the **only** source of truth for the SQLite schema. `npx prisma migrate` / `generate` read this file.

- **generator client** — produces `@prisma/client` used in `src/models/prisma.ts`.
- **datasource db** — `provider = "sqlite"`, URL from `.env` `DATABASE_URL`.

**Models (tables), literally:**

| Model | Why it exists |
|-------|----------------|
| `User` | Accounts: credentials, Elo by time class, win counters, e-mail/reset tokens |
| `Friend` | Friend request / accepted link between two users |
| `ChatMessage` | Global or DM chat lines |
| `Game` | One chess game (PvP or bot) |
| `Move` | One ply for replay (`fromSquare`/`toSquare` because `from`/`to` are reserved) |
| `QueueEntry` | Matchmaking wait row |
| `Tournament` | Event header |
| `TournamentRegistration` | Player joined an event |
| `TournamentMatch` | One bracket pairing, optional `gameId` |
| `TournamentMessage` | Chat in a tournament |
| `Puzzle` | Trainer: FEN + SAN line + theme + rating |
| `DailyPuzzle` | Puzzle of the day |
| `UserPuzzleStats` | Per-user solve attempts |

Relations match the domain class diagram (`02-class-domain.puml`).

---

## `prisma/seed.ts`

Run with `npm run prisma:seed`. Creates demo users, sample games, and other demo rows so the lobby / history / login work without typing everything by hand. It typically calls or sits next to puzzle seeding.

---

## `prisma/puzzles.seed.ts`

Dedicated puzzle bank. Each puzzle is a FEN + a SAN **line** (several plies). The seed **validates** positions with chess.js (illegal FEN / illegal line is rejected). After seed, `/puzzles` has real tactics, not empty placeholders.
