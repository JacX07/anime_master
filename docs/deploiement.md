# Plan de mise en production : Vercel + Supabase

Statut : **migration Postgres préparée sur `migration/postgres`**, hébergement et Supabase non configurés. Réécrit le 2026-11-02 (remplace le plan VPS, resté dans l'historique Git).

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
- La branche `production` est protégée : fusion acceptée seulement si la CI est verte.
- Retour arrière du code : « Instant Rollback » dans Vercel (un clic). Il ne ramène pas la base : les migrations doivent rester compatibles avec l'ancien code.

## 4. Limites Vercel (plan Hobby)

D'après https://vercel.com/docs/limits (à revérifier au moment de s'inscrire) : 100 déploiements par jour (chaque push sur une branche en crée un), 1 build à la fois, 45 min de build maximum, usage personnel et non commercial.

Les agents poussent après chaque petite modification : on désactive donc le déploiement automatique de `main` (`vercel.json` : `git.deploymentEnabled` à `false` pour `main`), seule `production` déploie. Une preview en ligne, si besoin, se lance à la demande avec `vercel deploy`. Seuls les déploiements réels de la prod consomment le quota.

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

Une commande : lint, typecheck, puis tous les `scripts/check-*.ts` (y compris les 10 sans entrée dans `package.json`), avec résumé des échecs. Base jetable, jamais la base dev ni prod.

### Étape 3 — Données de test et CI GitHub Actions

- Petit jeu de données fixe (~100 personnages) versionné, pour que les checks ne dépendent pas d'AniList.
- `.github/workflows/ci.yml` : Node 24 (`.nvmrc`), Postgres de test (service du workflow), `npm ci`, chargement des données, `npm run check`.
- Protection de la branche `production` : CI verte obligatoire.
- Ensuite, proposer (avec permission) une règle dans `AGENTS.md` : lancer `npm run check` avant de pousser.

### Étape 4 — Deux projets Supabase

- `anime-dev` et `anime-prod` (le plan gratuit permet 2 projets actifs).
- Clés et URLs dans un coffre à part, jamais dans le repo. Variables d'environnement Vercel, une valeur par environnement.
- Contenu envoyé dans chaque base : personnages, séries, sorts modifiés, par des scripts rejouables (ajout ou mise à jour, jamais de suppression). La prod démarre **sans aucun compte** ; les données joueurs de la prod ne sont jamais écrasées.

### Étape 5 — Vercel

- Branche de production = `production`. Déploiement auto désactivé pour `main` (§4).
- `BETTER_AUTH_SECRET` et `BETTER_AUTH_URL` propres à la prod.
- Illustrations : dans le repo (9 Mo aujourd'hui) ou Supabase Storage. Le disque de Vercel est en lecture seule : les outils de dev qui écrivent sur disque (Spell Builder, mécaniques) restent en local.
- Migrations de la prod : `prisma migrate deploy` lancé **avant** chaque publication (à la main au début, puis par un workflow GitHub).

### Étape 6 — Première publication, à la main

Fusion `main` → `production`, tag `v0.1.0`, vérification du site en ligne (inscription, ouverture de paquet, combat, persistance après rechargement), puis ouverture à quelques amis.

### Étape 7 — Notes de mise à jour

- `CHANGELOG.md` à la racine, écrit à chaque release en langage joueur (un agent le prépare depuis les commits depuis le dernier tag, l'humain relit).
- GitHub Release créée depuis le tag, avec le même texte.
- Option : page « Nouveautés » dans le jeu qui affiche ce fichier.

### Étape 8 — Plus tard

Test de charge avant d'inviter plus de monde, alerte si le site tombe (UptimeRobot ou équivalent), Playwright sur 3–4 parcours clés, domaine personnalisé, sauvegardes régulières de la base prod.

## 6. Capacité attendue et limites du plan gratuit

Chiffres tirés de blogs tiers, **à vérifier** sur supabase.com/pricing et vercel.com/pricing.

- Supabase gratuit : 500 Mo de base (la base actuelle fait 25 Mo), 50 000 utilisateurs actifs par mois, 5 Go de trafic, 2 projets actifs.
- **Pause automatique du projet Supabase après 1 semaine sans activité** : à surveiller pour la prod.
- Connexions : le pooler est le vrai goulot. Estimation (non mesurée) : 20 à 50 joueurs actifs en même temps, quelques centaines à quelques milliers de comptes.
- Au-delà : Supabase Pro (25 $/mois) et/ou Vercel Pro.

## 7. Règles de prod à retenir

- `prisma migrate deploy` en prod, jamais `migrate dev` ni `db push`.
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
