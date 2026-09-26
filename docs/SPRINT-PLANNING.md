 Sprint planning — Square One Chess (PFE)

**Objectif :** planifier la livraison du backlog sur une période de stage (ex. 6 à 8 semaines) sous forme de sprints.  
**Source backlog :** `docs/BACKLOG.md`.



 1) Hypothèses de planification

- **Durée d’un sprint** : 1 semaine (adaptable).
- **Équipe** : 1–2 développeurs.
- **Capacité** : 20–30 SP / sprint (indicatif).
- **Définition de “Done”** :
  - fonctionnalité utilisable côté UI,
  - API opérationnelle,
  - tests manuels réalisés,
  - documentation minimale mise à jour.



 2) Planning proposé (8 sprints)

> Les objectifs sont formulés en **résultats livrables** (pas en tâches techniques).

 Sprint 1 — Mise en route & compte

- **Objectif** : permettre l’accès à la plateforme avec un compte fonctionnel.
- **Backlog** : US-01, US-02, US-03, US-91, US-90
- **Livrables** : inscription/connexion, profil de base, configuration `.env.example`, documentation de lancement.

 Sprint 2 — Parties (base) + règles

- **Objectif** : jouer une partie et appliquer les règles d’échecs.
- **Backlog** : US-10, US-12 (partie + fin), US-20 (historique minimal)
- **Livrables** : création/gestion partie, fin de partie, historique visible.

 Sprint 3 — Matchmaking & temps réel

- **Objectif** : jouer en direct via Socket.io et être apparié automatiquement.
- **Backlog** : US-11, US-10 (polish), US-12 (temps réel)
- **Livrables** : lobby → match found → partie live.

 Sprint 4 — Social (amis + chat)

- **Objectif** : ajouter la dimension communautaire.
- **Backlog** : US-40, US-41, US-42
- **Livrables** : demandes d’amis, chat global/partie/privé, présence.

 Sprint 5 — Tournois

- **Objectif** : organiser des compétitions structurées.
- **Backlog** : US-50, US-51, US-52
- **Livrables** : créer/rejoindre, bracket, match + chat tournoi.

###
- **Objectif** : fournir un module d’entraînement.
- **Backlog** : US-60, US-61
- **Livrables** : puzzles (jour/aléatoire/thème selon implémentation) + stats puzzles.

Sprint 7 — Analyse IA / coaching + historique avancé

- **Objectif** : aider le joueur à progresser.
- **Backlog** : US-70, US-71, US-21, US-22
- **Livrables** : relecture, export PGN, revue IA et recommandations.

 Sprint 8 — Tableau de bord & finalisation

- **Objectif** : consolider le produit pour la soutenance.
- **Backlog** : US-30, US-31, US-32, US-80 + corrections / UX / docs
- **Livrables** : classement, stats, dashboard, analytics admin, préparation démo.

---

 3) Risques & plans de mitigation

- **Risque** : complexité temps réel (désynchronisations).
  - **Mitigation** : scénarios de tests manuels + logs + “rejoin”.
- **Risque** : charge importante IA / Stockfish.
  - **Mitigation** : heuristique fallback, profondeur limitée.
- **Risque** : surcharge planning.
  - **Mitigation** : stories P3 reportées (US-15, US-16, US-43, US-92, US-93).


 4) Éléments hors sprint (optionnels)

- US-15 Défi ami
- US-16 Spectateur
- US-43 Modération chat
- US-92 Tests automatisés
- US-93 Déploiement reproductible

