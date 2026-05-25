# Journal de stage

**Titre du stage :** Conception et développement d’une plateforme web d’échecs en temps réel (*Square One Chess*)

**Établissement :** Institut Supérieur d’Informatique de Kef (ISI Kef)

**Entreprise d’accueil :** NCIS — Tunisie *(société de services et solutions informatiques)*

**Stagiaire :** [Nom Prénom]  
**Niveau / filière :** [ex. Licence / Mastère — Informatique]  
**Période du stage :** du [JJ/MM/AAAA] au [JJ/MM/AAAA]  
**Volume :** [ex. 8 semaines — 320 h]

**Encadrant pédagogique (ISI Kef) :** [Nom, grade, email]  
**Encadrant professionnel (NCIS) :** [Nom, fonction, email]

---

## Objet et contexte du stage

Le stage s’inscrit dans le cadre [du projet de fin d’études / du module de stage] à l’ISI Kef. L’objectif était de participer au développement d’une application web complète : une plateforme d’échecs en ligne avec authentification, parties en direct, matchmaking, statistiques (Elo, classements), fonctionnalités sociales (amis, chat), tournois, puzzles tactiques et modules d’aide à l’entraînement (analyse heuristique des parties).

**Pile technique du projet (telle que réalisée dans le dépôt) :**

- **Backend :** Node.js, Express, TypeScript, Prisma (SQLite), Socket.io, `chess.js`, sécurisation (JWT, cookies HttpOnly, Helmet, CORS).
- **Frontend :** Angular 17 (composants standalone), Tailwind CSS, Chart.js, client Socket.io.

**Organisation :** travail en binôme / équipe sous la direction de l’encadrant NCIS, revues de code et point hebdomadaire sur l’avancement.

---

## Table récapitulative des semaines

| Semaine | Période (à adapter) | Thèmes principaux |
|--------:|---------------------|-------------------|
| 1 | [dates] | Installation, prise en main du dépôt, architecture, maquettage |
| 2 | [dates] | Authentification, profil utilisateur, Prisma |
| 3 | [dates] | API parties, règles d’échecs, persistance des coups |
| 4 | [dates] | Temps réel (Socket.io), lobby, matchmaking |
| 5 | [dates] | Social (amis, chat), tests d’intégration manuels |
| 6 | [dates] | Tournois et/ou puzzles, statistiques, finitions |
| 7 | [dates] | *(optionnel)* Tableaux de bord, analytics, durcissement sécurité |
| 8 | [dates] | *(optionnel)* Documentation, rapport PFE, préparation soutenance |

*Supprimez ou fusionnez les semaines 7–8 selon la durée réelle de votre stage.*

---

## Semaine 1 — Mise en route et cadrage

**Période :** [du … au …]

**Missions réalisées**

- Présentation de NCIS, charte d’utilisation des outils (Git, messagerie, visioconférence).
- Clonage du monorepo, lecture de `docs/CODEBASE.md` et du schéma Prisma pour comprendre les entités (User, Game, Move, Friend, ChatMessage, Tournament, Puzzle, etc.).
- Mise en place de l’environnement local : `npm install`, `npx prisma generate`, base SQLite, lancement API (`npm run dev`) et frontend Angular (`npm start` dans `frontend/`).
- Alignement de `environment.ts` avec l’URL du backend (CORS + credentials).

**Compétences / notions mobilisées**

- Chaîne de build TypeScript, structure Express (`app.ts`, `server.ts`, routes sous `/api`).

**Difficultés rencontrées**

- Premiers écarts de version Node / dépendances ; résolution par harmonisation des versions avec l’équipe.

**Apports**

- Vision claire client/serveur et du rôle de Socket.io par rapport au REST.

---

## Semaine 2 — Authentification et données utilisateur

**Période :** [du … au …]

**Missions réalisées**

- Parcours des routes `/api/auth` : inscription, connexion, déconnexion, `me`, mise à jour du profil.
- Compréhension du middleware JWT et du cookie HttpOnly `square_one_access_token`.
- Tests manuels des formulaires Angular (login, register) et du garde-fou `auth.guard`.

**Compétences**

- Hashage des mots de passe, bonnes pratiques (ne pas exposer le JWT en localStorage si politique cookie).
- Modèle `User` : Elo global et par format (bullet, blitz, rapid), compteurs de parties.

**Difficultés**

- Comprendre le flux « cookie + intercepteur HTTP » côté Angular.

**Apports**

- Sécurité applicative de base en contexte SPA.

---

## Semaine 3 — Moteur métier des parties

**Période :** [du … au …]

**Missions réalisées**

