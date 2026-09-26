# Diagramme de cas d’utilisation — Square One Chess

Source : `docs/uml/01-use-case.puml`  
Image : `docs/fig-usecase-global.png`

Le diagramme global ne contient **que** des fonctionnalités présentes dans l’application (routes Angular + chat amis). Aucun cas inventé (ex. « parcourir la plateforme » sans compte).

## Acteurs

| Acteur | Dans l’app |
|--------|------------|
| **Visitor** | `/register`, `/login` (+ forgot / verify e-mail) |
| **Player** | `/dashboard`, `/lobby`, `/game`, `/history`, `/replay`, `/review`, `/puzzles`, `/tournaments`, `/leaderboard`, `/profile`, chat/amis (sidebar) |
| **Administrator** | analytics dashboard si `isAdminUser` (sinon 403) |

## Cas d’utilisation ↔ app

| Cas | Où dans l’app |
|-----|----------------|
| Register | `/register` |
| Log in | `/login` |
| Manage profile | `/profile` |
| Play online games | `/lobby`, `/game/:id` (PvP + bot) |
| View and replay games | `/history`, `/replay/:id` |
| Solve puzzles | `/puzzles` |
| Review a finished game | `/review/:id` |
| Take part in tournaments | `/tournaments` |
| Manage friends and chat | `app-chat-sidebar` (global) |
| View the leaderboard | `/leaderboard` |
| View dashboard statistics | `/dashboard` (mode joueur) |
| View platform analytics | `/dashboard` (mode admin) |
