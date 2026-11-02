# Anime Masters

Jeu de cartes à collectionner de personnages d'anime. Spécifications complètes : [docs/specs/](docs/specs/README.md).

## Prérequis
- Node.js 24 (voir `.nvmrc` : `nvm use`)

## Installation
```bash
npm install            # installe les dépendances et génère le client Prisma
cp .env.example .env    # puis renseigner BETTER_AUTH_SECRET
npm run db:migrate     # crée la base SQLite locale (data/app.db)
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

Si une page plante avec une erreur `better_sqlite3` (le shell est resté sur Node 20) :

```bash
~/.nvm/versions/node/v24.21.0/bin/node node_modules/next/dist/bin/next dev
```

## Dev ou prod

- **Dev** (`npm run dev`, port 3000) : compile chaque page à la demande et recompile à chaque modification (hot reload). Lent, gourmand en CPU, erreurs détaillées. Sert pendant qu'on code. L'arrêter quand on ne s'en sert pas (`Ctrl+C`, ou `pkill -f "next dev"; pkill -f next-server`).
- **Prod** (`npm run build` puis `npx next start`) : tout est compilé et optimisé une fois (build ≈ 3 min), ensuite c'est rapide et léger. Le code modifié n'apparaît qu'après un nouveau build. Sert à tester l'expérience joueur.

### Jouer sur une version de prod pendant que les agents codent

Depuis le repo, avec une base à part pour ne pas mélanger sa progression avec les tests des agents :

```bash
cp data/app.db data/play.db                 # une seule fois
npm run build
DATABASE_URL="file:./data/play.db" npx next start -p 3001
```

Le dev écrit dans `.next/dev` et le build dans `.next` : le dev (port 3000) et la prod (port 3001) peuvent tourner en même temps.

Limites dans le même dossier :
- Le build est partagé : un `npm run build` lancé par un agent remplace la version en cours de jeu. Ne pas builder pendant qu'un `next dev` tourne (voir `AGENTS.md`).
- Le build inclut les modifications non commitées présentes dans le dossier au moment du build.
- Pour mettre `play.db` à jour : `npm run play:sync` (voir ci-dessous).

### Synchroniser `play.db` avec la base de dev

```bash
npm run play:sync
npm run build
DATABASE_URL="file:./data/play.db" npx next start -p 3001
```

`play:sync` :
1. sauvegarde `play.db` dans `data/backups/` ;
2. applique les migrations manquantes (`prisma migrate deploy`) ;
3. ajoute ou met à jour le contenu venant de `app.db` : personnages, séries, liens personnage–série, sorts modifiés. **Aucune suppression.**

Jamais copiés : les données joueurs (comptes, cartes, progression…), le compteur de tirages `pullCount` et les bannières (le code les crée lui-même dans chaque base ; `app.db` contient des bannières de test).

Restaurer en cas de problème : arrêter le serveur de jeu, puis `cp data/backups/play-<date>.db data/play.db`.

Pour jouer sans interférence pendant que les agents codent et buildent, utiliser un git worktree séparé (son propre `.next`, son `.env` et sa base).

Données : [AniList](https://anilist.co).
