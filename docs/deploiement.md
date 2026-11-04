# Plan de mise en production : Vercel + Supabase

Statut : **migration Postgres et dépendances combat/donjons validées localement sur `migration/postgres`**, bases Supabase dev et prod chargées ; publication Vercel non effectuée. Voir [preparation-prod.md](preparation-prod.md). Réécrit le 2026-11-02 (remplace le plan VPS, resté dans l'historique Git).

Contexte : un seul développeur humain, plusieurs agents qui poussent sur `main` en continu, fangame gratuit, bêta à lancer vite avec des amis. Base actuelle : SQLite (`data/app.db`, 25 Mo).

## 1. Décisions prises

- Hébergement du site : **Vercel**. Base de données : **Supabase (Postgres)**. Fichiers (illustrations) : dans le repo ou Supabase Storage.
- **Deux environnements** : *dev* (les agents modifient tout le temps) et *prod* (stable, les amis jouent dessus). Chacun a sa propre base Supabase.
- **La prod ne change que quand l'humain publie.**
- **Pas de preview Vercel automatique** : les tests se font en local (`npm run dev`, base dev). Une preview en ligne se déclenche à la demande seulement (voir §4).
- Plan gratuit partout pour la bêta.

## 2. Vocabulaire

- **CI (intégration continue)** : à chaque push, une machine GitHub lance les vérifications (lint, typecheck, `check-*`). Coche verte ou croix rouge sur le commit.
- **CD (déploiement continu)** : envoi du code vérifié en ligne.
- **Workflow GitHub Actions** : fichier YAML dans `.github/workflows/`.
- **Migration** : modification du schéma de la base (Prisma). `migrate dev` en local seulement ; `migrate deploy` en prod (applique les migrations en attente, ne réinitialise jamais).
- **Tag** : étiquette de version posée sur un commit (`v0.3.0`).

## 3. Le circuit

```
agents ──push──▶ main ──▶ CI (lint, typecheck, check-*)            automatique, à chaque push
                  │            (dev local : npm run dev, base Supabase « dev »)
                  │
       toi : « je publie »  =  fusion main → production + tag vX.Y.Z
                  │                 (refusée si la CI n'est pas verte)
                  ▼
   production ──▶ Vercel « Production » ──▶ base Supabase « prod »
```

- Deux branches permanentes seulement : `main` (agents) et `production` (amis). Pas de branche par release.
- Une release = fusion de `main` dans `production` + un tag + une entrée de changelog.
- La commande `npm run production:publish` exige la CI verte du commit exact de `main` avant de mettre `production` à jour en avance rapide. Le contrôle est local, pas une protection GitHub (voir [publication.md](publication.md)).
- Retour arrière du code : « Instant Rollback » dans Vercel (un clic). Il ne ramène pas la base : les migrations doivent rester compatibles avec l'ancien code.

## 4. Limites Vercel (plan Hobby)

D'après https://vercel.com/docs/limits (à revérifier au moment de s'inscrire) : 100 déploiements par jour (chaque push sur une branche en crée un), 1 build à la fois, 45 min de build maximum, usage personnel et non commercial.

Les agents poussent après chaque petite modification : `vercel.json` désactive les déploiements Git automatiques de toutes les branches (`git.deploymentEnabled` : `"**": false`), avec une exception `"production": true`. Le double astérisque couvre aussi les noms comme `migration/postgres`. Ce fichier doit être intégré à `main` et présent dans les branches concernées ; une branche sans ce fichier conserve le comportement Vercel par défaut. Dans Vercel, régler aussi Settings → Environments → Production → Branch Tracking sur `production`. Une preview en ligne, si besoin, se lance à la demande avec `vercel deploy`. Seuls les déploiements réels de la prod consomment le quota.

## 5. Les étapes

Chaque étape est testée avant la suivante.

### Étape 1 — Migration SQLite vers Postgres (branche dédiée)

