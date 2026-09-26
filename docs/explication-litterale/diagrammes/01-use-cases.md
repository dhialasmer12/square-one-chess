# Use-case diagrams (literal)

PlantUML sources: `docs/uml/01-use-case.puml`, `UC-*.puml`.

A **use-case diagram** answers: *who* (actor, stick figure) can do *what* (oval) inside the system (rectangle). An arrow from an actor to an oval means “this person uses that feature”. There is no invented “browse without account” oval: the Angular app has no such page.

---

## 1. Global use-case — `01-use-case.puml` / `fig-usecase-global.png`

**Title:** Global use-case diagram — Square One Chess.

**System box:** `Square One Chess` = the whole web application (Angular client + Express API + Socket.io).

### Actors (outside the box)

| Actor | Who it is in the app | What they are allowed to do |
|-------|----------------------|-----------------------------|
| **Visitor** | Not logged in (guest) | Only **Register** and **Log in** |
| **Player** | Logged-in user (JWT cookie) | All player ovals listed below |
| **Administrator** | A player whose email/id is in the admin list (`isAdminUser`) | Only **View platform analytics** |

### Ovals (use cases) and where they live in the app

| Oval on the diagram | Literal meaning | Route / UI |
|---------------------|-----------------|------------|
| Register | Create an account (username, email, password) | `/register`, `POST /api/auth/register` |
| Log in | Open a session | `/login`, `POST /api/auth/login` |
| Manage profile | See / edit username, email, etc. | `/profile` |
| Play online games | Live PvP or vs bot, with clock | `/lobby`, `/game/:id` |
| View and replay games | History list + move-by-move replay | `/history`, `/replay/:id` |
| Solve puzzles | Tactical trainer (multi-ply) | `/puzzles` |
| Review a finished game | AI review of a stored game | `/review/:id` |
| Take part in tournaments | Create / join / play bracket | `/tournaments` |
| Manage friends and chat | Friend requests + global/DM chat | Chat button bottom-right (`app-chat-sidebar`) |
| View the leaderboard | Elo ranking | `/leaderboard` |
| View dashboard statistics | Personal stats dashboard | `/dashboard` (player mode) |
| View platform analytics | Global charts for admin | `/dashboard` (admin mode) |

### Arrows (read them one by one)

- Visitor → Register  
- Visitor → Log in  
- Player → Manage profile  
- Player → Play online games  
- Player → View and replay games  
- Player → Solve puzzles  
- Player → Review a finished game  
- Player → Take part in tournaments  
- Player → Manage friends and chat  
- Player → View the leaderboard  
- Player → View dashboard statistics  
- Administrator → View platform analytics  

No other arrows exist. The administrator does not get a separate “play” oval: he is also a player account, but the **diagram only shows the extra admin feature**.

---

## 2. Register — `UC-register.puml` / `fig-uc-register.png` (also `UC-01-inscrire.puml`)

**Literal picture:** one actor **Visitor**, one oval **Register**, one arrow Visitor → Register.

It is the zoom of the global oval “Register”. Nothing else is on this figure (no login, no profile).

---

## 3. Manage account — `UC-manage-account.puml` / `fig-uc-manage-account.png`

**Actor:** Player (already has an account).

**Ovals:**

| Oval | Literal meaning |
|------|-----------------|
| Log in | Open the session (`/login`) |
| Log out | Clear the HttpOnly cookie (`POST /api/auth/logout`) |
| Manage profile | Edit account on `/profile` |

**Arrows:** Player → each of those three ovals.

---

## 4. Play online games — `UC-play.puml` / `fig-uc-play.png`

**Actor:** Player.

**Ovals:**

| Oval | Literal meaning |
|------|-----------------|
| Play online games | Queue / open seat vs another human, then live board |
| Play against the engine | Same game screen, opponent is Stockfish (`botDifficulty`) |

**Arrows:** Player → both ovals. Two ways to play, same domain (a `Game` row).

---

## 5. Matchmaking, history and replay — `UC-match-history.puml` / `fig-uc-match-history.png`

**Actor:** Player.

**Ovals (typical grouping in this file):** join matchmaking, consult history, replay a game.

**Literal meaning:** finding an opponent (`queue:join` on Socket.io), listing finished games (`/history`), stepping through stored `Move` rows (`/replay/:id`). These three belong to the same “competition + archive” area. They are **not** puzzles and **not** tournaments.

---

## 6. Communicate with players — `UC-social.puml` / `fig-uc-social.png`

**Actor:** Player.

**Oval:** Communicate with players.

**Literal meaning:** the social sidebar: send friend request by username, accept/decline incoming, list friends, global chat, private DM (only if friendship is accepted). APIs: `/api/friends`, `/api/chat`, Socket.io events `friends:*` and chat events.

---

## 7. Tournaments — `UC-tournament.puml` / `fig-uc-tournament.png`

**Actor:** Player.

**Oval:** Take part in tournaments (create / join / play event matches).

**Literal meaning:** `/tournaments`, `Tournament` + `TournamentRegistration` + `TournamentMatch` linked to a `Game`.

---

## 8. Train at chess — `UC-train.puml` / `fig-uc-train.png`

**Actor:** Player.

**Ovals:** solve puzzles (and related training: engine game is already under Play; review is its own global oval).

**Literal meaning:** `/puzzles`, table `Puzzle` / `UserPuzzleStats` / `DailyPuzzle`. The solution SAN line stays on the server.

---

## 9. Statistics and administration — `UC-stats-admin.puml` / `fig-uc-stats-admin.png`

**Actors:** Player and Administrator.

**Ovals:** player leaderboard / personal stats vs admin platform analytics.

**Literal meaning:** `/leaderboard` and `/dashboard` for the player; `/api/analytics/*` only if `requireAdmin` passes.
