# Frontend components (`frontend/src/app/components/`)

Reusable pieces used inside pages. `.html` / `.scss` next to `.ts` are only the view and CSS of that component.

---

## `index.ts`

Barrel re-export of some components so pages can import from one path.

---

## Chess board

| File | Literal |
|------|---------|
| `chess-board.component.ts` | Draws 64 squares, pieces, click/drag to move; emits the chosen from/to |
| `chess-board.component.html` | Grid markup |
| `chess-board.component.scss` | Square colours, sizes |
| `chess-board.models.ts` | Types: square id, piece, board orientation |
| `chess-board.module.ts` | Legacy NgModule wrapper if still imported somewhere |

Used by live game, puzzles, replay, review.

---

## Social

| File | Literal |
|------|---------|
| `chat-sidebar.component.ts` | Root of friends+chat: expand/collapse, load friends, send request, pick DM, send global/DM |
| `chat-sidebar.component.html` | “Chat” button bottom-right, Incoming / Sent / Friends, message log |
| `chat-sidebar.component.scss` | Panel size, z-index |
| `friends-list.component.ts` | Presentational list: Accept/Decline, online dots |
| `friends-list.component.html` | Incoming / Sent / Friends blocks |
| `game-chat.component.ts` | Chat **inside** a live game (room `game:{id}`) |
| `game-chat.component.html` / `.scss` | Game chat UI |

---

## Replay / training extras

| File | Literal |
|------|---------|
| `replay-mode.component.ts` | Buttons first/prev/next/last over a `Move[]` |
| `replay-mode.component.html` / `.scss` | Controls under the board |
| `skill-estimate-modal.*` | Modal after games: estimated skill (AI service) |
| `lesson-recommendation.*` | List of lessons from `recommendLessons` |
| `edit-profile-modal.component.ts` | Dialog to change username/email |
| `auth-shell.component.ts` | Layout wrapper for login/register (centred card) |
| `user-profile-card.component.ts` | Avatar / name / Elo card |
| `recent-games.component.ts` | Mini list of last games (dashboard) |
| `queue-status.component.ts` | “Waiting for opponent…” on lobby |
| `leaderboard-preview.component.ts` | Top N Elo on dashboard |

---

## Analytics dashboard (admin)

Chart.js widgets fed by `/api/analytics`:

| File | Chart |
|------|--------|
| `stats-cards.component.ts` | Totals (users, games) |
| `user-growth-chart.component.ts` | Users over time |
| `game-volume-chart.component.ts` | Games per day |
| `elo-distribution-chart.component.ts` | Elo buckets |
| `opening-pie-chart.component.ts` | Opening share |
| `activity-heatmap.component.ts` | When people play |