- Provider Prisma `postgresql`, adaptateur `@prisma/adapter-pg` dans `src/lib/db.ts`, Better Auth `postgresql`. SQL brut : vérifier aussi `src/lib/leaderboard.ts` et les scripts historiques.
- Nouvelle migration de départ Postgres ; historique SQLite conservé dans `prisma/sqlite/`. `prisma.sqlite.config.ts` reste réservé aux anciennes bases.
- `DATABASE_URL` pour le runtime ; `DIRECT_URL` facultatif pour les migrations (connexion directe ou pooler session).
- Connexion via le pooler Supabase (port 6543, mode transaction) : indispensable sur Vercel, chaque requête peut ouvrir sa connexion.
- Relancer les 43 `check-*` sur Postgres et corriger ce qui casse.
- Adapter ou remplacer `play:sync` et les scripts d'import.
- Vérification dans le navigateur des parcours principaux (règle d'`AGENTS.md`).

### Étape 2 — `npm run check`

Implémentée sur `migration/postgres` : lint, types de routes, TypeScript, puis découverte et exécution de tous les `scripts/check-*.ts`, avec délais et résumé des échecs. Une base Postgres jetable est créée et supprimée pour chaque lancement. Voir [checks.md](checks.md) pour la connexion de test et les journaux.

### Étape 3 — Données de test et CI GitHub Actions

- Catalogue fixe versionné de 368 personnages pour que les checks ne dépendent pas d'AniList (plus de 100 de chaque genre requis par les bannières existantes).
- `.github/workflows/ci.yml` implémenté sur `migration/postgres` : Node 24 (`.nvmrc`), service Postgres 17, `npm ci`, puis migrations et chargement des données via `npm run check`. Annulation des anciens runs de la même branche, cache npm, délais et journaux d'échec limités à trois jours. Voir [checks.md](checks.md).
- Publication contrôlée vers `production` : `npm run production:publish` (aperçu), puis `-- --apply` sur instruction humaine. Un dépôt privé personnel exige GitHub Pro pour une protection serveur ; sur Free, un push direct contourne le script.
- Ensuite, proposer (avec permission) une règle dans `AGENTS.md` : lancer `npm run check` avant de pousser.

### Étape 4 — Deux projets Supabase

Bases dev et prod initialisées et catalogue chargé le 2026-11-03 ; sauvegarde ponctuelle restaurée en test, permissions publiques fermées. Copie externe et sauvegardes quotidiennes en place (section 9). Voir [preparation-prod.md](preparation-prod.md).

- `anime-dev` et `anime-prod` (le plan gratuit permet 2 projets actifs).
- Clés et URLs dans un coffre à part, jamais dans le repo. Variables d'environnement Vercel, une valeur par environnement.
- Contenu envoyé dans chaque base : personnages, séries, sorts modifiés, par des scripts rejouables (ajout ou mise à jour, jamais de suppression). La prod démarre **sans aucun compte** ; les données joueurs de la prod ne sont jamais écrasées.

### Étape 5 — Vercel

- Branche de production = `production`. Déploiement auto désactivé pour `main` (§4).
- `BETTER_AUTH_SECRET` et `BETTER_AUTH_URL` propres à la prod.
- Illustrations : dans le repo (9 Mo aujourd'hui) ou Supabase Storage. Le disque de Vercel est en lecture seule : les outils de dev qui écrivent sur disque (Spell Builder, mécaniques) restent en local.
- Migrations de la prod : `prisma migrate deploy` lancé **avant** chaque publication (à la main au début, puis par un workflow GitHub). Procédure détaillée en §10.

### Étape 6 — Première publication, à la main

Fusion `main` → `production`, tag `v0.1.0`, vérification du site en ligne (inscription, ouverture de paquet, combat, persistance après rechargement), puis ouverture à quelques amis.

### Étape 7 — Notes de mise à jour

- `CHANGELOG.md` à la racine, écrit à chaque release en langage joueur (un agent le prépare depuis les commits depuis le dernier tag, l'humain relit).
- GitHub Release créée depuis le tag, avec le même texte.
- Option : page « Nouveautés » dans le jeu qui affiche ce fichier.

### Étape 8 — Plus tard

Test de charge avant d'inviter plus de monde, alerte si le site tombe (UptimeRobot ou équivalent), Playwright sur 3–4 parcours clés, domaine personnalisé.

Les sauvegardes régulières de la base prod sont en place : voir la section 9.

## 6. Capacité attendue et limites du plan gratuit

Chiffres tirés de blogs tiers, **à vérifier** sur supabase.com/pricing et vercel.com/pricing.

- Supabase gratuit : 500 Mo de base (la base actuelle fait 25 Mo), 50 000 utilisateurs actifs par mois, 5 Go de trafic, 2 projets actifs.
- **Pause automatique du projet Supabase après 1 semaine sans activité** : à surveiller pour la prod.
- Connexions : le pooler est le vrai goulot. Estimation (non mesurée) : 20 à 50 joueurs actifs en même temps, quelques centaines à quelques milliers de comptes.
- Au-delà : Supabase Pro (25 $/mois) et/ou Vercel Pro.

## 7. Règles de prod à retenir

- `prisma migrate deploy` en prod, jamais `migrate dev` ni `db push`.
- **Migrer la prod avant de publier le code**, à chaque publication (§10). Un code publié sans sa migration casse tout le site (incident du 2026-11-03 : `User.role` absente).
- Sauvegarde de la base prod avant une migration.
- Migrations compatibles avec la version précédente du code (retour arrière possible).
- Ne jamais committer `.env` ni `data/`. Secrets uniquement dans Vercel, Supabase et GitHub.
- On ne publie qu'un commit avec une CI verte.
- Une sauvegarde jamais restaurée n'est pas une sauvegarde : tester une restauration.
- Contenu d'anime et d'images : une demande de retrait (DMCA) est possible une fois en ligne ; rester prêt à désactiver un personnage (champ `disabled`).

## 8. Questions ouvertes

- Repo GitHub **privé** (décidé le 2026-11-02).
- Adresse **`*.vercel.app`** pour la bêta (décidé le 2026-11-02).
- Illustrations : dans le repo ou Supabase Storage ?
- **Remise à zéro des joueurs à la sortie officielle**, avec sauvegarde préalable de la bêta (décidé le 2026-11-02).

## 9. Sauvegardes de la base prod

- **Quoi** : `.github/workflows/backup-prod.yml` fait un `pg_dump` (format custom, PostgreSQL 17) de la base prod, le chiffre en AES256 avec `gpg` et l'envoie dans le bucket privé Cloudflare R2, dossier `daily/`.
- **Quand** : tous les jours à 03:17 UTC, ou à la demande (Actions → Sauvegarde prod → Run workflow).
- **Rétention** : 30 jours. Les fichiers plus anciens sont supprimés par le workflow.
- **Secrets GitHub** : `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ENDPOINT`, `R2_BUCKET`, `PROD_DATABASE_URL`, `BACKUP_PASSPHRASE`. La phrase de passe est aussi dans le gestionnaire de mots de passe : sans elle, les sauvegardes sont illisibles.
- **Taille** : environ 2,5 Mo par sauvegarde au 2026-11-03.

### Restaurer (testé le 2026-11-03)

1. Télécharger le `.dump.gpg` depuis R2 (hors du dépôt ; `*.gpg` est ignoré localement).
2. `gpg --output restore.dump --decrypt fichier.dump.gpg` (la phrase de passe est demandée dans le terminal).
3. Utiliser `pg_restore` en version 17 (`/usr/lib/postgresql/17/bin/`), pas celui d'Ubuntu 22.04 (14), qui refuse le format.
4. `createdb restore_test && pg_restore --no-owner --no-privileges -d restore_test restore.dump`.
5. Trois erreurs sur l'extension `supabase_vault` sont normales hors Supabase.
6. Supprimer `restore.dump` et la base de test ensuite.

À refaire de temps en temps (par exemple chaque mois) pour s'assurer que les sauvegardes restent lisibles.

## 10. Avant chaque publication : migrer la prod

Le code et la base de données sont déployés séparément. `production:publish` ne touche pas à la base : si `main` contient une migration (ajout de colonne ou de table) que la prod n'a pas, **toutes les pages qui lisent la session échouent** (« Failed to get session », « The column … does not exist »).

Incident du 2026-11-03 : le code publié lisait `User.role` (migration `admin_roles`) et utilisait la table des événements (`game_events`), absentes de la base prod. Le site entier était en erreur jusqu'à `db:deploy`.

### Procédure (ordre obligatoire)

1. **Sauvegarde** : Actions → Sauvegarde prod → Run workflow (§9).
2. **Lister les migrations en attente** : comparer `ls prisma/migrations` avec ce que la prod a déjà appliqué (`npm run db:deploy` les applique toutes, mais n'en applique que les manquantes).
3. **Migrer la prod** (URL du **Session pooler**, port 5432, pas le Transaction pooler : les migrations sont des opérations longues) :
   ```bash
   cd ~/anime_master-postgres
   git pull && nvm use 24
   read -rs -p "URL prod : " U; export DATABASE_URL="$U" DIRECT_URL="$U"; unset U; echo
   npm run db:deploy
   unset DATABASE_URL DIRECT_URL
   ```
   Fixer **`DATABASE_URL` et `DIRECT_URL` ensemble** : `prisma.config.ts` lit `DIRECT_URL` en premier, et le `.env` local peut la pointer vers la base de dev.
4. **Publier** : `npm run production:publish`, puis `-- --apply`.
5. **Vérifier le site en ligne** (connexion, ouverture d'un lot, un combat).

### Règles pour écrire une migration

- Compatible avec l'ancienne version du code (qui tourne encore quelques secondes) : on **ajoute** une colonne ou une table, on ne supprime ni ne renomme dans la même version.
- Une nouvelle colonne obligatoire a une valeur par défaut.

### Pool de connexions (réglage retenu le 2026-11-03)

| Variable Vercel (Production) | Valeur | Pourquoi |
|---|---|---|
| `DATABASE_URL` | **Transaction pooler**, port **6543** | Le site : une connexion n'est prêtée que le temps d'une requête, donc peu de connexions servent beaucoup de joueurs. |
| `DIRECT_URL` | **Session pooler**, port **5432** | Les migrations (`db:deploy`) : opérations longues. |
| `DB_POOL_MAX` | **8** | Connexions gardées par instance Vercel (voir ci-dessous). |
| `INVITE_CODE` | phrase longue et aléatoire (12 caractères minimum) | Code demandé à l'inscription (voir §11). |

- **Supabase → Database → Settings → Connection pooling → Pool size : 15** (le projet est en calcul **Nano**, 381 Mo de RAM : plus de connexions = plus de mémoire engagée).
- `src/lib/db.ts` : 8 connexions par instance (`DB_POOL_MAX`), connexions inactives fermées après 5 s. Avec 2, une instance n'avait que 2 « tuyaux » : un combat ou un lot en occupe un pendant plusieurs secondes, les pages derrière attendaient plus de 10 s et échouaient (`timeout exceeded when trying to connect`, 59 erreurs lors d'un test de 20 joueurs). Avec 8 : **1 seule erreur serveur sur quatre tests de 20 joueurs**.
- `src/lib/auth.ts` : session en cache dans le cookie 5 minutes, ce qui évite une lecture en base à chaque page.

Mesures du 2026-11-03 (test de 10 utilisateurs simultanés : inscription, 2 lots, squad, 3 combats d'Histoire) :

| Configuration | Résultat |
|---|---|
| Session pooler (15 puis 30), 5 connexions par instance | effondrement dès 3 à 5 utilisateurs (`EMAXCONNSESSION`, timeouts de connexion) |
| **Transaction pooler, pool 15, 2 connexions par instance, cache de session** | **10 utilisateurs : 0 échec sur 70 actions, 32 s** |

Un premier essai du Transaction pooler avait échoué (transactions Prisma en timeout), mais il avait eu lieu **pendant que la base était déjà saturée** par les tests : l'essai à froid a ensuite réussi. Ne pas tester un changement de pooler juste après une rafale.

Limites connues : au-delà de 10 simultanés, le test s'est dégradé, mais la machine de test (12 cœurs, 20 navigateurs) était elle-même saturée, donc la limite réelle du serveur n'est pas mesurée. Le calcul Nano (381 Mo de RAM) reste la contrainte de fond : au-delà de quelques dizaines de joueurs actifs, prévoir la taille Micro (plan Pro de Supabase).

## 11. Inscription sur invitation

Le site est privé : créer un compte demande un **code d'invitation**, que tu donnes à tes amis.

- Le code est la variable **`INVITE_CODE`** (Vercel → Settings → Environment Variables, Production). Après un changement : **Redeploy**.
- Le contrôle est fait **côté serveur**, dans le hook d'authentification (`src/lib/auth-throttle.ts`, fonction `inviteCodeValid` de `src/lib/invite.ts`), donc l'API `/api/auth/sign-up/email` appelée directement est bloquée aussi, pas seulement le formulaire.
- **Sans `INVITE_CODE` en production, les inscriptions sont fermées** pour tout le monde (échec fermé). En développement et en test, sans variable, elles restent ouvertes.
- Les essais de code comptent dans le limiteur de tentatives (10 par minute et par adresse, 300 par minute au total) : choisir un code d'au moins 12 caractères.
- Les comptes existants se connectent sans code. Changer ou retirer le code ne déconnecte personne.
- Casse et espaces autour du code sont ignorés.
- Pour inviter quelqu'un : lui envoyer le code. Pour **révoquer** (code qui a fuité) : changer `INVITE_CODE` puis Redeploy.
- Les scripts de test qui créent des comptes par HTTP (`scripts/audit-local-security.ts`) lisent `INVITE_CODE` dans leur environnement.
- Contrôle automatique : `scripts/check-invite.ts`.

## 12. Outils de développement : jamais en production

Quatre outils ne servent qu'en local : `/outils` (le menu qui les réunit), `/dev` (dons et niveaux de test sur la base de dev), le Spell Builder (`/builder`, `/api/builder/*`) et l'éditeur d'illustrations (`/illustrations`, écritures de `/api/illustrations/*`). Ils sont fusionnés dans `main` comme le reste, mais **refusés hors développement** :
- `devToolsEnabled()` (`src/lib/dev-tools.ts`) et les gardes du Spell Builder (`builderAllowed`, `requireBuilder`) répondent « introuvable » quand `NODE_ENV` vaut `production` (Vercel, `next start`). L'éditeur d'illustrations est plus strict : développement seulement.
- Le lien « Outils » du menu du compte n'apparaît qu'en local.
- `npm run check:dev-routes` (découvert aussi par `npm run check`) échoue si une page, une action serveur ou une route de ces dossiers n'appelle pas une garde, si une route d'illustrations qui écrit n'est pas gardée, ou si un autre fichier de l'application écrit sur le disque sans garde.
- Un nouvel outil qui écrit sur le disque doit appeler une de ces gardes, sinon la CI échoue.
