# Spécification — Parties live avancées

> **Stack réelle du dépôt** : Node.js + Express + Socket.IO, **Angular 17** (pas React), **SQLite + Prisma**, JWT + cookie HttpOnly.  
> **Déjà en place** : `game:join`, reconnexion via `connect` → `gamePlay.joinGame()`, `game:opponent-away` + grâce 8s, `presence.ts` (online en mémoire).  
> **À ajouter** : spectateur différé, sync horloges en BDD, heartbeat `lastSeen`, timer inactivité serveur.

---

## 1. Événements Socket.IO (contrat)

### Connexion (inchangé + extensions)

| Événement | Direction | Payload | Réponse / ack |
|-----------|-----------|---------|----------------|
| `presence:heartbeat` | C→S | `{ }` | — |
| `game:join` | C→S | `{ gameId }` | `{ ok, game, myColor, opponent, … }` |
| `game:rejoin` | C→S | `{ gameId? }` | `{ ok, sync: GameSyncState }` — alias enrichi de `game:join` |
| `game:leave` | C→S | `{ gameId? }` | `{ ok }` |
| `spectate:join` | C→S | `{ gameId, delayMoves?: number }` | `{ ok, role: 'spectator', delayMoves, sync }` |
| `spectate:leave` | C→S | `{ gameId? }` | `{ ok }` |
| `game:move` | C→S | `{ gameId, from, to, promotion? }` | `{ ok, game }` |
| `game:resign` | C→S | `{ gameId }` | REST ou socket selon implémentation |

### Diffusion serveur → clients

| Événement | Cible | Payload |
|-----------|-------|---------|
| `game:moved` | joueurs + spectateurs (filtré) | `{ gameId, from, to, promotion, game, clock? }` |
| `spectate:move` | room `spectate:{gameId}` | même que `game:moved` mais **décalé** |
| `game:sync_state` | un socket | `GameSyncState` (reconnexion) |
| `game:end` | tous | `{ winner, reason, game }` |
| `game:opponent-away` | adversaire | `{ gameId, userId, graceMs }` |
| `game:opponent-back` | adversaire | `{ gameId, userId }` |
| `game:opponent-status` | partie | `{ gameId, userId, online, lastSeen }` |
| `game:inactivity-warning` | joueur actif | `{ gameId, secondsLeft }` |
| `live:games` | lobby spectateur | `{ games: LiveGameSummary[] }` |

### Types TypeScript partagés

```typescript
// src/types/live-game.ts

export type GameEndReason =
  | 'checkmate'
  | 'resign'
  | 'draw'
  | 'disconnect'
  | 'inactivity_timeout'
  | 'abort';

export interface ClockState {
  whiteMs: number;
  blackMs: number;
  /** Qui doit jouer : 'w' | 'b' */
  turn: 'w' | 'b';
  /** Date serveur du dernier tick / coup */
  lastTickAt: string; // ISO
  /** Pause horloge (reconnexion, grâce) jusqu'à cette date */
  pausedUntil?: string | null;
}

export interface GameSyncState {
  gameId: string;
  status: 'waiting' | 'in_progress' | 'finished';
  fen: string;
  moves: Array<{ san: string; from: string; to: string; fen: string }>;
  clock: ClockState;
  myColor?: 'white' | 'black';
  role: 'player' | 'spectator';
  opponent?: { id: string; username: string; online: boolean; lastSeen: string | null };
  endReason?: GameEndReason;
}

export interface LiveGameSummary {
  gameId: string;
  whiteUsername: string;
  blackUsername: string;
  timeControl: string;
  moveCount: number;
  spectatorCount: number;
}
```

---

## 2. Schéma BDD (Prisma — extension)

