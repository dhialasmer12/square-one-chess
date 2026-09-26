# Cahier des charges — Square One Chess

**Projet de fin d’études (PFE)**  
**Établissement :** Institut Supérieur d’Informatique du Kef (ISI Kef)  
**Organisme d’accueil :** NCIS (Network and Computer Integration Services), Tunis  
**Étudiant :** Lasmer Dhia Eddin  
**Encadrant industriel :** M. Aziz Thraya  
**Encadrant académique :** M. Hmida Hmida  
**Application :** plateforme web d’échecs en temps réel *Square One Chess*  
**Version du document :** 1.0  

---

## 1. Introduction

### 1.1 Objet du document

Le présent cahier des charges définit le besoin, le périmètre, les exigences fonctionnelles et non fonctionnelles, les contraintes et les livrables du projet **Square One Chess**. Il sert de référence pour la conception, le développement, la validation et la soutenance du PFE.

### 1.2 Contexte

La pratique des échecs amateurs et compétitifs est souvent dispersée : sites généralistes pour jouer, messageries pour organiser un match, tableurs pour suivre les résultats, outils séparés pour les puzzles et l’analyse. Il manque une plateforme unique, sécurisée et cohérente pour un club ou une communauté étudiante.

Le projet est réalisé dans le cadre d’un stage à **NCIS**, entreprise tunisienne spécialisée dans les services informatiques et le développement d’applications web.

### 1.3 Présentation du projet

**Square One Chess** est une application web full-stack permettant :

- de créer un compte et de s’authentifier de façon sécurisée ;
- de jouer des parties en ligne (matchmaking ou contre un moteur) ;
- de consulter l’historique et de rejouer les parties ;
- de s’entraîner (puzzles tactiques, revue IA) ;
- de participer à des tournois ;
- de gérer des amis et de discuter (chat) ;
- de consulter classement, statistiques et, pour un administrateur, des analytics.

### 1.4 Objectifs

| Type | Objectif |
|------|----------|
| **Métier** | Centraliser jeu, communauté, compétition et entraînement sur une seule plateforme. |
| **Technique** | Concevoir une architecture client/serveur moderne (SPA + API + temps réel). |
| **Pédagogique** | Appliquer Scrum, UML, sécurité web et développement full-stack TypeScript. |
| **Qualité** | Livrer une démo stable et documentée pour la soutenance. |

### 1.5 Périmètre

#### Inclus (réalisé / à livrer)

- Authentification (inscription, connexion, cookie HttpOnly JWT, profil, récupération mot de passe / vérification e-mail selon configuration).
- Lobby, matchmaking, parties live (Socket.io), horloge, abandon / nulle.
- Partie contre le moteur (Stockfish / open-seat).
- Historique, relecture (replay), revue IA d’une partie terminée.
- Puzzles (quotidien, aléatoire, thèmes, multi-coups).
- Tournois (création, inscription, démarrage, bracket, chat tournoi).
- Amis, présence, chat (sidebar).
- Classement Elo, tableau de bord statistiques.
- Analytics administrateur (dashboard).
- Documentation UML et rapport.

#### Hors périmètre (non exigé pour ce PFE)

- Application mobile native.
- Spectateur de parties en direct.
- Défi ami dédié / rematch avancé.
- Import PGN externe.
- Déploiement cloud haute disponibilité (Postgres + Redis + multi-instances).
- Modération avancée (signalement, sanctions automatiques).

---

## 2. Étude de l’existant et critique

### 2.1 Situation actuelle

Les joueurs amateurs combinent souvent plusieurs canaux non intégrés (sites web, groupes de discussion, carnets papier). Le suivi Elo, l’historique rejouable et l’administration d’une petite communauté restent fragiles.

### 2.2 Limites

- Pas de système d’information unique du compte jusqu’à l’entraînement.
- Appariement et contrôle du temps peu fiables hors plateforme dédiée.
- Historique incomplet, relecture difficile.
- Social et plateau de jeu séparés.
- Tournois souvent gérés manuellement.
- Sécurité et rôles peu formalisés.

### 2.3 Solution proposée

Développer **Square One**, plateforme web temps réel dédiée aux échecs, avec authentification sécurisée, parties live, matchmaking, historique, social, tournois, puzzles, revue IA, statistiques et espace analytics admin.

