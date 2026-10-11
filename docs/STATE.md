# État du projet — passation

Mis à jour le 2026-10-10. La spec complète est dans `SPEC.md` (source de vérité) ; ce fichier n'en résume que l'avancement.

## Fait et committé
- **Étape 1 — base de personnages** : import AniList (`npm run import`, ~20 min ; `-- --recompute` pour recalculer sans refetch). 4 717 persos, rareté par percentile de favoris, stats, type via les tags de la série principale.
- **Tirage** : taux, finitions, carte garantie, pity SSR 15 / UR 100, numéros d'exemplaire ; `npm run simulate` confirme les taux.
- **Comptes** : Better Auth email + mot de passe, pseudo unique, 10 paquets de bienvenue.
- **Paquets** (`/packs`) : stock paresseux (1 / 10 min, max 10), ouverture serveur en une transaction, protection contre les ouvertures simultanées, retournement CSS, Holo/Gold, « NOUVEAU ».
- **Album** (`/album`) : grille triée rareté puis favoris, possédés (meilleure finition, ×N), manquants floutés, filtres rareté / type / possession / recherche dans l'URL, progression globale et par rareté, pagination 60.
- **Fiche perso** (`/character/[id]`) : grande carte, infos, description complète, exemplaires du joueur, séries.
- **Recharge vérifiée** : `npm run check:recharge` (joueur jetable sur la vraie base : palier 10 min, plafond 10, progression gardée après ouverture, refus à 0, ouvertures simultanées) + test navigateur (compteur 0 → 1 en direct, ouverture acceptée, compte à rebours conservé).
- **Maquettes d'ouverture 3D** (`/maquettes`) : DA cyber futuriste v2 validée par l'utilisateur (« on changera des détails après »), musique générative adaptative, sons de verre (l'éclatement du noyau imite maintenant du vrai verre brisé). Seule la variante **noyaux** est gardée (capsules, portail et anciens thèmes supprimés). Capsule du booster en vrai objet 3D (`futur/capsule.js`, verre + chrome, s'ouvre en deux), cartes sans lumière propre (comme avant) avec un reflet type « sol » sous chaque carte, et rangement vers l'album : clic sur une carte (ou Entrée) = elle se dissout en particules qui filent vers le lien « Album » ; sans clic, rangement automatique après 5 s. **Non vérifié à l'œil** : le navigateur de test (rendu logiciel) est trop lent, à regarder en vrai.

- **Étape 3, partie 1 — Ryō et vente rapide** : `User.balance` + journal `CurrencyLedger` (écrits dans la même transaction), cadenas, vente rapide d'un exemplaire (avertissement avant), vente groupée des doublons (aperçu du total + confirmation, garde le meilleur exemplaire), bonus quotidien 50 Ryō ; solde et bouton de bonus dans le menu. Logique dans `src/lib/economy.ts` (pur) et `src/lib/wallet.ts` (transactions) ; vérifié par `npm run check:economy`.

- **Puissance** : stat à part (`Character.power`, migration `character_power`), décorrélée d'ATK/DEF qui gardent leurs plages équilibrées (SPEC §6) ; loi de puissance des favoris (`POWER_BASE × (fav/favMin)^1,35`, ~100 à ~104 000), affichée en grand sur les cartes (site et scène 3D). Recalcul : `npm run import -- --recompute` (sans appel AniList).

- **Accueil façon menu de jeu** (`src/app/page.tsx`) : fond 3D `public/pack-opening/menu.html` (même laboratoire à la tombée de la nuit, exposition 0,38, capsule qui tourne) en iframe ; menu en liste avec curseur de sélection (clavier : flèches, première entrée sélectionnée, `MenuNav`), Marché / Duels / Classement verrouillés « bientôt » ; barre d'état du joueur en bas (puissance totale, Ryō, cartes, paquets, garanties). Direction de design : pas de cartes ni de numéros, texte en minuscules, une seule apparition d'ensemble. Visiteur non connecté : Commencer / Se connecter. **Puissance totale** (somme de la puissance de chaque carte, doublons compris, `src/lib/collection.ts`) aussi dans le panneau de la scène d'ouverture et l'album. Non vérifié à l'œil.

- **Écrans de chargement + préchauffage GPU** : les deux scènes 3D compilent leurs shaders et envoient leurs textures avant de signaler qu'elles sont prêtes (`warmUp` dans `engine.js`, `compileAsync` dans `menu.js`, hook `mode.warm`). Accueil : le chargement ne couvre que le fond (`SceneFrame`, message `scene-ready` avec accusé `scene-ack`), le menu reste utilisable ; Paquets : écran plein (`scene-loader` dans `ImmersiveOpener`). Coût de rendu réduit (ratio de pixels ≤ 1,5, MSAA ×2, ombres 1024, miroir du sol à 0,4, moins d'allocations par image) et **résolution adaptative** : si la moyenne dépasse 22 ms/image, le ratio de pixels baisse par paliers jusqu'à 0,75 (jamais de remontée). **Mesure** : ajouter `?perf` à l'URL d'une scène (`/pack-opening/futur.html?perf`, `/pack-opening/menu.html?perf`) affiche images/s, temps CPU/GPU, appels de dessin, et des touches pour couper un poste (B halo, M miroir, S ombres, K ciel, P résolution). Miroir du sol allégé (pas de MSAA, redessiné une image sur deux) ; autres gains : ciel dessiné en dernier (le bruit n'est calculé que là où il se voit), sol en matériau standard, plus de `backdrop-filter` sur le canevas.

