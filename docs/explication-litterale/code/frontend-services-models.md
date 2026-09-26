# Frontend services, models, constants

---

## Services (`frontend/src/app/services/`)

Angular injectables. They call HTTP (`environment.API_URL + '/api/...'`) or Socket.io. They do **not** contain chess rules of record (the server does).

| File | Literal job |
|------|-------------|
| `auth.service.ts` | register, login, logout, `me()`, hold current user, `isLoggedIn` |
| `socket.service.ts` | Create the Socket.io client (same origin / `WS_URL`), auth handshake |
| `game-play.service.ts` | Join game room, emit `game:move`, listen `game:moved` / `game:end`, clocks |
| `matchmaking.service.ts` | `queue:join` / leave, `match:found` |
| `queue.service.ts` | UI state: am I waiting? |
| `lobby-data.service.ts` | Lobby extras (open games, presets) |
| `game-history.service.ts` | `GET` history pages |
| `replay.service.ts` | Load moves for replay page |
| `puzzle.service.ts` | daily/random/solve/hint HTTP + `lineIndex` helpers |
| `friend-api.service.ts` | `GET/POST/PUT/DELETE /api/friends` |
| `social-chat.service.ts` | Socket chat + presence events |
| `tournament-api.service.ts` | Tournaments REST |
| `profile.service.ts` | Profile GET/PUT |
| `leaderboard.service.ts` | Leaderboard GET |
| `analytics-dashboard.service.ts` | Admin analytics GET |
| `ai-suggestion.service.ts` | Predict move, review, skill estimate, lessons |
| `game-sound.service.ts` | Move / capture / end sounds |

---

## Models (`frontend/src/app/models/`)

TypeScript interfaces copied from the API (`src/types/index.ts`). Keep in sync when the API changes.

| File | Types for |
|------|-----------|
| `index.ts` | Re-exports all models |
| `auth.model.ts` | User session, login/register bodies |
| `game.model.ts` | Game, move, session, clocks |
| `game-history.model.ts` | History rows / pagination |
| `lobby.model.ts` | Queue / time control |
| `profile.model.ts` | Profile DTO |
| `social.model.ts` | Friend, FriendListResponse, chat message |
| `tournament.model.ts` | Tournament, bracket, registration |
| `ai.model.ts` | Skill estimate, review moves, lessons |
| `analytics.model.ts` | Admin chart DTOs |

---

## Constants

| File | Literal |
|------|---------|
| `frontend/src/app/constants/time-controls.ts` | Same lobby presets as the backend |
| `frontend/src/app/constants/system.ts` | Shared flags / bot user id if needed |

---

## Styles (global)

| File | Literal |
|------|---------|
| `frontend/src/styles.scss` (if present) | Tailwind + global CSS |
| Page/component `.scss` | Local layout only |