```prisma
model User {
  // ... existant
  lastSeenAt DateTime?
  // isOnline : calculé côté serveur (heartbeat), pas obligatoire en BDD
}

model Game {
  // ... existant
  status        String    @default("waiting")  // ajouter "in_progress" explicitement
  endReason     String?   // inactivity_timeout | disconnect | ...
  whiteClockMs  Int?
  blackClockMs  Int?
  clockTurn     String?   // "w" | "b"
  clockLastTick DateTime?
  clockPausedUntil DateTime?
}

model GameSpectator {
  id          String   @id @default(uuid())
  gameId      String
  userId      String
  delayMoves  Int      @default(2)
  joinedAt    DateTime @default(now())
  game        Game     @relation(fields: [gameId], references: [id], onDelete: Cascade)
  @@unique([gameId, userId])
}
```

**État en mémoire (serveur)** — complète la BDD pour le différé spectateur :

```typescript
// src/sockets/spectator-delay.ts
type DelayedMove = { payload: GameMovedPayload; deliverAfter: number };

type SpectatorSession = {
  socketId: string;
  userId: string;
  delayMoves: number;
  /** Nombre de coups déjà « livrés » à ce spectateur */
  deliveredCount: number;
};

type GameLiveRuntime = {
  moveHistory: GameMovedPayload[];      // tous les coups joués
  spectatorQueues: Map<string, DelayedMove[]>; // socketId -> file
  inactivityTimer?: NodeJS.Timeout;
  lastActivityAt: { white: number; black: number };
};
```

---

## 3. Backend — Spectateur avec délai

### 3.1 Module délai

```typescript
// src/sockets/spectator-delay.ts
import type { Server, Socket } from 'socket.io';

const runtime = new Map<string, GameLiveRuntime>();

export function onPlayerMove(
  io: Server,
  gameId: string,
  movePayload: GameMovedPayload
): void {
  const rt = runtime.get(gameId) ?? {
    moveHistory: [],
    spectatorQueues: new Map(),
  };
  rt.moveHistory.push(movePayload);
  runtime.set(gameId, rt);

  // Joueurs : immédiat (room game:{id} sans rôle spectateur)
  io.to(`game:${gameId}:players`).emit('game:moved', movePayload);

  // Spectateurs : enqueue avec délai = delayMoves coups
  for (const [socketId, session] of getSpectators(gameId)) {
    const queue = rt.spectatorQueues.get(socketId) ?? [];
    const deliverIndex = rt.moveHistory.length - 1 - session.delayMoves;
    if (deliverIndex >= session.deliveredCount) {
      queue.push({ payload: movePayload, deliverAfter: deliverIndex });
      rt.spectatorQueues.set(socketId, queue);
      flushSpectatorQueue(io, gameId, socketId, session, rt);
    }
  }
}

function flushSpectatorQueue(
  io: Server,
  gameId: string,
  socketId: string,
  session: SpectatorSession,
  rt: GameLiveRuntime
): void {
  const queue = rt.spectatorQueues.get(socketId) ?? [];
  while (queue.length && session.deliveredCount < rt.moveHistory.length - session.delayMoves) {
    const next = queue.shift()!;
    io.to(socketId).emit('spectate:move', next.payload);
    session.deliveredCount++;
  }
}
```

### 3.2 Handler `spectate:join`

```typescript
// Dans game.socket.ts (extrait)
socket.on('spectate:join', async ({ gameId, delayMoves = 2 }, ack) => {
  const game = await prisma.game.findUnique({ where: { id: gameId } });
  if (!game || game.status !== 'in_progress') {
    return ack?.({ ok: false, error: 'Game not spectatable' });
  }
  const delay = Math.max(0, Math.min(10, Number(delayMoves) || 0));

  await socket.join(`spectate:${gameId}`);
  socket.data.spectatingGameId = gameId;
  socket.data.spectatorDelay = delay;

  const history = await gameService.getMoveHistoryVerbose(gameId);
  const sync = await buildGameSyncState(gameId, { role: 'spectator' });

  // État initial : ne montrer que (totalMoves - delay) premiers coups
  const visibleMoves = history.slice(0, Math.max(0, history.length - delay));
  ack?.({
    ok: true,
    role: 'spectator',
    delayMoves: delay,
    sync: { ...sync, moves: visibleMoves },
  });

  registerSpectator(gameId, socket.id, userId, delay);
});

socket.on('spectate:leave', async (_p, ack) => {
  const gameId = socket.data.spectatingGameId;
  if (gameId) {
    unregisterSpectator(gameId, socket.id);
    await socket.leave(`spectate:${gameId}`);
    delete socket.data.spectatingGameId;
  }
  ack?.({ ok: true });
});

// disconnect : même nettoyage que spectate:leave
```

