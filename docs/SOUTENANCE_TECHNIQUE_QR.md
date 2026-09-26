# Soutenance technique — Questions / réponses (préparation)

Document de révision pour la défense du projet **plateforme d’échecs** (Angular + API Node). Adaptez les formulations à l’oral (plus courtes que le texte écrit).

---

## 1. Présentation générale du projet

### Q1. Quel est l’objectif de votre application ?
**R.** Une plateforme web permettant de jouer aux échecs en ligne, avec authentification, parties classées, lobby et file d’attente par contrôle du temps, classements, historique, revue de partie (IA), tournois, social (amis, chat) et tableaux de bord analytiques pour les administrateurs.

### Q2. Pourquoi avoir séparé frontend et backend ?
**R.** Séparation des responsabilités : le **backend** expose une API REST sécurisée et du temps réel (WebSockets) ; le **frontend** gère l’interface et l’expérience utilisateur. Cela facilite les évolutions indépendantes, les tests, et éventuellement le déploiement sur des domaines ou serveurs différents.

### Q3. Quelles technologies principales avez-vous utilisées ?
**R.**  
- **Backend :** Node.js, **Express** (HTTP), **TypeScript**, **Prisma** (ORM) avec **SQLite**, **Socket.io** (temps réel), **chess.js** (règles et état de partie), **JWT** + **bcrypt** (sécurité).  
- **Frontend :** **Angular** (composants standalone, lazy loading), **RxJS**, client HTTP et **socket.io-client**.  
- **IA :** moteur **Stockfish** (WASM via npm) avec repli sur heuristiques si le moteur n’est pas disponible.

---

## 2. Architecture et conception

### Q4. Décrivez l’architecture globale en une minute.
**R.** Le client Angular appelle l’API sur `/api` (JSON, JWT). Le serveur Node monte les routes (auth, games, stats, AI, tournois, analytics, amis, chat). La persistance passe par **Prisma** vers SQLite. Le **même serveur HTTP** héberge **Socket.io** pour le matchmaking, les notifications de partie et le chat en temps réel.

### Q5. Pourquoi Prisma plutôt que du SQL brut ?
**R.** Typage fort généré à partir du schéma, migrations versionnées, requêtes lisibles et moins d’erreurs à l’exécution. SQLite convient au développement et à une charge modérée ; on peut migrer vers PostgreSQL en changeant surtout la datasource.

### Q6. Pourquoi SQLite pour ce projet ?
**R.** Simplicité de déploiement (un fichier), pas de serveur DB séparé en dev, suffisant pour une démo et un usage modéré. Limite : concurrence élevée et scalabilité horizontale — en production à fort trafic, on envisagerait PostgreSQL ou autre SGBD client-serveur.

### Q7. Où se trouve la « logique métier » ?
**R.** Principalement dans les **services** (`game.service`, `stats.service`, `auth.service`, etc.), appelés par les **contrôleurs** qui ne font que valider la requête, appeler le service et renvoyer la réponse. Cela évite d’encombrer les routes et facilite les tests.

---

## 3. Sécurité et authentification

### Q8. Comment authentifiez-vous les utilisateurs ?
**R.** Inscription / connexion avec **email ou pseudo** et mot de passe. Le mot de passe est **hashé avec bcrypt** avant stockage. Après login, le serveur émet un **JWT** (JSON Web Token) signé avec un secret ; le client l’envoie dans `Authorization: Bearer <token>`.

### Q9. Qu’est-ce qu’un JWT et quels sont ses avantages / limites ?
**R.** C’est un token signé contenant des claims (ex. `sub` = id utilisateur). **Avantages :** stateless côté serveur (pas de session serveur obligatoire), adapté aux API et au mobile. **Limites :** révocation difficile avant expiration ; il faut durées courtes, HTTPS en production, et ne jamais mettre de données sensibles dans le payload (il est encodé, pas chiffré).

### Q10. Comment sécurisez-vous les routes API ?
**R.** Middleware **`verifyToken`** sur les routes protégées : vérification de la signature et de l’expiration du JWT, puis enrichissement de `req.user`. Routes admin avec contrôle du rôle ou « admin ou soi-même » pour les données utilisateur sensibles.

### Q11. Quels en-têtes ou middlewares HTTP utilisez-vous pour la sécurité ?
**R.** **Helmet** (en-têtes HTTP de durcissement), **CORS** configuré pour limiter les origines en production, corps JSON limité en taille, gestion centralisée des erreurs pour ne pas fuiter d’informations inutiles.

### Q12. Les mots de passe sont-ils stockés en clair ?
**R.** Non. **Hachage bcrypt** avec salting intégré ; on ne compare jamais le mot de passe en clair au stockage, on compare au hash lors du login.

---

## 4. Modèle de données et échecs