---

## 3. Acteurs du système

| Acteur | Description | Interactions principales |
|--------|-------------|---------------------------|
| **Visiteur** | Utilisateur non authentifié | S’inscrire, se connecter |
| **Joueur** | Utilisateur authentifié | Jouer, s’entraîner, social, tournois, stats, profil |
| **Administrateur** | Joueur autorisé (liste d’emails/ids ou mode démo) | Consulter les analytics plateforme sur le dashboard |

> Il n’existe **pas** de page publique « parcourir la plateforme » sans compte : après authentification, l’entrée est le dashboard.

---

## 4. Exigences fonctionnelles

Les exigences ci-dessous correspondent aux fonctionnalités **réellement présentes** dans l’application.

### 4.1 Compte et sécurité

| ID | Exigence | Priorité |
|----|----------|----------|
| EF-01 | Le système permet à un visiteur de s’inscrire (pseudo, e-mail, mot de passe). | Obligatoire |
| EF-02 | Les mots de passe sont stockés sous forme de hash (bcrypt), jamais en clair. | Obligatoire |
| EF-03 | Le système permet de se connecter et d’ouvrir une session via cookie HttpOnly JWT. | Obligatoire |
| EF-04 | Les routes privées exigent une session valide (`authGuard` / middleware). | Obligatoire |
| EF-05 | Le joueur peut consulter et modifier son profil (ex. pseudo). | Obligatoire |
| EF-06 | Le joueur peut se déconnecter (invalidation du cookie). | Obligatoire |
| EF-07 | Le système peut exiger la vérification d’e-mail et permettre la réinitialisation du mot de passe (selon configuration SMTP / variables d’environnement). | Souhaitable |

### 4.2 Parties en ligne

| ID | Exigence | Priorité |
|----|----------|----------|
| EF-10 | Le joueur peut rejoindre une file d’attente (contrôle du temps) via Socket.io. | Obligatoire |
| EF-11 | Le système apparie deux joueurs et crée une partie (`match:found`). | Obligatoire |
| EF-12 | Les coups sont validés côté serveur (`chess.js`) et diffusés en temps réel. | Obligatoire |
| EF-13 | Une partie gère horloge, abandon, proposition/refus de nulle, fin de partie et mise à jour Elo. | Obligatoire |
| EF-14 | Le joueur peut lancer une partie contre le moteur (difficulté configurable). | Obligatoire |

### 4.3 Historique et relecture

| ID | Exigence | Priorité |
|----|----------|----------|
| EF-20 | Le joueur consulte la liste de ses parties terminées. | Obligatoire |
| EF-21 | Le joueur rejoue une partie coup par coup à partir des coups stockés. | Obligatoire |
| EF-22 | Le système peut fournir le PGN / détail d’une partie via l’API. | Souhaitable |

### 4.4 Entraînement

| ID | Exigence | Priorité |
|----|----------|----------|
| EF-30 | Le joueur résout des puzzles (quotidien, aléatoire, filtre par thème). | Obligatoire |
| EF-31 | La résolution est multi-coups : coup joueur → réponse adverse auto → coup suivant ; échec = reset. | Obligatoire |
| EF-32 | L’API puzzle ne révèle pas la ligne solution au chargement ; l’indice indique la case de départ. | Obligatoire |
| EF-33 | Les tentatives / réussites sont enregistrées (`UserPuzzleStats`). | Obligatoire |
| EF-34 | Le joueur peut ouvrir une revue IA d’une partie terminée (Stockfish / service AI). | Obligatoire |

### 4.5 Tournois

| ID | Exigence | Priorité |
|----|----------|----------|
| EF-40 | Un joueur peut créer et rejoindre un tournoi. | Obligatoire |
| EF-41 | Le créateur peut démarrer le tournoi (si assez de joueurs). | Obligatoire |
| EF-42 | Le système gère inscriptions, matchs, bracket et résultats liés aux parties. | Obligatoire |
| EF-43 | Un chat de tournoi est disponible. | Souhaitable |

### 4.6 Social

| ID | Exigence | Priorité |
|----|----------|----------|
| EF-50 | Le joueur gère des demandes d’amis (envoyer, accepter, lister). | Obligatoire |
| EF-51 | Le joueur communique via chat (global / privé / partie) avec persistance des messages. | Obligatoire |
| EF-52 | Le système indique la présence en ligne des amis. | Souhaitable |

