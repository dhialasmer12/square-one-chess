# Square One — literal explanations (separate from the rapport)

This folder is **not** the PFE rapport. It is a defence / study pack that explains:

1. **Every UML diagram** (what each actor, oval, class, arrow and message means).
2. **Every source file** of the application (what the file is for, what it exports, how it is used).

## How to use it

- Jury asks “What is this figure?” → open `diagrammes/`.
- Jury asks “What does this file do?” → open `code/`.

## Contents

| Path | What it explains |
|------|------------------|
| [diagrammes/01-use-cases.md](diagrammes/01-use-cases.md) | Global UC + every feature use-case diagram |
| [diagrammes/02-classes.md](diagrammes/02-classes.md) | Domain, architecture, and every feature class diagram |
| [diagrammes/03-sequences.md](diagrammes/03-sequences.md) | Every sequence diagram, message by message |
| [diagrammes/04-components.md](diagrammes/04-components.md) | Component / deployment diagram |
| [code/prisma.md](code/prisma.md) | `prisma/schema.prisma`, seeds |
| [code/backend-entree.md](code/backend-entree.md) | `server.ts`, `app.ts` |
| [code/backend-routes.md](code/backend-routes.md) | Every Express route file |
| [code/backend-controllers.md](code/backend-controllers.md) | Every controller |
| [code/backend-services.md](code/backend-services.md) | Every business service |
| [code/backend-sockets.md](code/backend-sockets.md) | Socket.io files |
| [code/backend-middleware-utils.md](code/backend-middleware-utils.md) | Middleware, utils, types, constants, models |
| [code/frontend-core.md](code/frontend-core.md) | Bootstrap, config, routes, guards, interceptors |
| [code/frontend-pages.md](code/frontend-pages.md) | Every Angular page |
| [code/frontend-components.md](code/frontend-components.md) | Every Angular component |
| [code/frontend-services-models.md](code/frontend-services-models.md) | Services, models, environments, constants |

PlantUML sources live in `docs/uml/`. PNG figures used in the rapport are `docs/fig-*.png`.