### Q13. Comment modélisez-vous une partie ?
**R.** Table **Game** : joueurs blancs/noirs, FEN, PGN optionnel, statut, gagnant, **contrôle du temps** (`timeControl`, ex. `10+0`), dates. Table **Move** : coups liés à la partie avec cases départ/arrivée, pièce, promotion, FEN après le coup.

### Q14. Comment validez-vous qu’un coup est légal ?
**R.** Avec **chess.js** côté serveur : on charge la position (FEN), on tente le coup ; si la bibliothèque rejette, on renvoie une erreur. Cela évite de faire confiance uniquement au client.

### Q15. Pourquoi plusieurs champs ELO (`elo`, `eloBullet`, etc.) ?
**R.** Pour refléter la pratique des plateformes d’échecs : un joueur peut être fort en **bullet** et plus faible en **rapid**. Le champ `elo` représente souvent le **pic** (maximum des trois) pour un classement « combiné » ; les parties mettent à jour **uniquement** le bucket correspondant au **contrôle du temps** de la partie.

### Q16. Comment classez-vous bullet / blitz / rapid ?
**R.** À partir du libellé du contrôle du temps (minutes avant le `+`) : typiquement **&lt; 3 min → bullet**, **3 à 9 → blitz**, **10+ → rapid** (règles métier dans des constantes partagées pour cohérence lobby / stats).

---

## 5. Temps réel et matchmaking

### Q17. Pourquoi Socket.io et pas seulement du REST ?
**R.** Le REST ne pousse pas les événements au client. Pour la **file d’attente**, le **match trouvé**, le **chat** et la synchronisation de partie, le temps réel est nécessaire. Socket.io gère reconnexion, rooms, et un modèle événementiel simple sur le même serveur que l’API.

### Q18. Comment fonctionne le matchmaking ?
**R.** Les joueurs rejoignent une **queue** avec un **contrôle du temps** choisi. Le serveur associe deux joueurs avec le **même** contrôle du temps et des **ELO proches** (dans une fenêtre configurable). L’ELO utilisé pour la file est celui du **format** (bullet/blitz/rapid) correspondant au contrôle, pour que l’appariement soit cohérent avec la notation.

### Q19. La queue est-elle persistée en base ?
**R.** Il existe une entité **QueueEntry** (utilisateur, ELO au moment de l’entrée). La logique exacte peut combiner mémoire et persistance selon l’implémentation ; l’important à la soutenance est de dire que l’on évite les incohérences en recalculant ou stockant l’ELO pertinent au moment de l’entrée en file.

---

## 6. API REST et bonnes pratiques

### Q20. Comment structurez-vous les routes ?
**R.** Préfixe `/api`, sous-modules `/auth`, `/games`, `/stats`, etc. Méthodes HTTP cohérentes (GET lecture, POST création/action, PUT mise à jour). Paramètres de requête pour filtres (ex. `format` sur le classement).

### Q21. Comment gérez-vous les erreurs ?
**R.** Classe d’erreur HTTP typée (`HttpError` avec code et message), **middleware** Express en fin de chaîne qui renvoie du JSON uniforme. Les contrôleurs async sont enveloppés pour transmettre les erreurs à ce middleware.

### Q22. CORS, c’est quoi et pourquoi c’est important ?
**R.** Cross-Origin Resource Sharing : le navigateur bloque par défaut les appels depuis un domaine (ex. `localhost:4200`) vers un autre (`localhost:3000`) sans en-têtes CORS explicites. Le backend autorise l’origine du front en développement (et une liste stricte en production).

---

## 7. Frontend Angular

### Q23. Pourquoi Angular plutôt que React ou Vue ?
**R.** (Adapter selon votre choix réel.) Framework complet avec **CLI**, structure par modules/composants, **TypeScript** natif, **RxJS** pour les flux asynchrones, garde-fous pour les formulaires et le routage. Argument défendable : cohérence pour une équipe et pour des applications « entreprise ».

### Q24. Qu’est-ce qu’un composant « standalone » ?
**R.** Depuis les versions récentes d’Angular, un composant peut se déclarer sans `NgModule` : il importe lui-même ses dépendances. Cela simplifie le lazy loading et réduit la cérémonie des modules.

### Q25. Comment le front appelle-t-il l’API ?
**R.** **`HttpClient`** avec une **URL de base** (`environment.API_URL`), et un **intercepteur** qui ajoute le **Bearer JWT** sur les requêtes protégées.

### Q26. Comment gérez-vous les routes côté Angular ?
**R.** **`Router`** avec garde **`authGuard`** sur les pages privées et **`guestGuard`** sur login/register pour rediriger si déjà connecté. Chargement lazy des composants de page pour réduire le bundle initial.

---

## 8. Intelligence artificielle / Stockfish

