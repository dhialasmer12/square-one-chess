# Square One Chess (PFE)

Full-stack chess platform: **Express + Prisma + Socket.io** (API) and **Angular** (SPA). Live play, matchmaking, puzzles, tournaments, friends/chat, and AI coaching.

Documentation: `docs/CODEBASE.md`

## Publish to GitHub

The project is a Git repo locally (`.env` and databases are **not** committed).

1. Sign in to GitHub (one-time), in a terminal:

   ```bash
   gh auth login
   ```

2. Create the remote repo and push:

   ```bash
   cd c:\Users\dhial\OneDrive\Bureau\pfe1
   gh repo create square-one-chess --public --source=. --remote=origin --push
   ```

   Or on [github.com/new](https://github.com/new): create an empty repo (no README), then:

   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/square-one-chess.git
   git push -u origin main
   ```

Replace `YOUR_USERNAME` and the repo name if you prefer something else.

## Quick start (dev)

### Backend (root)

```bash
npm install
npx prisma generate
npx prisma db push
npm run dev
```

### Frontend (`frontend/`)

```bash
cd frontend
npm install
npm start
```

## Docs

- `docs/CODEBASE.md`: architecture + API map
- `docs/BACKLOG.md`: backlog produit (user stories, priorités, sprints)
- `docs/DIAGRAMME-CAS-UTILISATION.md`: guide du diagramme de cas d’utilisation
- `docs/uml/01-use-case.puml`: diagramme PlantUML (cas d’utilisation)