### 3.3 REST — parties spectables

```typescript
// GET /api/games/live
export async function listLiveGames(): Promise<LiveGameSummary[]> {
  return prisma.game.findMany({
    where: { status: 'in_progress' },
    select: {
      id: true,
      timeControl: true,
      whitePlayer: { select: { username: true } },
      blackPlayer: { select: { username: true } },
      _count: { select: { moves: true } },
    },
  }).then((rows) =>
    rows.map((g) => ({
      gameId: g.id,
      whiteUsername: g.whitePlayer.username,
      blackUsername: g.blackPlayer.username,
      timeControl: g.timeControl,
      moveCount: g._count.moves,
      spectatorCount: getSpectatorCount(g.id),
    }))
  );
}
```

---

## 4. Backend — Reconnexion & sync état

### 4.1 Persistance horloge à chaque coup

```typescript
// game.service.ts — après makeMove réussi
async function persistClock(gameId: string, clock: ClockState): Promise<void> {
  await prisma.game.update({
    where: { id: gameId },
    data: {
      status: 'in_progress',
      whiteClockMs: clock.whiteMs,
      blackClockMs: clock.blackMs,
      clockTurn: clock.turn,
      clockLastTick: new Date(clock.lastTickAt),
      clockPausedUntil: clock.pausedUntil ? new Date(clock.pausedUntil) : null,
      fen: clock.fenAfterMove,
    },
  });
}
```

### 4.2 `game:rejoin` / enrichir `game:join`

```typescript
socket.on('game:rejoin', async (payload, ack) => {
  const gameId = payload?.gameId ?? (await findActiveGameForUser(userId))?.id;
  if (!gameId) return ack?.({ ok: false, error: 'No active game' });

  const game = await loadGameOrThrow(gameId);
  if (game.status === 'finished') {
    return ack?.({ ok: false, error: 'Game finished', game });
  }

  // Pause horloge 5s (délai de grâce reconnexion)
  const clock = await pauseClock(gameId, RECONNECT_GRACE_MS);

  await socket.join(`game:${gameId}:players`);
  socket.data.activeGameId = gameId;

  const sync = await buildGameSyncState(gameId, { userId, role: 'player' });
  io.to(`game:${gameId}`).emit('game:opponent-back', { gameId, userId });

  ack?.({ ok: true, sync, reconnectGraceMs: RECONNECT_GRACE_MS });
});

async function findActiveGameForUser(userId: string) {
  return prisma.game.findFirst({
    where: {
      status: 'in_progress',
      OR: [{ whitePlayerId: userId }, { blackPlayerId: userId }],
    },
    orderBy: { startedAt: 'desc' },
  });
}
```

**Cas limites reconnexion**

| Cas | Comportement |
|-----|----------------|
| Deux onglets reconnectent en même temps | Ref-count sockets par `userId` ; un seul `activeGameId` ; dernier `game:rejoin` gagne pour le socket courant |
| Reconnexion après fin de partie | `ack` erreur + redirect historique |
| Adversaire a abandonné pendant la coupure | `sync.status === 'finished'`, `endReason: 'resign'` |
| Reconnexion pendant `clockPausedUntil` | Horloge figée jusqu’à expiry ; pas de décrément pendant la pause |

---

## 5. Backend — Présence adversaire

### 5.1 Heartbeat + REST