### Q27. Comment fonctionne la fonctionnalité « suggestion de coups » ou « analyse » ?
**R.** L’API envoie des commandes **UCI** au moteur Stockfish (version **WASM** intégrée via npm pour éviter d’installer un binaire sur chaque machine). On fixe la position en FEN, profondeur / MultiPV, on parse les lignes `info` et `bestmove`. En cas d’échec du moteur, on peut retomber sur des **heuristiques** (évaluation simplifiée avec chess.js) pour garder le service disponible.

### Q28. Pourquoi Stockfish en WASM ?
**R.** Portabilité (Windows / Mac / Linux sans installation séparée), même binaire logique que pour du navigateur, force de jeu très élevée. **Inconvénient :** taille du package et temps de chargement au premier appel ; **licence GPL** à mentionner si redistribution.

### Q29. L’ELO estimé par l’IA est-il le même que l’ELO du site ?
**R.** Non nécessairement : l’estimation peut combiner précision des coups, maladresses, etc. L’**ELO officiel** du site est mis à jour par les **résultats de parties** avec une formule type Elo (K-factor, score attendu). Il faut bien distinguer **estimation pédagogique** et **rating compétitif**.

---

## 9. Tests, qualité et déploiement

### Q30. Avez-vous des tests automatisés ?
**R.** (Réponse honnête selon votre repo.) Si peu ou pas : « Les tests unitaires sur les services critiques (ELO, validation des coups) et les tests d’intégration API sont la prochaine étape prioritaire. » Si vous en avez : décrire où (`*.spec.ts`) et ce qu’ils couvrent.

### Q31. Comment déployeriez-vous en production ?
**R.** Backend : build `tsc`, process manager (**PM2**), variables d’environnement (JWT secret, `DATABASE_URL` vers PostgreSQL), HTTPS derrière un reverse proxy (**Nginx**). Frontend : `ng build --configuration production`, fichiers statiques sur CDN ou servis par Nginx. Base de données managée pour sauvegardes et haute disponibilité.

### Q32. Quels risques voyez-vous à la mise en production ?
**R.** Charge sur SQLite, secret JWT mal configuré, CORS trop permissif, absence de rate limiting sur login, dépendances avec vulnérabilités (`npm audit`). Mentionner mitigation (SGBD adapté, secrets, limites, mises à jour).

---

## 10. Questions « pièges » courantes

### Q33. Que se passe-t-il si deux joueurs envoient un coup en même temps ?
**R.** Le serveur traite les requêtes séquentiellement par instance Node ; la base et les transactions Prisma garantissent une **écriture cohérente** de l’état de partie. Pour du multi-serveur, il faudrait verrou ou source de vérité partagée (Redis, etc.).

### Q34. Pourquoi ne pas faire toute la logique côté client ?
**R.** Le client ne peut pas être « de confiance » : un utilisateur modifié pourrait envoyer des coups illégaux ou tricher sur l’ELO. La **source de vérité** est le serveur.

### Q35. Différence entre authentification et autorisation ?
**R.** **Authentification :** prouver qui vous êtes (login, JWT). **Autorisation :** ce que vous avez le droit de faire (ex. ne lire que **son** historique ELO détaillé, être admin pour `/analytics`).

### Q36. Qu’est-ce que l’injection SQL ici ?
**R.** Prisma paramètre les requêtes : le risque d’injection SQL classique est fortement réduit par rapport au SQL concaténé. Il reste à valider les entrées métier (pseudo, limites numériques).

### Q37. RGPD / données personnelles ?
**R.** Données typiques : email, pseudo, historique de parties. À mentionner : consentement, durée de conservation, droit d’accès/suppression, sécurisation des accès, hébergement dans l’UE si applicable — même si le projet académique est simplifié.

---

## 11. Bilan et limites du projet

### Q38. Quelles sont les limites actuelles du projet ?
**R.** (Adapter.) Exemples : SQLite en production limitée, pas de cluster multi-instances, couverture de tests à renforcer, migration Prisma à harmoniser entre machines, audit npm avec dépendances transitives.

### Q39. Quelles évolutions proposeriez-vous en priorité ?
**R.** PostgreSQL, file de matchmaking distribuée, notifications push, anti-triche plus poussée, parties en différé, API publique documentée (OpenAPI), internationalisation (i18n).

### Q40. Qu’avez-vous appris personnellement ?
**R.** (Votre vécu.) Ex. : modéliser un domaine métier, séparer API et UI, importance de la sécurité par défaut, complexité du temps réel, intégration d’un moteur tiers sous contrainte de licence.

---

## Conseils pour demain (oral)

1. **Commencer** par problématique → objectifs → architecture en schéma (client / API / DB / temps réel).  
2. **Montrer** une démo courte (connexion → lobby → partie → classement).  
3. En cas de question hors sujet : « Ce point n’a pas été priorisé, voici comment je l’aborderais… »  
4. Maîtriser **un** diagramme (séquence : login JWT, ou : coup → validation → persistance).

Bonne soutenance.
