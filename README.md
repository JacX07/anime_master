# Anime Masters

Jeu de cartes à collectionner de personnages d'anime. Spécifications complètes : [SPEC.md](SPEC.md).

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

Données : [AniList](https://anilist.co).