```typescript
// presence.ts — extension
const lastSeen = new Map<string, number>();

export function touchPresence(userId: string): void {
  lastSeen.set(userId, Date.now());
  presenceMarkOnline(userId);
}

export function getPresence(userId: string): { online: boolean; lastSeen: string | null } {
  const ts = lastSeen.get(userId);
  const online = isUserOnline(userId) && ts != null && Date.now() - ts < 60_000;
  return {
    online,
    lastSeen: ts ? new Date(ts).toISOString() : null,
  };
}

// game.socket.ts
socket.on('presence:heartbeat', () => touchPresence(userId));

// GET /api/users/:id/status
router.get('/:id/status', verifyToken, async (req, res) => {
  res.json(getPresence(req.params.id));
});
```

### 5.2 En partie

```typescript
// Toutes les 15s dans la room game:{id}
setInterval(() => {
  for (const gameId of activeGames.keys()) {
    const entry = activeGames.get(gameId)!;
    const white = getPresence(entry.white.userId);
    const black = getPresence(entry.black.userId);
    io.to(`game:${gameId}`).emit('game:opponent-status', {
      gameId,
      white,
      black,
    });
  }
}, 15_000);
```

---

## 6. Backend — Inactivité & abandon auto

```typescript
const INACTIVITY_MS = 60_000;
const WARN_BEFORE_MS = 15_000;

function resetInactivityTimer(io: Server, gameId: string, color: 'white' | 'black'): void {
  const rt = getRuntime(gameId);
  rt.lastActivityAt[color] = Date.now();
  clearTimeout(rt.inactivityTimer);

  const warnAt = INACTIVITY_MS - WARN_BEFORE_MS;
  setTimeout(() => {
    io.to(`game:${gameId}:players`).emit('game:inactivity-warning', {
      gameId,
      color,
      secondsLeft: Math.ceil(WARN_BEFORE_MS / 1000),
    });
  }, warnAt);

  rt.inactivityTimer = setTimeout(async () => {
    const game = await prisma.game.findUnique({ where: { id: gameId } });
    if (!game || game.status !== 'in_progress') return;
    const loser = color;
    const winner = loser === 'white' ? 'black' : 'white';
    const final = await gameService.finishByInactivity(gameId, winner);
    io.to(`game:${gameId}`).emit('game:end', {
      winner: final.winner,
      reason: 'inactivity_timeout',
      game: final,
    });
    cleanupGameRuntime(gameId);
  }, INACTIVITY_MS);
}

// Appeler resetInactivityTimer après chaque game:move réussi
// pour le joueur qui VIENT de jouer → reset timer de l'adversaire (c'est son tour)
```

```typescript
// game.service.ts
export async function finishByInactivity(gameId: string, winnerColor: 'white' | 'black') {
  return prisma.game.update({
    where: { id: gameId },
    data: {
      status: 'finished',
      winner: winnerColor,
      endReason: 'inactivity_timeout',
      endedAt: new Date(),
    },
  });
}
```

---

## 7. Frontend — Angular (équivalent de vos hooks React)

> Votre projet utilise déjà `game-page.component.ts` + `game-play.service.ts`. Voici le pattern à ajouter.

### 7.1 Service socket (reconnexion)

```typescript
// frontend/src/app/services/game-live.service.ts
@Injectable({ providedIn: 'root' })
export class GameLiveService {
  opponentOnline = signal(false);
  opponentLastSeen = signal<string | null>(null);
  inactivitySecondsLeft = signal<number | null>(null);
  spectatorDelay = signal(0);
  isSpectator = signal(false);

  constructor(private sockets: SocketService) {}

  bindGameRoom(gameId: string): void {
    const s = this.sockets.connect();
    s.on('connect', () => this.rejoin(gameId));
    s.on('game:sync_state', (sync) => this.applySync(sync));
    s.on('game:opponent-status', (p) => {
      if (p.opponentId === this.myOpponentId) {
        this.opponentOnline.set(p.online);
        this.opponentLastSeen.set(p.lastSeen);
      }
    });
    s.on('game:inactivity-warning', (p) =>
      this.inactivitySecondsLeft.set(p.secondsLeft)
    );
    s.on('game:end', (p) => {
      if (p.reason === 'inactivity_timeout') {
        alert('Partie perdue pour inactivité');
      }
    });
    setInterval(() => s.emit('presence:heartbeat'), 30_000);
  }

  rejoin(gameId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.sockets.getSocket()?.emit(
        'game:rejoin',
        { gameId },
        (ack: { ok: boolean; sync?: GameSyncState; error?: string }) => {
          if (!ack?.ok) return reject(ack?.error);
          if (ack.sync) this.applySync(ack.sync);
          resolve();
        }
      );
    });
  }

  joinAsSpectator(gameId: string, delayMoves: number): void {
    this.isSpectator.set(true);
    this.spectatorDelay.set(delayMoves);
    this.sockets.getSocket()?.emit(
      'spectate:join',
      { gameId, delayMoves },
      (ack) => {
        if (ack?.ok && ack.sync) this.applySync(ack.sync);
      }
    );
  }
}
```

