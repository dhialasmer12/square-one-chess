# Backend entry files

Folder: `src/`. Runtime: Node.js + TypeScript (`ts-node` / nodemon on port **3000**).

---

## `src/server.ts`

**What it is:** the process entry. Not Express routes — the **HTTP server + Socket.io**.

**What it does, in order:**

1. `import './types/express-augment'` — adds `req.user` typing.
2. Loads `.env`.
3. Creates `http.createServer(app)` from `app.ts`.
4. Attaches Socket.io with `cors.origin: true` and `credentials: true` (cookies).
5. `setSocketServer(io)` so other modules can emit.
6. `registerGameSockets(io)` — game queue, moves, **and** social handlers.
7. `listen(PORT || 3000)` and logs a short boot id.

Without this file there is no live chess and no REST.

---

## `src/app.ts`

**What it is:** the Express application object (`export const app`).

**Middleware stack, literally:**

| Line | Purpose |
|------|---------|
| `helmet()` | HTTP security headers |
| `cors({ origin: true, credentials: true })` | Browser on :4200 may send cookies |
| `urlencoded` + `json({ limit: '1mb' })` | Parse bodies |
| `morgan('dev')` | Request log in the terminal |
| `GET /health` | `{ ok: true }` — process is alive |
| `app.use('/api', apiRoutes)` | All REST under `/api` |
| 404 handler | `{ error: 'Not found' }` |
| `errorHandler` | Last: turns `HttpError` into JSON |

There is **no** static Angular serving here: Angular is a separate `ng serve` (or proxy).
