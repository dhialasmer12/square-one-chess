# Journal de stage — texte à copier dans le PDF

Copie ces lignes dans `Journal de Stage Licence (1).pdf`.  
Les champs **[toi]** : tu les connais, je ne les invente pas.  
Les **signatures / cachet** : à laisser vides pour les encadrants.

Période proposée (14 semaines, lundi–vendredi), jusqu’à la soutenance du **28/09/2026** :  
**22/06/2026 → 25/09/2026**. Change les dates si ton convention est différente, et décale les « Du … au … » des semaines.

---

## Page 1 — Identification

| Champ | À écrire |
|---|---|
| DIPLÔME | Licence en Informatique |
| Année universitaire | 2025–2026 |
| Type de stage | cocher **PFE** (pas SFE) |
| Prénom & Nom | Lasmer Dhia Eddin |
| N° carte d’étudiant | **[toi]** |
| Filière | Ingénierie des Systèmes d’Information |
| Adresse | **[toi]** |
| Tél | **[toi]** |
| Email | **[toi]** |
| Nom Entreprise | NCIS (Network and Computer Integration Services) |
| Adresse | 07, rue 8805, Cité El Khadra, 1003 Tunis |
| Nom Personne contact | M. Aziz Thraya |
| Qualité de la personne contact | Directeur Général / Encadrant professionnel |
| Tél (entreprise) | **[toi si tu l’as]** |
| Email (entreprise) | **[toi si tu l’as]** |

---

## Page 2 — Description du stage

| Champ | À écrire |
|---|---|
| Titre du SFE / PFE | Conception d’une plateforme web d’échecs en temps réel (Square One Chess) |
| Encadrant académique | Dr. Hmida Hmida |
| Encadrant professionnel | M. Aziz Thraya |

**Objectifs SFE / PFE** (copier tel quel) :

Concevoir et développer Square One, une plateforme web d’échecs en temps réel : inscription et authentification sécurisée (JWT, cookie HttpOnly), parties en ligne avec matchmaking et horloge, jeu contre le moteur, historique et relecture, puzzles, tournois, amis et chat, classement Elo, statistiques joueur et tableau de bord administrateur. Architecture Angular 17 + Node.js / Express + Prisma / SQLite + Socket.io, méthode Scrum, documentation UML et rapport de soutenance.

Les cases « Obligations du stagiaire » sont déjà imprimées : ne rien ajouter.

---

## Page 3 — Déroulement

| Champ | À écrire |
|---|---|
| Date début du stage | 22/06/2026 |
| Date fin de stage | 25/09/2026 |
| Lieu du stage | NCIS — 07, rue 8805, Cité El Khadra, 1003 Tunis |

**Objectifs & Activités à réaliser :**

- Prise en main de NCIS, cadrage du besoin et rédaction du cahier des charges.
- Mise en place de l’environnement (Node.js, Angular 17, Prisma, SQLite, Git).
- Développement de l’authentification, du profil et de la sécurité des sessions.
- Développement du jeu en ligne : règles chess.js, Socket.io, matchmaking, horloge.
- Modules communauté : amis, présence, chat (global, partie, privé).
- Tournois (création, inscription, bracket), puzzles tactiques, revue IA (Stockfish).
- Classement, statistiques joueur, analytics administrateur.
- Tests manuels, corrections, documentation UML et préparation de la démonstration.

---

## Pages 4 à 6 — Semaines

Colonne signatures : **vide**.

**Semaine N° 1 — Du 22/06/2026 au 26/06/2026**  
Accueil NCIS. Installation de l’environnement (Node.js, Angular, Prisma, SQLite). Étude de l’existant (sites d’échecs dispersés). Cadrage Square One, Git, lancement API + frontend.

**Semaine N° 2 — Du 29/06/2026 au 03/07/2026**  
Cahier des charges, acteurs (visiteur, joueur, administrateur), backlog produit, planification Scrum (8 sprints). Première maquette des écrans (accueil, login, dashboard).

**Semaine N° 3 — Du 06/07/2026 au 10/07/2026**  
Schéma Prisma (User, Game, Move…). Inscription, connexion, déconnexion, cookie JWT HttpOnly, bcrypt, garde Angular. Profil de base.

**Semaine N° 4 — Du 13/07/2026 au 17/07/2026**  
Vérification e-mail et mot de passe oublié (Nodemailer). Sécurité Helmet / CORS. Tests manuels du parcours compte.

**Semaine N° 5 — Du 20/07/2026 au 24/07/2026**  
Moteur de partie : création, validation des coups (chess.js), FEN, abandon / nulle, persistance des coups. Page de jeu Angular.

**Semaine N° 6 — Du 27/07/2026 au 31/07/2026**  
Temps réel Socket.io, lobby, file d’attente, matchmaking, horloge live, reconnexion après coupure.

**Semaine N° 7 — Du 03/08/2026 au 07/08/2026**  
Historique des parties, relecture coup par coup, export PGN. Jeu contre le moteur (Stockfish, niveaux de difficulté).

**Semaine N° 8 — Du 10/08/2026 au 14/08/2026**  
Module social : demandes d’amis, acceptation / refus, présence en ligne, chat global, privé et de partie.

**Semaine N° 9 — Du 17/08/2026 au 21/08/2026**  
Tournois : création, inscription, démarrage, bracket, liaison match–partie, chat de tournoi.

**Semaine N° 10 — Du 24/08/2026 au 28/08/2026**  
Puzzles tactiques (quotidien, aléatoire, thèmes), stats puzzles. Revue IA d’une partie terminée et recommandations.

**Semaine N° 11 — Du 31/08/2026 au 04/09/2026**  
Classement Elo, statistiques joueur (dashboard). Analytics plateforme réservées à l’administrateur.

**Semaine N° 12 — Du 07/09/2026 au 11/09/2026**  
Tests manuels bout-en-bout, corrections UX, durcissement auth (cookie, rôles admin). Revue des user stories livrées.

**Semaine N° 13 — Du 14/09/2026 au 18/09/2026**  
Documentation : UML (cas d’utilisation, classes, séquences), rapport PFE, captures d’écran des interfaces.

**Semaine N° 14 — Du 21/09/2026 au 25/09/2026**  
Finalisation de la démo, journal de stage, relecture du rapport, préparation de la soutenance du 28/09/2026.

---

## Page 7 — Évaluation par l’encadrant professionnel

**À ne pas remplir toi-même** (notes 1–5, validé / non validé, signature, cachet).

Tu peux seulement écrire, s’il te le demande :

| Champ | À écrire |
|---|---|
| Date | 25/09/2026 |
| Prénom & Nom Encadrant professionnel | M. Aziz Thraya |
| Entreprise | NCIS |

---

## Page 8 — Auto-évaluation

Coche **5** partout si tu es à l’aise (ou **4** si tu veux rester modeste) :

- Acquisition de compétences techniques → **5**
- Acquisition de compétences communicationnelles → **4**
- Acquisition de compétences organisationnelles → **5**
- Conditions dans la structure d’accueil → **5**

**Observations du stagiaire :**

Ce stage m’a permis de concevoir et de développer une application web complète, de l’authentification jusqu’au jeu en temps réel. J’ai consolidé Angular 17, Node.js / Express, Prisma, Socket.io et la méthode Scrum. L’encadrement de NCIS a été disponible et le cadre de travail adapté à un PFE. Les principales difficultés ont concerné la synchronisation des parties live et l’intégration du moteur Stockfish.

**Recommandez-vous cette structure pour d’autres stagiaires :** Oui
