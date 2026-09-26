# Cas d'utilisation UC-01 — S'inscrire

## 1. Identification

| Élément | Valeur |
|---------|--------|
| **Identifiant** | UC-01 |
| **Nom** | S'inscrire |
| **Acteur principal** | Visiteur |
| **Acteurs secondaires** | Système de messagerie (e-mail de vérification) |
| **Niveau** | Objectif utilisateur (fonctionnel) |
| **Priorité** | Must have |

---

## 2. Description

Le **visiteur** crée un compte joueur sur la plateforme Square One Chess en fournissant un pseudo, une adresse e-mail et un mot de passe. Le système enregistre le compte, initialise les données de profil (Elo par défaut) et permet au visiteur d'accéder aux fonctionnalités réservées aux joueurs connectés.

---

## 3. Préconditions

- Le visiteur n'est pas connecté.
- Le visiteur accède à la page d'inscription (`/register`).
- Le serveur API et la base de données sont disponibles.

---

## 4. Postconditions

### Succès

- Un compte **User** est créé en base (e-mail, pseudo, mot de passe hashé).
- Un **cookie HttpOnly** contenant le jeton d'accès (JWT) est posé sur le navigateur.
- Le visiteur devient **Joueur** et peut accéder au dashboard ou à la vérification e-mail selon la configuration.

### Échec

- Aucun compte n'est créé (ou compte supprimé si l'e-mail de vérification n'a pas pu être envoyé en production).
- Le visiteur reste sur la page d'inscription avec un message d'erreur explicite.

---

## 5. Scénario nominal

| Étape | Acteur | Action |
|------:|--------|--------|
| 1 | Visiteur | Ouvre la page « Inscription » depuis la plateforme. |
| 2 | Visiteur | Saisit son **pseudo**, son **e-mail** et son **mot de passe** (minimum 6 caractères). |
| 3 | Visiteur | Valide le formulaire d'inscription. |
| 4 | Système | Contrôle la validité des champs (format e-mail, longueur mot de passe, pseudo autorisé). |
| 5 | Système | Vérifie que l'e-mail et le pseudo ne sont pas déjà utilisés. |
| 6 | Système | Crée le compte en base avec mot de passe **hashé** (bcrypt). |
| 7 | Système | Génère un jeton JWT et le place dans le cookie `square_one_access_token`. |
| 8a | Système | *(Si vérification e-mail requise)* Envoie un e-mail de confirmation au visiteur. |
| 8b | Système | *(Sinon)* Marque l'e-mail comme vérifié (mode développement ou configuration). |
| 9 | Système | Redirige le visiteur vers la page « Vérifier votre e-mail » ou le **tableau de bord**. |
| 10 | Visiteur | Accède aux services réservés aux joueurs (lobby, parties, profil, etc.). |

---

## 6. Scénarios alternatifs

### 6a. Données invalides (étape 4)

- **Condition :** champs vides, e-mail mal formé, mot de passe trop court ou pseudo invalide.
- **Comportement :** le système affiche un message d'erreur sur le formulaire ; l'inscription n'est pas envoyée.

### 6b. E-mail déjà enregistré (étape 5)

- **Condition :** l'e-mail existe déjà en base.
- **Comportement :** réponse HTTP 409 — message « E-mail déjà utilisé » ; aucun nouveau compte.

### 6c. Pseudo déjà pris (étape 5)

- **Condition :** le pseudo existe déjà en base.
- **Comportement :** réponse HTTP 409 — message « Pseudo déjà pris » ; aucun nouveau compte.

### 6d. Échec d'envoi de l'e-mail de vérification (étape 8a)

- **Condition :** vérification e-mail obligatoire et serveur SMTP indisponible.
- **Comportement :** le compte créé est annulé ; message d'erreur invitant à réessayer ou à contacter l'administrateur.

### 6e. Visiteur possède déjà un compte

- **Condition :** le visiteur clique sur « Se connecter » depuis la page d'inscription.
- **Comportement :** redirection vers la page de connexion (hors périmètre de UC-01).

---

## 7. Règles métier

| Règle | Description |
|-------|-------------|
| **RN-01** | Le mot de passe est stocké uniquement sous forme hashée ; jamais en clair. |
| **RN-02** | L'e-mail est unique dans le système. |
| **RN-03** | Le pseudo (username) est unique dans le système. |
| **RN-04** | Elo initial par défaut : 1200 (bullet, blitz, rapid). |
| **RN-05** | Le jeton d'authentification n'est pas renvoyé dans le corps JSON ; il est transmis via cookie HttpOnly. |
| **RN-06** | Si `REQUIRE_EMAIL_VERIFICATION=true`, certaines actions peuvent être bloquées tant que l'e-mail n'est pas vérifié. |

---

## 8. Exigences liées (traçabilité)

| Type | Référence |
|------|-----------|
| User story | US-01 — Backlog (`docs/BACKLOG.md`) |
| API | `POST /api/auth/register` |
| Interface | Page Angular `/register` |
| Diagramme global | `docs/uml/01-use-case.puml` (cas « S'inscrire ») |
| Diagramme de séquence | `docs/uml/07-sequence-inscription.puml` |

---

## 9. Maquette / interface

- Formulaire : pseudo, e-mail, mot de passe, bouton « Créer le compte ».
- Lien vers la page de connexion pour les utilisateurs existants.

---

*Square One Chess — PFE / NCIS — ISI Kef*
