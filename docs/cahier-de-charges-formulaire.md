# Formulaire GSP-FR-01-01 — texte à copier

Les champs **[toi]** : CIN, e-mail, téléphone, e-mail de l’enseignant.

---

## Page 1 — Étudiant

| Champ | À écrire |
|---|---|
| Nom & Prénom | Lasmer Dhia Eddin |
| Monôme / Binôme | **Monôme** |
| Spécialité | Ingénierie des Systèmes d’Information |
| CIN | **[toi]** |
| E-mail | **[toi]** |
| Tél. | **[toi]** |

**Sujet du projet**

Conception et développement d’une plateforme web d’échecs en temps réel (Square One Chess), réalisée en stage à NCIS (Tunis), permettant l’authentification, le jeu en ligne, le matchmaking, l’historique, les tournois, le chat de partie, les puzzles et le suivi administrateur.

**Contexte et définition du problème**

La pratique des échecs amateurs est aujourd’hui dispersée : un site pour jouer, une messagerie pour organiser un match, un tableur pour les résultats, un autre outil pour les puzzles. Il n’existe pas de système unique, sécurisé et cohérent pour un club ou une communauté. Les parties se perdent, le classement Elo n’est pas fiable, le rejeu est rare et l’administrateur n’a pas de vue d’ensemble. Le projet Square One, mené à NCIS, vise à centraliser le compte, le jeu en direct, la communauté, la compétition et l’entraînement sur une seule application web.

---

## Page 2

**Objectifs du projet**

- Permettre à un visiteur de créer un compte et de s’authentifier (JWT, cookie HttpOnly).
- Permettre à un joueur de jouer en ligne (horloge, règles chess.js, matchmaking, jeu contre Stockfish).
- Consulter l’historique, rejouer une partie et s’entraîner (puzzles, revue IA).
- Organiser des tournois (élimination directe ou round-robin) et chatter pendant une partie.
- Offrir un classement Elo, des statistiques joueur et un tableau de bord analytics réservé à l’administrateur.
- Appliquer Scrum, UML et une architecture Angular 17 + Node.js / Express + Prisma / SQLite.

**Techniques (logiciels, matériels, ...)**

- Front-end : Angular 17, TypeScript, HTML5, CSS3, Tailwind CSS, chess.js, Socket.io-client, Chart.js.
- Back-end : Node.js, Express.js, Socket.io, Prisma, SQLite, Stockfish, JWT / bcrypt, Nodemailer.
- Outils : Visual Studio Code, Git, GitHub, Postman, PlantUML.
- Matériel : PC de développement (Windows), navigateur, serveur local (ports 3000 et 4200).

**Plan de travail**

Méthode Scrum, 8 sprints d’une semaine (plus cadrage et documentation) :

1. Cadrage NCIS, cahier des charges, backlog, environnement.
2. Compte : inscription, connexion, profil, sécurité.
3. Partie de base : règles, coups, abandon / nulle.
4. Temps réel : Socket.io, lobby, matchmaking, horloge.
5. Historique, relecture, jeu contre le moteur.
6. Social (amis, présence) et chat de partie.
7. Tournois, puzzles, revue IA.
8. Classement, stats, analytics admin, tests, rapport, soutenance.

**Enseignant chargé du suivi à l’ISI du Kef**

| Champ | À écrire |
|---|---|
| Nom & Prénom | Dr. Hmida Hmida |
| Qualité | Encadrant académique |
| E-mail | **[toi si tu l’as]** |
| Signature / date | **lui** (Kef, le …) |
