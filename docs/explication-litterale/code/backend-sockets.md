# Backend sockets (`src/sockets/`)

Socket.io is attached in `server.ts`. All events below require a valid JWT (same cookie/token as REST).

---

## `src/sockets/io.ts`

Holds the global `Server` instance.

- `setSocketServer(io)` — called once at boot.
- `getSocketServer()` — other modules emit (`match:found`, chat, …).

---

## `src/sockets/game.socket.ts`

**The live-play file.** Registers `io.on('connection', ...)`.

Main pieces:

| Piece | Literal |
|-------|---------|
| JWT on handshake | Rejects anonymous sockets |
| `waitingQueue` | In-memory matchmaking list `{ userId, socketId, elo, timeControl }` |
| `findMatchablePair` | Same time control + Elo within `MATCHMAKING_ELO_RANGE` |
| Interval matcher | Periodically pairs two waiting players, `createGame`, emit `match:found` |
| `queue:join` / `queue:leave` | Enter / leave queue |
| `game:join` | Socket joins room `game:{id}` |
| `game:move` | → `gameService.makeMove` → broadcast `game:moved` / `game:end` |
| Resign / draw events | Map to game.service |
| Disconnect grace 8s | Then `abortGameByDisconnect` if still gone |
| Also calls | `registerSocialChatHandlers` on the same connection |

Open-seat / bot: a player can start vs engine without a second human in the queue.

---

## `src/sockets/social.socket.ts`

Friends + chat on the **same** socket.

| Function / event | Literal |
|------------------|---------|
| `onSocialConnect` | Snapshot of online friend ids; broadcast “I am online” |
| `onSocialDisconnect` | Broadcast offline |
| `friends:presence` / `friends:online-snapshot` | Green dots on the friends list |
| Chat send | Persist + emit to room; **DM requires** `assertFriendship` |
| History request | Last messages for a room |

---

## `src/sockets/presence.ts`

In-memory set of online user ids.

- `presenceMarkOnline` / `Offline`
- `isUserOnline` / `getOnlineUserIds`
- `emitToUser(io, userId, event, payload)` — send to that user’s sockets

---

## `src/sockets/active-games.ts`

Map `gameId →` who is connected, clocks, etc. Used so a move is broadcast only to the two players of that game.

---

## `src/sockets/chat-memory.ts`

Small RAM cache of recent messages per `roomId` (`push` / `get` / `seed`) so the sidebar feels instant while DB is the source of truth.