### 7.2 Page « Parties en direct »

```typescript
// live-games-page.component.ts (nouvelle page)
@Component({
  template: `
    <h1>Parties en direct</h1>
    @for (g of games(); track g.gameId) {
      <article>
        {{ g.whiteUsername }} vs {{ g.blackUsername }} — {{ g.timeControl }}
        <button (click)="watch(g.gameId, 0)">Direct</button>
        <button (click)="watch(g.gameId, 2)">Retard 2 coups</button>
      </article>
    }
  `,
})
export class LiveGamesPageComponent {
  games = signal<LiveGameSummary[]>([]);

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit() {
    this.http
      .get<LiveGameSummary[]>(`${environment.API_URL}/api/games/live`)
      .subscribe((list) => this.games.set(list));
  }

  watch(gameId: string, delay: number) {
    this.router.navigate(['/game', gameId], {
      queryParams: { spectate: '1', delay },
    });
  }
}
```

### 7.3 Plateau spectateur

```typescript
// game-page.component.ts — extensions
get boardDisabled(): boolean {
  return this.replayMode || this.isSpectator() || this.gameOver || !this.myTurn || ...;
}

// Template badge
// <span *ngIf="isSpectator()">Spectateur — retard {{ spectatorDelay() }} coups</span>
```

### 7.4 Équivalent React (si migration future)

```tsx
// hooks/useGameSocket.ts
export function useGameSocket(gameId: string) {
  const [sync, setSync] = useState<GameSyncState | null>(null);
  const socketRef = useRef<Socket>();

  useEffect(() => {
    const socket = io(API_URL, { withCredentials: true });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('game:rejoin', { gameId }, (ack) => {
        if (ack.ok) setSync(ack.sync);
      });
    });
    socket.on('game:moved', (p) => setSync((s) => applyMove(s, p)));
    socket.on('game:opponent-status', setOpponentStatus);

    const hb = setInterval(() => socket.emit('presence:heartbeat'), 30_000);
    return () => {
      clearInterval(hb);
      socket.disconnect();
    };
  }, [gameId]);

  return { sync, socket: socketRef };
}
```

---

## 8. Cartographie avec le code actuel

| Besoin spec | Existant | Action |
|-------------|----------|--------|
| Reconnexion | `onReconnect()` → `game:join` | Renommer / enrichir en `game:rejoin` + `GameSyncState` + horloges |
| Adversaire away | `game:opponent-away` 8s | Garder ; ajouter `game:opponent-back` |
| Online | `presence.ts` ref-count | + `lastSeen` + heartbeat + REST status |
| Spectateur | — | Nouveau module + page live |
| Inactivité | — | Timer serveur + `endReason` |
| Horloges BDD | FEN + moves seulement | Colonnes `whiteClockMs`, etc. |

---

## 9. Ordre d’implémentation recommandé

1. Migration Prisma (`endReason`, horloges, `in_progress`).
2. `buildGameSyncState` + `game:rejoin` (étend `game:join`).
3. Heartbeat + `GET /users/:id/status` + `game:opponent-status`.
4. Timer inactivité serveur.
5. Spectateur + file différée + `GET /games/live`.
6. Page Angular live + mode spectateur sur `game-page`.

---

*Document de conception — à implémenter progressivement dans le dépôt Square One Chess.*
