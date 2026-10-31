# Anime Masters — Général

[← Index des specs](README.md)

Jeu de cartes à collectionner de personnages d'anime, inspiré de WikiMasters. Fangame **entièrement gratuit** : aucun achat réel, et la progression ne doit jamais frustrer (en jouant assez, on finit toujours par obtenir ce qu'on veut).

## MVP (validé)
Objectif : ouvrir des paquets et voir sa collection, en local.

- **Étape 1** complète, sauf : reprise de l'import page par page, table `ImportRun` (résumé dans la console), `attributes`, `descriptionFr`.
- **Étape 2** minimale : comptes, cristaux, bienvenue et calendrier de connexion quotidien sur 30 jours, tirage complet (taux, finitions, carte garantie, pity SSR/UR, numéros d'exemplaire), ouverture (retournement, Holo/Gold, « NOUVEAU »), album (filtres rareté / type / anime, recherche, doublons, progression par anime), fiche perso, script de simulation des taux.
- **Repoussé** : lueur de rareté au dos des cartes, indicateurs de finition, page `/profile`, étapes 3 à 6.

Ordre : 1. initialisation → 2. import (vérification dans Prisma Studio) → 3. tirage + simulation (vérification des taux) → 4. comptes, paquets, ouverture → 5. album et fiche perso.

---

## Étape 6 — Mise en ligne

### Objectif
Mettre Anime Masters en ligne de façon fiable, sécurisée et conforme, d'abord en bêta fermée.

### Décisions validées
- Hébergement : **Vercel** (site) + **Supabase** (PostgreSQL, temps réel, tâches planifiées).
- Vérification d'email obligatoire pour échanger, utiliser les enchères et jouer en duel (pas pour ouvrir des paquets).
- Âge minimum : 15 ans. Procédure de retrait pour les ayants droit.
- Lancement en **bêta fermée** avec codes d'invitation, puis ouverture publique.
- Nom : **Anime Masters**.

---

### 1. Hébergement
| Élément | Service |
|---|---|
| Site Next.js | Vercel (gratuit au départ) |
| Base PostgreSQL | Supabase (gratuit au départ, **Pro dès l'arrivée de vrais joueurs** : sauvegardes quotidiennes, pas de mise en pause) |
| Temps réel (chat) | Supabase Realtime, remplace le polling de l'étape 5 |
| Tâches toutes les minutes (clôture des enchères, expiration des duels et des échanges) | `pg_cron` + `pg_net` sur Supabase, qui appellent une route protégée du site (secret partagé) |
| Import AniList hebdomadaire | GitHub Actions (tâche planifiée qui lance le script d'import sur la base de production) |

Limites connues du plan gratuit Supabase : mise en pause après 7 jours sans activité, pas de sauvegardes automatiques.

### 2. Passage de SQLite à PostgreSQL
- Le schéma Prisma est écrit **dès l'étape 1** pour fonctionner sur SQLite et PostgreSQL (le passage se fait en changeant le `provider` et l'URL de la base).
- Pas de migration des données locales : en production, on relance l'import AniList ; les joueurs partent de zéro.

### 3. Emails
- Service : **Resend** (3 000 emails par mois gratuits).
- Emails : vérification de l'adresse, mot de passe oublié. Aucun email marketing.
- Fonctionnalités réservées aux emails vérifiés : échanges, enchères, duels.

### 4. Sécurité
- **CAPTCHA** à l'inscription : Cloudflare Turnstile.
- **Limite de requêtes** : connexion, inscription, ouverture de paquets, offres d'enchères, messages.
- **HTTPS** automatique ; secrets uniquement dans les variables d'environnement.
- **Suivi des erreurs** : Sentry.
- **Sauvegardes** : quotidiennes (Supabase Pro), avec un test de restauration avant l'ouverture publique.

### 5. Aspects juridiques
*Analyse non juridique, à faire relire si le projet grossit.*
- **Mentions légales** (obligatoires en France). Un particulier peut ne pas publier son identité s'il la communique à l'hébergeur.
- **CGU** : règles du jeu, sanctions, Ryō et cartes sans valeur réelle, interdiction de les revendre contre de l'argent réel, âge minimum de 15 ans.
- **Politique de confidentialité (RGPD)** : données collectées (email, pseudo, activité), durées de conservation, suppression du compte depuis le profil.
- **Cookies** : uniquement le cookie de session (indispensable), donc pas de bannière.
- **Copyright** :
  - crédit « Données : AniList » visible sur le site ;
  - adresse de contact pour les ayants droit ;
  - retrait d'un personnage ou d'une série sous 48 h sur demande (champ `disabled` sur `Character` : ne tombe plus dans les paquets et n'est plus affiché ; les cartes existantes sont conservées mais masquées).
- Rappel : site gratuit, sans monétisation (voir étape 3).

### 6. Lancement
- **Bêta fermée** : inscription uniquement avec un code d'invitation ; chaque joueur reçoit 3 codes à partager. Codes générés par l'administrateur pour le premier groupe.
- **Ouverture publique** : désactivation du code d'invitation, une fois la stabilité vérifiée.
- **Nom de domaine** : `anime-masters.com` est déjà pris. Disponibles en apparence (à confirmer chez un registrar) : `anime-masters.fr`, `anime-masters.gg`, `anime-masters.app`.

### 7. Modèle de données (ajouts)
- **User** : `emailVerified` (géré par Better Auth), `invitedById`
- **InviteCode** : `code`, `ownerId` (null si créé par l'administrateur), `usedById`, `createdAt`, `usedAt`
- **Character** : ajout de `disabled`

### 8. Critères pour dire que l'étape 6 est finie
- [ ] Le site est accessible en HTTPS sur son domaine.
- [ ] La base de production est remplie par l'import, avec un import automatique chaque semaine.
- [ ] Les tâches de clôture et d'expiration tournent toutes les minutes.
- [ ] Le chat fonctionne en temps réel (Supabase Realtime).
- [ ] Vérification d'email, mot de passe oublié et CAPTCHA fonctionnent.
- [ ] Pages légales en ligne ; la suppression de compte fonctionne.
- [ ] Les erreurs remontent dans Sentry ; une sauvegarde a été restaurée avec succès en test.
- [ ] L'inscription en bêta exige un code d'invitation valide et à usage unique.
