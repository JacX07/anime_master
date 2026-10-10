# État du projet — passation

Mis à jour le 2026-10-10. La spec complète est dans `SPEC.md` (source de vérité) ; ce fichier n'en résume que l'avancement.

## Fait et committé
- **Étape 1 — base de personnages** : import AniList (`npm run import`, ~20 min ; `-- --recompute` pour recalculer sans refetch). 4 717 persos, rareté par percentile de favoris, stats, type via les tags de la série principale.
- **Tirage** : taux, finitions, carte garantie, pity SSR 15 / UR 100, numéros d'exemplaire ; `npm run simulate` confirme les taux.
- **Comptes** : Better Auth email + mot de passe, pseudo unique, 10 paquets de bienvenue.
- **Paquets** (`/packs`) : stock paresseux (1 / 10 min, max 10), ouverture serveur en une transaction, protection contre les ouvertures simultanées, retournement CSS, Holo/Gold, « NOUVEAU ».
- **Album** (`/album`) : grille triée rareté puis favoris, possédés (meilleure finition, ×N), manquants floutés, filtres rareté / type / possession / recherche dans l'URL, progression globale et par rareté, pagination 60.
- **Fiche perso** (`/character/[id]`) : grande carte, infos, description complète, exemplaires du joueur, séries.
- **Maquettes d'ouverture 3D** (`/maquettes`) : DA cyber futuriste v2 validée par l'utilisateur (« on changera des détails après »), 3 variantes de révélation (capsules, noyaux, portail), musique générative adaptative, sons de verre.

## Reste à faire, dans l'ordre
1. **Vérifier en vrai la recharge** (1 paquet / 10 min, max 10) puis cocher le critère dans `SPEC.md` §8.
2. **Intégrer l'ouverture 3D futuriste dans `/packs`**, branchée sur `openPackAction` (le tirage reste côté serveur). Choisir avec l'utilisateur la variante (capsules / noyaux / portail) et les détails à retoucher.
3. **Supprimer les maquettes** (`public/maquettes/`, `src/app/maquettes/`) une fois l'intégration faite.
4. Supprimer le compte de test `testrendu`.
5. Hors MVP (repoussé) : lueur de rareté au dos, progression et filtre par série, indicateurs de finition dans l'album, `/profile`, puis étapes 3 à 6 de la spec (économie, etc.).

## Décisions et raisons
- **Spec d'abord** : on valide dans `SPEC.md` avant de coder ; l'utilisateur parle français.
- **Types depuis les tags AniList** (plutôt que les genres) : plus discriminants ; coefficients d'équilibrage pour éviter que Cœur dépasse 40 %.
- **Images en `<img>` depuis le CDN AniList**, pas `next/image` : ne pas copier les images sur le serveur.
- **Stock de paquets calculé à la lecture** (`packsStored` + `lastPackAt`) : pas de tâche planifiée.
- **Décrément conditionnel du stock** dans la transaction : deux ouvertures simultanées ne consomment jamais plus que disponible.
- **La carte affiche la rareté actuelle** du perso ; `rarityAtPull` ne sert qu'à l'historique.
- **Tri de l'album en mémoire** : l'ordre des raretés n'est pas l'ordre alphabétique de l'enum ; quelques milliers de lignes légères, c'est négligeable.
- **Fiche perso publique** ; les exemplaires ne s'affichent que connecté. Perso non possédé : carte floutée, infos visibles (à confirmer).
- **3D** : three.js via CDN, bloom à seuil élevé (1,5) et étalonnage désaturé (l'utilisateur trouvait trop saturé / lumineux) ; pas de PointLight par objet (recompilation des shaders = saccades).
- **Audio** : synthèse WebAudio, plus de bruit filtré en boucle (rejeté : le « fhshooh ») ; musique en 3 couches qui suivent l'action, changements à la mesure.

## Fichiers clés
| Fichier | Rôle |
|---|---|
| `SPEC.md` | Spécification complète et critères de fin d'étape |
| `AGENTS.md` | Règles : lire la doc Next 16 dans `node_modules/next/dist/docs/`, commit + push après chaque fonctionnalité |
| `prisma/schema.prisma` | Modèle de données (SQLite local, compatible PostgreSQL) |
| `scripts/import.ts`, `scripts/simulate.ts` | Import AniList, simulation des taux |
| `src/lib/stats.ts`, `src/lib/clean.ts` | Rareté, stats, types ; nettoyage des descriptions |
| `src/lib/pull.ts` | Tirage pur (taux, garanties, pity) |
| `src/lib/pack-stock.ts`, `src/lib/packs.ts` | Stock de paquets ; ouverture transactionnelle |
| `src/lib/album.ts` | Requêtes album et fiche perso |
| `src/lib/auth.ts`, `src/lib/session.ts`, `src/proxy.ts` | Auth, session, redirection des pages réservées |
| `src/app/packs/`, `src/app/album/`, `src/app/character/[id]/` | Pages |
| `src/components/CharacterCard.tsx`, `src/app/globals.css` | Carte (rareté, finitions, manquant) |
| `public/maquettes/futur/` | Maquette 3D validée : `engine.js`, `decor.js`, `audio.js`, variantes |

## Pièges
- Utiliser Node 24 : `source ~/.nvm/nvm.sh && nvm use` avant npm/tsx (better-sqlite3 compilé pour Node 24).
- `cacheComponents` est activé : toute lecture de session, de `searchParams` ou de la base doit être sous un `<Suspense>`.
- Ne jamais committer `.env` ni `data/` (la base locale).
