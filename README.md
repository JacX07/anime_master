# Anime Masters

Jeu de cartes à collectionner de personnages d'anime. Spécifications complètes : [docs/specs/](docs/specs/README.md).

## Prérequis
- Node.js 24 (voir `.nvmrc` : `nvm use`)

## Installation
```bash
npm install            # installe les dépendances et génère le client Prisma
cp .env.example .env    # renseigner DATABASE_URL (Postgres) et BETTER_AUTH_SECRET
npm run db:migrate     # applique le schéma à une base Postgres de développement vide
```

## Commandes
| Commande | Rôle |
|---|---|
| `npm run import` | Importe les ~5 000 personnages les plus populaires d'AniList (~6 min) |
| `npm run import -- --pages 2` | Import rapide de test (100 personnages) |
| `npm run import -- --recompute` | Recalcule raretés, types et stats sans appeler AniList |
| `npm run simulate` | Simule 10 000 paquets et compare aux taux attendus (`--packs N`, `--seed N`) |
| `npm run db:studio` | Ouvre Prisma Studio sur http://localhost:5555 pour consulter la base |
| `npm run dev` | Lance le site en local sur http://localhost:3000 (inscription, paquets) |

## Lancer le serveur de dev

```bash
nvm use 24
npm run dev            # http://localhost:3000, Ctrl+C pour arrêter
```

L'application utilise désormais **Postgres**, en local comme sur Supabase. `DATABASE_URL` sert au jeu ; `DIRECT_URL`, facultatif, sert aux migrations (connexion directe ou pooler session, jamais pooler transaction).

Les bases `data/app.db` et `data/play.db` ne sont ni converties ni modifiées automatiquement. Leur transfert de contenu vers Postgres est une étape distincte.

## Dev ou prod

- **Dev** (`npm run dev`, port 3000) : compile chaque page à la demande et recompile à chaque modification (hot reload). Lent, gourmand en CPU, erreurs détaillées. Sert pendant qu'on code. L'arrêter quand on ne s'en sert pas (`Ctrl+C`, ou `pkill -f "next dev"; pkill -f next-server`).
- **Prod** (`npm run build` puis `npx next start`) : tout est compilé et optimisé une fois (build ≈ 3 min), ensuite c'est rapide et léger. Le code modifié n'apparaît qu'après un nouveau build. Sert à tester l'expérience joueur.

### Version de jeu séparée

Utiliser un worktree, un `.env` et une base Postgres dédiés. Appliquer les migrations avec `npm run db:deploy`, puis lancer `npm run build` et `npm start -- -p 3001`. Ne jamais utiliser les données joueurs pour les checks.

### Anciennes bases SQLite

Le schéma et les migrations historiques sont archivés dans `prisma/sqlite/`. `npm run play:sync` reste réservé à la synchronisation SQLite `app.db` vers `play.db` (sauvegarde, migrations historiques, contenu sans suppression). Il ne synchronise pas Postgres.

Pour appliquer seulement les migrations SQLite :

```bash
DATABASE_URL="file:./data/play.db" npx prisma migrate deploy --config prisma.sqlite.config.ts
```

Ne pas exécuter `prisma generate` avec cette configuration pour lancer le jeu : le client applicatif utilise Postgres.

Données : [AniList](https://anilist.co).