- **Étape 3, partie 2 — Achat de paquets** : 100 Ryō, 5 par jour (remise à zéro à minuit), le paquet s'ajoute au stock et peut dépasser 10 (pas de recharge au-dessus de 10) ; `src/lib/shop.ts`, `afterPurchase` dans `pack-stock.ts`, bouton « Acheter un paquet » dans le panneau de la scène d'ouverture (non disponible dans l'ouverture classique de secours). Vérifié par `npm run check:economy`.

- **Album « vitrine »** (`src/app/album/`) : même nuit que l'accueil, filtres en pastilles (liens, sans JS), cartes qui se soulèvent au survol avec lueur de rareté au sol, manquants en emplacements sombres en pointillés, résumé dans une barre d'état fixe en bas (progression, raretés, puissance totale, bouton d'achat de paquet). `SceneBody night scroll` pose la classe `scene-night` sans le plein écran.

- **Identité visuelle appliquée** (validée par l'utilisateur sur la maquette `public/ui-kit/index.html`) : polices Sora + Michroma partout (`layout.tsx`, `globals.css`), icônes SVG maison à la place des emojis (`public/icons/icons.json` est la source unique ; `src/components/icons.tsx` côté site avec `IconSprite`, `Icon`, `TypeIcon`, `RarityGem`, `Money`, `Stat` ; `public/pack-opening/opening/icons.js` côté scène 3D, HUD et peinture des cartes sur canevas), raretés en cristaux à facettes, barre du haut en bandeau de HUD (logo cristal, navigation avec icônes, ressources Ryō / paquets / puissance, avatar hexagonal, variante labo clair sur Paquets). **Ultra Rare en rouge `#ff3b4a`** partout (à confirmer à l'usage : « test en rouge »). Fond du site aligné sur la nuit du jeu (`#0b1424`), accents violets remplacés par le bleu `#2b6cff`.

- **Maquettes d'ouverture** (`public/pack-opening/lab.html`, pas encore branchées au jeu) : 4 variantes à comparer — 1 portail + capsule qui se matérialise (ligne de scan, plan de coupe), 2 capsule déposée par le portail puis clic pour ouvrir, 3 portail seul, 4 tisserand (fils de lumière qui tissent les arêtes de la capsule). La capsule est un reliquaire de verre à facettes (`futur/pod.js`). Son refait dans `lab.js` (`A` : basses, cloches de verre inharmoniques, réverbération, verrou, montée) à la place du « bop ». À choisir avec l'utilisateur avant d'intégrer à `engine.js` et au fond de l'accueil.

## Reste à faire, dans l'ordre
1. **Étape 3, suite** : échanges, enchères, marché, liste de souhaits, notifications (voir SPEC).
2. **Valider l'ouverture 3D intégrée dans `/packs`** (faite, testée seulement jusqu'aux noyaux : l'utilisateur teste l'affichage lui-même). Retouches de détails à venir.
3. Plus tard : passer `three` en dépendance npm (la scène charge three et les polices depuis des CDN) et remplacer l'iframe par un composant React.
4. Hors MVP (repoussé) : lueur de rareté au dos, progression et filtre par série, indicateurs de finition dans l'album, `/profile`, puis étapes 3 à 6 de la spec (économie, etc.).

## Ouverture 3D dans `/packs`
Scène statique `public/pack-opening/futur.html?embed=1` dans une iframe de même origine (`src/app/packs/ImmersiveOpener.tsx`). Elle demande l'ouverture par `postMessage` (`open-request`), l'hôte appelle `openPackAction` et renvoie les cartes (`pack-result`) ; l'état du stock et du pity vient du serveur (`init`). Sans WebGL, message `unsupported` : repli sur l'ouverture classique (`PackOpener`). Hors iframe, la page tourne seule avec des cartes d'exemple.

Révélation deux fois plus rapide ; un clic (ou Espace / Entrée / Échap) pendant une animation la saute (`requestSkip` dans `engine.js`). Sur `/packs`, le menu du site flotte sur la scène plein écran, au style de la maquette (règles `body:has(.scene-page)` dans `globals.css`) ; `AlbumLink` affiche le compteur `+N` des cartes rangées et pulse à chaque arrivée.

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
| `scripts/import.ts`, `scripts/simulate.ts`, `scripts/check-recharge.ts` | Import AniList, simulation des taux, vérification de la recharge |
| `src/lib/stats.ts`, `src/lib/clean.ts` | Rareté, stats, types ; nettoyage des descriptions |
| `src/lib/pull.ts` | Tirage pur (taux, garanties, pity) |
| `src/lib/economy.ts`, `src/lib/wallet.ts`, `src/app/economy-actions.ts` | Prix, solde/journal, ventes, bonus quotidien |
| `src/lib/pack-stock.ts`, `src/lib/packs.ts` | Stock de paquets ; ouverture transactionnelle |
| `src/lib/album.ts` | Requêtes album et fiche perso |
| `src/lib/auth.ts`, `src/lib/session.ts`, `src/proxy.ts` | Auth, session, redirection des pages réservées |
| `src/app/packs/`, `src/app/album/`, `src/app/character/[id]/` | Pages |
| `src/components/CharacterCard.tsx`, `src/app/globals.css` | Carte (rareté, finitions, manquant) |
| `public/pack-opening/futur/` | Maquette 3D validée : `engine.js`, `decor.js`, `audio.js`, variantes |

## Pièges
- Utiliser Node 24 : `source ~/.nvm/nvm.sh && nvm use` avant npm/tsx (better-sqlite3 compilé pour Node 24).
- `cacheComponents` est activé : toute lecture de session, de `searchParams` ou de la base doit être sous un `<Suspense>`.
- Ne jamais committer `.env` ni `data/` (la base locale).
