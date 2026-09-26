 Product backlog — Square One Chess (PFE)

**Objectif :** liste priorisée des besoins (user stories) qui décrivent **la valeur métier** livrée par le système.  
**Sprint planning :** voir `docs/SPRINT-PLANNING.md`.

---

 1) Légende

- **Priorité**: P1 (haut) · P2 (moyen) · P3 (bas)
- **Estimation (SP)**: 1 / 2 / 3 / 5 / 8
- **Statut**:  fait ·  à faire


 2) Epics (vue synthétique)

- **E1 Compte & sécurité**
- **E2 Parties en ligne (matchmaking + temps réel)**
- **E3 Historique & relecture**
- **E4 Statistiques & classement**
- **E5 Social (amis + chat)**
- **E6 Tournois**
- **E7 Puzzles**
- **E8 Coaching IA / analyse**
- **E9 Administration (analytics)**
- **E10 Qualité & déploiement**

---

 3) Backlog (user stories)

 E1 — Compte & sécurité

| ID | User story (valeur) | Priorité | SP | Statut |
|----|----------------------|----------|----|--------|
| US-01 | En tant que **visiteur**, je veux **créer un compte** afin d’accéder aux services de la plateforme. | P1 | 3 |  |
| US-02 | En tant que **joueur**, je veux **gérer mon profil** afin de personnaliser mon compte. | P1 | 2 |  
| US-03 | En tant que **joueur**, je veux **sécuriser l’accès** à mon compte (session, déconnexion) afin d’éviter un usage non autorisé. | P1 | 2 |  
| US-04 | En tant que **joueur**, je veux **récupérer l’accès** à mon compte (mot de passe oublié) afin de revenir sur la plateforme. | P2 | 3 | 
| US-05 | En tant que **joueur**, je veux **confirmer mon e-mail** afin de fiabiliser mon identité sur la plateforme. | P2 | 3 | 

 E2 — Parties en ligne (matchmaking + temps réel)

| ID | User story (valeur) | Priorité | SP | Statut |
|----|----------------------|----------|----|--------|
| US-10 | En tant que **joueur**, je veux **lancer une partie en ligne** avec contrôle de temps afin de jouer en direct. | P1 | 8 | 
| US-11 | En tant que **joueur**, je veux **être apparié automatiquement** à un adversaire afin de jouer rapidement. | P1 | 5 | 
| US-12 | En tant que **joueur**, je veux **terminer correctement une partie** (abandon / nulle) afin d’avoir un résultat cohérent. | P1 | 3 | 
| US-13 | En tant que **joueur**, je veux **jouer contre l’IA** avec difficulté afin de m’entraîner. | P2 | 5 | 
| US-14 | En tant que **joueur**, je veux **continuer une partie malgré une déconnexion** afin d’éviter les pertes de partie injustes. | P2 | 5 | 
| US-15 | En tant que **joueur**, je veux **défier un ami** afin de jouer contre une personne choisie. | P3 | 5 | 
| US-16 | En tant que **joueur**, je veux **assister à une partie** en spectateur afin de suivre des matchs. | P3 | 8 | 
 E3 — Historique & relecture

| ID | User story (valeur) | Priorité | SP | Statut |
|----|----------------------|----------|----|--------|
| US-20 | En tant que **joueur**, je veux **consulter l’historique** de mes parties afin de retrouver mes matchs. | P1 | 3 | 
| US-21 | En tant que **joueur**, je veux **rejouer une partie** afin de revoir les coups. | P1 | 3 | 
| US-22 | En tant que **joueur**, je veux **obtenir le PGN** afin d’exporter/analyser ailleurs. | P2 | 2 | 
| US-23 | En tant que **joueur**, je veux **importer un PGN** afin d’analyser une partie externe. | P3 | 5 | 

 E4 — Statistiques & classement

| ID | User story (valeur) | Priorité | SP | Statut |
|----|----------------------|----------|----|--------|
| US-30 | En tant que **joueur**, je veux **consulter le classement** afin de comparer mon niveau. | P1 | 3 | 
| US-31 | En tant que **joueur**, je veux **visualiser mes statistiques** (Elo, résultats, séries) afin de mesurer ma progression. | P1 | 3 | 
| US-32 | En tant que **joueur**, je veux **consulter un profil joueur** afin de voir ses performances. | P2 | 2 | 

 E5 — Social (amis + chat)

| ID | User story (valeur) | Priorité | SP | Statut |
|----|----------------------|----------|----|--------|
| US-40 | En tant que **joueur**, je veux **gérer mes amis** afin de construire mon réseau. | P1 | 5 | 
| US-41 | En tant que **joueur**, je veux **communiquer** (global / partie / privé) afin d’échanger pendant l’activité. | P1 | 5 | 
| US-42 | En tant que **joueur**, je veux **voir la présence en ligne** afin de savoir qui est disponible. | P2 | 3 | 
| US-43 | En tant que **joueur**, je veux **bloquer/signaliser** un abus afin de rendre le chat sûr. | P3 | 5 | 
 E6 — Tournois

| ID | User story (valeur) | Priorité | SP | Statut |
|----|----------------------|----------|----|--------|
| US-50 | En tant que **joueur**, je veux **participer à des tournois** afin de jouer en compétition. | P2 | 8 | 
| US-51 | En tant que **joueur**, je veux **suivre le bracket et les matchs** afin de comprendre l’avancement. | P2 | 5 |
| US-52 | En tant que **joueur**, je veux **échanger dans le tournoi** afin de communiquer avec les participants. | P3 | 2 | 

 E7 — Puzzles

| ID | User story (valeur) | Priorité | SP | Statut |
|----|----------------------|----------|----|--------|
| US-60 | En tant que **joueur**, je veux **résoudre des puzzles** afin de m’entraîner tactiquement. | P2 | 5 | 
| US-61 | En tant que **joueur**, je veux **voir mes stats puzzles** afin de suivre ma progression. | P3 | 2 | 

 E8 — Coaching IA / analyse

| ID | User story (valeur) | Priorité | SP | Statut |
|----|----------------------|----------|----|--------|
| US-70 | En tant que **joueur**, je veux **analyser une partie** afin d’identifier mes erreurs et axes de progrès. | P2 | 5 | 
| US-71 | En tant que **joueur**, je veux **obtenir des recommandations** (leçons, estimation) afin de progresser. | P3 | 5 | 

E9 — Administration (analytics)

| ID | User story (valeur) | Priorité | SP | Statut |
|----|----------------------|----------|----|--------|
| US-80 | En tant qu’administrateur, je veux **suivre l’activité afin de piloter la plateforme. | P3 | 5 | 

 E10 — Qualité & déploiement

| ID | User story (valeur) | Priorité | SP | Statut |
|----|----------------------|----------|----|--------|
| US-90 | En tant qu’équipe, nous voulons documenter le projet afin de faciliter la maintenance. | P1 | 3 | 
| US-91 | En tant qu’équipe, nous voulons sécuriser la configuration (.env, secrets) afin d’éviter les fuites. | P1 | 2 | 
| US-92 | En tant qu’équipe, nous voulons des tests automatisés afin de fiabiliser les livraisons. | P3 | 8 | 
| US-93 | En tant qu’équipe, nous voulons un déploiement reproductible(Docker/DB prod) afin de faciliter la mise en ligne. | P3 | 8 | 



4) Backlog futur (exemples)

- Défi ami + rematch
- Notifications (amis, tournois, nulle)
- Spectateur
- Niveaux IA plus fins