### 4.7 Statistiques et administration

| ID | Exigence | Priorité |
|----|----------|----------|
| EF-60 | Le joueur consulte le classement (Elo, formats bullet/blitz/rapid selon API). | Obligatoire |
| EF-61 | Le joueur consulte ses statistiques sur le dashboard. | Obligatoire |
| EF-62 | L’administrateur consulte des analytics plateforme (utilisateurs, volume de parties, etc.). | Obligatoire |

---

## 5. Exigences non fonctionnelles

| ID | Catégorie | Exigence |
|----|-----------|----------|
| ENF-01 | **Sécurité** | JWT en cookie HttpOnly ; pas de token en `localStorage` ; CORS avec credentials ; validation des coups côté serveur. |
| ENF-02 | **Performance** | Temps de réponse API acceptable en démo locale ; parties live sans rafraîchir la page. |
| ENF-03 | **Disponibilité** | Application utilisable en local pour la soutenance (API + front démarrés). |
| ENF-04 | **Ergonomie** | Interface web responsive (Angular + Tailwind), parcours clairs (lobby, puzzles, dashboard). |
| ENF-05 | **Maintenabilité** | Code TypeScript modulaire (routes → controllers → services → Prisma). |
| ENF-06 | **Portabilité** | Développement Windows ; stack Node.js ; base SQLite fichier. |
| ENF-07 | **Capacité** | Dimensionnement démo : ordre de grandeur dizaines d’utilisateurs simultanés (SQLite + un process Node) — limite assumée. |
| ENF-08 | **Traçabilité** | Diagrammes UML (cas d’utilisation, classes, séquences) alignés sur l’implémentation. |

---

## 6. Contraintes

### 6.1 Techniques

| Élément | Choix |
|---------|--------|
| Frontend | Angular 17 (SPA), TypeScript, Tailwind, chess.js, Socket.io-client, Chart.js |
| Backend | Node.js, Express, TypeScript, Socket.io |
| Persistance | Prisma + SQLite |
| Moteur | Stockfish (npm) |
| Auth | JWT + cookie HttpOnly, bcrypt |
| E-mail | Nodemailer (optionnel selon SMTP) |

### 6.2 Organisationnelles

- Méthode : **Scrum** (backlog, sprints, incréments démo).
- Durée : stage / PFE selon calendrier ISI Kef et NCIS.
- Encadrement : M. Aziz Thraya (PO / Scrum Master côté entreprise).

### 6.3 Juridiques / éthiques

- Pas de stockage de mots de passe en clair.
- Respect de la vie privée des comptes de démonstration.
- Le code et la documentation restent cohérents avec le rapport de stage.

---

## 7. Architecture cible (vue cahier des charges)

```text
[Navigateur — Angular :4200]
        |  HTTP /api (proxy dév.) + cookie
        |  Socket.io (parties, file, chat)
        v
[Serveur Node — Express + Socket.io :3000]
        |
        +--> Services métier (auth, game, puzzle, tournament, stats, AI…)
        |
        +--> Prisma ORM --> SQLite
        |
        +--> Stockfish (bot / analyse)
        +--> Nodemailer (e-mail optionnel)
```

**Règle métier importante :** le serveur est autorité pour la légalité des coups et pour la session.

---

## 8. Cas d’utilisation (synthèse)

Le diagramme global (`docs/uml/01-use-case.puml` / `fig-usecase-global.png`) regroupe :

| Acteur | Cas d’utilisation |
|--------|-------------------|
| Visiteur | S’inscrire ; Se connecter |
| Joueur | Gérer le profil ; Jouer en ligne ; Historique et replay ; Résoudre des puzzles ; Revue d’une partie ; Tournois ; Amis et chat ; Classement ; Statistiques dashboard |
| Administrateur | Analytics plateforme |

Détail des scénarios : fiches UC et diagrammes de séquence dans `docs/uml/` et `docs/EXPLICATION-DIAGRAMMES.md`.

---

## 9. Backlog produit (extrait)

Référence complète : `docs/BACKLOG.md` et `docs/SPRINT-PLANNING.md`.