- Étude de `game.service.ts` : création de partie, validation des coups avec `chess.js`, enregistrement des lignes `Move`, mise à jour du FEN, fin de partie (abandon, résultat).
- Appels REST : historique paginé, détail d’une partie, PGN.
- Première utilisation des endpoints « bot » / open-seat si prévu dans votre lot de travail.

**Compétences**

- Logique métier dense, gestion des erreurs (`HttpError`, `asyncHandler`).

**Difficultés**

- Cohérence entre état en base et état « en cours » pour les parties live (préparation à la semaine 4).

**Apports**

- Modélisation fine d’un domaine (échecs) dans une API REST.

---

## Semaine 4 — Temps réel et expérience de jeu

**Période :** [du … au …]

**Missions réalisées**

- Analyse de `src/sockets/game.socket.ts` : rejoindre une salle de partie, émission/réception des coups, nettoyage à la déconnexion.
- Côté Angular : service de jeu / socket, page `/game/:gameId`, synchronisation plateau et horloges.
- Lobby : file d’attente, intégration avec les événements socket de matchmaking.

**Compétences**

- Programmation événementielle, idempotence des mises à jour UI.

**Difficultés**

- Déboguer les désynchronisations (trace : emit socket → handler → service → DB → broadcast).

**Apports**

- Architecture temps réel couplée à une persistance relationnelle.

---

## Semaine 5 — Fonctionnalités sociales

**Période :** [du … au …]

**Missions réalisées**

- Routes `/api/friends` : demande, acceptation/refus, liste, suppression.
- Routes `/api/chat` et logique métier associée (`chat.service.ts`, rooms par `roomId`, contexte global / partie / utilisateur selon les paramètres de l’API).
- Composants Angular : sidebar chat, liste d’amis, intégration dans le shell de l’application.

**Compétences**

- Conception de « salons » et indexation des messages en base (`ChatMessage`).

**Difficultés**

- Gestion des cas limites (utilisateur hors ligne, spam léger, taille des messages).

**Apports**

- Fonctionnalités collaboratives au-delà du simple CRUD.

---

## Semaine 6 — Tournois, puzzles et statistiques

**Période :** [du … au …]

**Missions réalisées**

- Parcours des modules tournoi : création, inscription, bracket, liaison `TournamentMatch` ↔ `Game`.
- Module puzzles : puzzle du jour, thèmes, endpoint de résolution et suivi `UserPuzzleStats`.
- Statistiques : leaderboard, filtres par période et format, page profil / historique Elo côté front.

**Compétences**

- Requêtes agrégées, pagination, cohérence des données sur plusieurs tables.

**Apports**

- Fonctionnalités « communauté » et compétition.

---

## Semaine 7 — *(optionnel)* IA heuristique et analytics

**Période :** [du … au …]

**Missions réalisées**

- Lecture de `ai.service.ts` : qualité de coup, estimation de niveau, recommandations de leçons, revue de partie.
- Endpoints `/api/analytics` et contrôle d’accès (admin / soi-même) si concerné par votre mission.

**Apports**

- Distinction entre moteur complet et heuristiques intégrées dans l’API HTTP.

---

## Semaine 8 — *(optionnel)* Finalisation et livrables

**Période :** [du … au …]

**Missions réalisées**

- Rédaction / mise à jour de la documentation (`README`, `docs/CODEBASE.md`).
- Préparation du rapport de stage / mémoire PFE et des captures d’écran (plateau, lobby, profil, tournoi).
- Passage en revue des variables d’environnement et des risques avant démonstration.

**Apports**

- Synthèse technique et communication orale/écrite.

---

## Bilan du stage

**Objectifs atteints**

- [À personnaliser : ex. contribution aux modules X et Y, livraison de la fonctionnalité Z opérationnelle en environnement de démonstration.]

**Compétences développées**

- Développement full-stack TypeScript, ORM Prisma, API REST documentée, WebSockets, SPA Angular, travail d’équipe avec Git.

**Axes d’amélioration**

- Renforcement des tests automatisés (unitaires / e2e), passage éventuel à PostgreSQL en production, monitoring et journalisation centralisés.

**Appréciation de l’entreprise NCIS**

- [Courte appréciation à faire signer ou valider par l’encadrant professionnel.]

---

## Visa des encadrants

| Rôle | Nom | Signature | Date |
|------|-----|-----------|------|
| Encadrant professionnel (NCIS) | | | |
| Encadrant pédagogique (ISI Kef) | | | |
| Stagiaire | | | |

---

*Document fourni comme modèle aligné sur le dépôt **Square One Chess**. Remplacez tous les champs entre crochets par vos informations réelles, ajustez le nombre de semaines et détaillez les tâches que vous avez effectivement effectuées lors du stage.*