| Epic | Exemples d’user stories |
|------|-------------------------|
| E1 Compte & sécurité | US-01 à US-05 |
| E2 Parties en ligne | US-10 à US-14 |
| E3 Historique & replay | US-20, US-21 |
| E4 Stats & classement | US-30, US-31 |
| E5 Social | US-40 à US-42 |
| E6 Tournois | US-50, US-51 |
| E7 Puzzles | US-60, US-61 |
| E8 Coaching IA | US-70 |
| E9 Administration | US-80 |

Priorisation : P1 = indispensable à la démo ; P2 = important ; P3 = amélioration future.

---

## 10. Critères d’acceptation (recette)

Le projet est considéré **acceptable** pour la soutenance si :

1. Inscription + connexion fonctionnent et mènent au dashboard (cookie session).
2. Une partie PvP ou vs bot peut être jouée en live (coups validés, fin de partie).
3. L’historique et le replay d’une partie terminée fonctionnent.
4. Au moins un puzzle peut être résolu (y compris ligne multi-coups si proposée).
5. Classement ou statistiques dashboard accessibles.
6. Tournoi : création / inscription / démarrage démontrable avec 2 joueurs.
7. Chat ou amis utilisable depuis l’interface.
8. Les diagrammes du rapport correspondent aux fonctionnalités livrées.
9. Le code démarre en local (API `:3000`, front `:4200` avec proxy).

---

## 11. Livrables

| Livrable | Description |
|----------|-------------|
| Code source | Backend + frontend TypeScript (dépôt Git) |
| Base de données | Schéma Prisma + seed (utilisateurs démo, puzzles) |
| Documentation technique | README, UML, guides (`docs/`) |
| Rapport PFE | Document LaTeX (`docs/page-de-garde.tex` et suite) |
| Cahier des charges | Le présent document |
| Démo | Scénario de présentation 8–10 min |

---

## 12. Planning indicatif (releases)

| Release | Contenu |
|---------|---------|
| **R1** | Compte, auth cookie, profil |
| **R2** | Lobby, matchmaking, parties live, historique, replay |
| **R3** | Social, tournois, puzzles, revue IA, leaderboard, analytics admin |

Détail des sprints : `docs/SPRINT-PLANNING.md`.

---

## 13. Risques et hypothèses

| Risque | Impact | Mitigation |
|--------|--------|------------|
| Cookie bloqué (localhost ≠ 127.0.0.1) | Impossible de rester connecté | Proxy Angular same-origin ; documenter l’URL `http://localhost:4200` |
| SQLite sous charge | Verrous / lenteur | Limiter la démo ; évoquer Postgres en perspectives |
| Stockfish CPU | Bot / revue lents | Profondeur limitée en démo |
| SMTP absent | Vérification e-mail | Auto-verify en dév. (`DEV_AUTO_VERIFY_EMAIL` / absence SMTP) |
| Puzzles de mauvaise qualité | Démo peu crédible | Seed validé par chess.js |

**Hypothèses :** environnement de démo local ; deux comptes de test prêts ; jury accède à l’appli via navigateur.

---

## 14. Perspectives (hors cahier initial)

- Migration PostgreSQL + Redis adapter Socket.io.
- Import massif de puzzles (ex. dump Lichess filtré).
- Mode spectateur, défi ami, notifications.
- Application mobile ou PWA.
- Tests automatisés (e2e) et CI/CD.

---

## 15. Glossaire

| Terme | Définition |
|-------|------------|
| **FEN** | Notation d’une position d’échiquier |
| **SAN** | Notation algébrique d’un coup (`Nf3`, `O-O`…) |
| **JWT** | Jeton signé d’identité |
| **HttpOnly cookie** | Cookie non accessible en JavaScript |
| **Elo** | Système de classement |
| **Matchmaking** | Appariement automatique de joueurs |
| **Socket.io** | Communication temps réel bidirectionnelle |
| **Prisma** | ORM TypeScript vers la base |

---

## 16. Approbation

| Rôle | Nom | Date | Signature |
|------|-----|------|-----------|
| Étudiant | Lasmer Dhia Eddin | | |
| Encadrant industriel | M. Aziz Thraya | | |
| Encadrant académique | M. Hmida Hmida | | |

---

*Document : `docs/CAHIER-DES-CHARGES.md` — aligné sur l’application Square One Chess telle que livrée pour le PFE.*
