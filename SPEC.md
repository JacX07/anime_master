# Anime Masters — Spécifications

Jeu de cartes à collectionner de personnages d'anime, inspiré de WikiMasters.

## MVP (validé)
Objectif : ouvrir des paquets et voir sa collection, en local.

- **Étape 1** complète, sauf : reprise de l'import page par page, table `ImportRun` (résumé dans la console), `attributes`, `descriptionFr`.
- **Étape 2** minimale : comptes, cristaux, bienvenue et calendrier de connexion quotidien sur 30 jours, tirage complet (taux, finitions, carte garantie, pity SSR/UR, numéros d'exemplaire), ouverture (retournement, Holo/Gold, « NOUVEAU »), album (filtres rareté / type / anime, recherche, doublons, progression par anime), fiche perso, script de simulation des taux.
- **Repoussé** : lueur de rareté au dos des cartes, indicateurs de finition, page `/profile`, étapes 3 à 6.

Ordre : 1. initialisation → 2. import (vérification dans Prisma Studio) → 3. tirage + simulation (vérification des taux) → 4. comptes, paquets, ouverture → 5. album et fiche perso.

---

## Étape 1 — Base de personnages (100 % local)

### Objectif
Avoir sur le PC une base SQLite remplie de personnages d'anime venant d'AniList, nettoyés, avec rareté et stats calculées, prête à servir au futur site.

**Hors périmètre :** site web, comptes, paquets.

### Décisions validées
- **5 000 personnages** (les plus favoris sur AniList).
- **Animes uniquement** : les personnages présents seulement dans des mangas sont ignorés.
- **Pas de contenu adulte** : les séries marquées `isAdult` sur AniList sont exclues.
- **Images** : on ne stocke que l'URL AniList, pas le fichier.
- **Descriptions** : en anglais pour l'instant, avec un champ prévu pour le français plus tard.
- **Rareté** : 5 niveaux N / R / SR / SSR / UR, sans « Légendaire » (voir §5).
- **Finitions** : Normal / Holo / Gold, purement cosmétiques (voir §5 bis).
- **Types** : 5 types tirés des tags et genres de l'anime, chacun avec un atout et un défaut (voir §5 ter). Version initiale, susceptible d'évoluer.
- **Stats** : puissance par rareté, répartie en ATK / DEF selon le rôle (voir §6).

---

### 1. Stack
| Élément | Choix |
|---|---|
| Langage | TypeScript (Node 24) |
| Base | SQLite (`data/app.db`) |
| Accès à la base | Prisma (schéma compatible SQLite et PostgreSQL, voir étape 6) |
| Import | Script Node lancé à la main (`npm run import`) |

### 2. Modèle de données

**Character**
| Champ | Description |
|---|---|
| `id` | id AniList |
| `name`, `nameNative` | nom romaji / japonais |
| `imageUrl` | URL de l'image sur le CDN AniList |
| `descriptionRaw` | description brute d'AniList |
| `description` | description nettoyée et raccourcie |
| `descriptionFr` | traduction ou réécriture (vide pour l'instant) |
| `attributes` | JSON extrait de la description (`Height`, `Occupation`…) |
| `gender`, `age`, `birthMonth`, `birthDay` | infos AniList |
| `favourites` | nombre de favoris AniList (popularité) |
| `rarity` | calculé (N / R / SR / SSR / UR) |
| `type` | calculé (COMBAT / MYSTERE / MAGIE / COEUR / AVENTURE) |
| `attack`, `defense` | calculés |
| `updatedAt` | date du dernier import |

**Media** : `id`, `titleRomaji`, `titleEnglish`, `titleNative`, `format`, `year`, `coverUrl`, `popularity`, `genres`, `tags` (nom + rang, hors tags spoilers), `studio`

**CharacterMedia** : `characterId`, `mediaId`, `role` (MAIN / SUPPORTING / BACKGROUND)

**ImportRun** : `id`, `startedAt`, `finishedAt`, `status`, `charactersCount`, `error`

### 3. Import
- Requête AniList `characters(sort: FAVOURITES_DESC)`, 50 par page, 100 pages, soit environ 5 minutes (limite actuelle de 30 requêtes par minute).
- Récupère pour chaque personnage ses séries principales ; on ne garde que les séries de type ANIME et non adultes (`isAdult = false`). Un personnage sans aucune série retenue est ignoré.
- ⚠️ L'API plafonne la pagination à 5 000 résultats. Après filtrage, on obtiendra donc un peu moins de 5 000 personnages. C'est accepté pour la V1 : les raretés étant en percentiles, les proportions restent justes. Pour compléter jusqu'à 5 000 ou plus, passer par les séries (V2).
- Peut être relancé sans créer de doublons (upsert).
- Respecte `X-RateLimit-Remaining` et attend en cas d'erreur 429.
- Reprend là où il s'est arrêté en cas d'erreur.
- Affiche sa progression et enregistre une ligne dans `ImportRun`.

### 4. Nettoyage des descriptions
1. Supprimer les spoilers `~!...!~`.
2. Extraire les lignes `__Clé:__ valeur` dans `attributes`.
3. Retirer le markdown et le HTML.
4. Raccourcir à 2 phrases ou environ 250 caractères.
5. Description vide → `null`.

### 5. Rareté
Propriété du **personnage**, calculée par percentile de favoris AniList et recalculée à chaque import.

| Code | Nom | Percentile (par favoris) | Sur 5 000 persos |
|---|---|---|---|
| UR | Ultra Rare | top 1 % | 50 |
| SSR | Super Super Rare | 4 % suivants | 200 |
| SR | Super Rare | 10 % suivants | 500 |
| R | Rare | 25 % suivants | 1 250 |
| N | Normal | le reste (60 %) | 3 000 |

- Percentiles plutôt que seuils fixes de favoris, pour garder des proportions stables dans le temps.
- En cas d'égalité de favoris à une frontière, départage par id AniList (le plus petit d'abord), pour un résultat déterministe.
- Cette répartition est distincte des probabilités de tirage dans les paquets (étape 2).

### 5 bis. Finitions
Propriété de **l'exemplaire** (la carte possédée par un joueur), tirée au hasard à l'ouverture, indépendamment de la rareté.

| Finition | Probabilité indicative | Rendu |
|---|---|---|
| Normal | ~90 % | cadre sobre, pas d'effet |
| Holo | ~9 % | reflet arc-en-ciel animé |
| Gold | ~1 % | cadre doré, halo, éclat animé |

- **Purement cosmétique** : aucun effet sur l'ATK, la DEF ou les duels.
- Rendu uniquement en CSS, sans image supplémentaire.
- Dans l'album, chaque personnage a 3 emplacements (Normal, Holo, Gold).
- Concerne l'étape 2 : la finition n'est pas stockée sur `Character`, mais sur la future table des cartes des joueurs.

### 5 ter. Types
Propriété du **personnage**, calculée à l'import à partir des **tags** et des genres de sa **série principale**.

| Type | Exemples de tags (genres) | Style | ✅ Atout | ❌ Défaut |
|---|---|---|---|---|
| 🔥 Combat | Super Power, Swordplay, Martial Arts, Military, sports… (Action, Sports, Mecha) | Tout ou rien | **Coup critique** : dégâts ×2 si le défenseur rate toutes les questions | DEF −25 % |
| 🔮 Mystère | Detective, Crime, Conspiracy, Death Game, Time Manipulation… (Mystery, Psychological, Thriller, Horror) | Pression | **Fausse piste** : le défenseur a 5 choix au lieu de 4 et moins de temps | ATK −25 % |
| ✨ Magie | Magic, Demons, Curses, Youkai, Gods, Vampire… (Fantasy, Supernatural, Mahou Shoujo) | Vampire | **Drain** : récupère 30 % des dégâts infligés en PV (sans dépasser les PV de départ) | ATK −15 % |
| 💗 Cœur | Love Triangle, Idol, Band, Iyashikei, Family Life… (Romance, Drama, Slice of Life, Music, Comedy, Ecchi) | Tank et soutien | **Lien** : DEF comptée ×1,3 dans les PV, +10 % ATK aux autres cartes de l'équipe | ATK −30 % |
| 🧭 Aventure | Travel, Isekai, Pirates, Space, Post-Apocalyptic, Dungeon… (Adventure, Sci-Fi) | Régulier | **Persévérance** : inflige au moins 25 % de son ATK même sans erreur adverse | **Plafond** : jamais plus de 75 % de son ATK |

**Série principale** : la série de type ANIME la plus populaire où le personnage a le rôle MAIN ; à défaut, la plus populaire tous rôles confondus.

**Règle d'attribution :**
1. Une table associe environ 150 tags AniList à un type (liste complète dans `src/lib/stats.ts`). Chaque tag de la série principale ajoute `rang / 100 × poids` au score de son type. Le poids vaut 1, ou moins pour les tags très répandus et peu caractéristiques (School 0,3 ; Heterosexual, Gore, Urban Fantasy 0,5…). Les tags descriptifs (Male Protagonist, Shounen…) et les tags spoilers sont ignorés.
2. Chaque genre ajoute 0,2 au score de son type (départage et repli).
3. Chaque score est multiplié par un coefficient d'équilibrage : Combat ×1, Mystère ×1,5, Magie ×1, Cœur ×0,6, Aventure ×1,5. Sans lui, Cœur dépasse 40 %.
4. Le score le plus élevé l'emporte ; égalité parfaite : Aventure > Mystère > Magie > Cœur > Combat. Aucun signal → Cœur.

Répartition obtenue (import d'octobre 2026, 4 717 persos) : Cœur 27 %, Mystère 20 %, Combat 19 %, Magie 18 %, Aventure 16,5 %. Exemples : Gojo ✨, Levi 🔥, Naruto 🔥, Luffy 🧭, L 🔮, Kaguya 💗.

> Historique : la première règle (genres seuls) donnait Cœur 48 % et Combat 3 %. Comedy et Drama sont présents sur près de la moitié des séries, et les genres sont trop grossiers.

**Notes :**
- Les chiffres (−25 %, ×1,3…) sont indicatifs et seront équilibrés à l'étape « duels ». L'étape 1 ne stocke que le type.
- Pas de cycle « fort contre » au départ ; à réévaluer après des tests. *(Cycle d'affinités adopté pour le combat 4 contre 4, étape 4 quater §2.)*
- La table des tags et les coefficients se réajustent sans retélécharger : `npm run import -- --recompute`.
- Certains cas restent discutables (L'Attaque des Titans → Aventure, Spy×Family → Mystère). Une surcharge manuelle par personnage pourra être ajoutée plus tard si besoin.
- Idées pour plus tard : bonus « même série » (+10 % ATK) et bonus « 3 cartes du même type ».

### 6. Stats (ATK / DEF)
Valeurs de **base** stockées sur `Character`. Les atouts et défauts des types s'appliquent pendant le duel, pas ici.

**1. Puissance totale (ATK + DEF) par rareté**
| Rareté | Puissance |
|---|---|
| N | 1 000 – 2 000 |
| R | 2 000 – 3 200 |
| SR | 3 200 – 4 600 |
| SSR | 4 600 – 6 200 |
| UR | 6 200 – 8 000 |

Position dans la plage, sur une échelle logarithmique des favoris au sein de la rareté :
```
t         = (ln(fav) − ln(favMin)) / (ln(favMax) − ln(favMin))   // 0..1, favMin/favMax de la rareté
puissance = min + t × (max − min)
```
Ici « puissance » désigne seulement le total ATK + DEF qui sert à répartir les stats ; la stat affichée « Puissance » est différente (voir 1 bis).

**1 bis. Puissance (stat affichée, `Character.power`)**
Stat à part, **indépendante d'ATK et DEF** (qui restent équilibrées et servent aux duels). Elle exprime la popularité, avec une forte progression :
```
power = 100 × (favoris / favorisMin)^1,35      // favorisMin = le personnage le moins aimé de la base
```
Chaque doublement de favoris la multiplie par ~2,5. Avec les données actuelles (229 à 39 213 favoris) : N ≈ 100–520, R ≈ 520–2 300, SR ≈ 2 300–9 100, SSR ≈ 9 100–30 000, UR ≈ 30 000–104 000. La rareté suit les favoris, donc ces plages ne se chevauchent pas. Elle est affichée en grand sur les cartes ; ATK et DEF le sont discrètement.

**2. Répartition ATK / DEF**
| Rôle dans la série principale | Part ATK | Part DEF |
|---|---|---|
| MAIN | 60 % | 40 % |
| SUPPORTING / BACKGROUND | 45 % | 55 % |

- Variation fixe par personnage : la part d'ATK est décalée de ±5 points (donc environ ±10 % sur chaque stat), selon une valeur pseudo-aléatoire dérivée de l'id AniList.
- La variation porte sur la répartition, pas sur la puissance totale : les plages des raretés restent disjointes.
- `ATK = round(puissance × partATK, 10)`, `DEF = puissance − ATK`.

**Exemple :** Gojo, UR, MAIN, le plus favori de sa rareté → total ATK + DEF 8 000 → ATK ≈ 4 800 / DEF ≈ 3 200 (± variation) ; sa stat Puissance, elle, est d'environ 100 000.

**Contraintes :** calcul déterministe (même entrée = même résultat d'un import à l'autre), recalculé à chaque import.

### 7. Mises à jour
Le script peut être relancé, par exemple une fois par semaine : favoris mis à jour, rareté et stats recalculées.

### 8. Arborescence
```
anime_master/
├── SPEC.md
├── prisma/schema.prisma
├── data/app.db              (non versionné)
├── scripts/import.ts
├── src/lib/anilist.ts
├── src/lib/clean.ts
├── src/lib/stats.ts
└── package.json
```

### 9. Critères pour dire que l'étape 1 est finie
- [ ] `npm run import` remplit la base avec jusqu'à 5 000 personnages (un peu moins après filtrage) en moins de 10 minutes.
- [ ] Le relancer ne crée pas de doublons.
- [ ] Aucune description ne contient de spoiler ni de markdown.
- [ ] La répartition des raretés correspond aux percentiles de la spec (≈ 50 / 200 / 500 / 1 250 / 3 000 sur 5 000).
- [ ] Chaque personnage a un type, et la répartition des types est affichée à la fin de l'import.
- [ ] Les stats respectent les plages par rareté, et deux imports successifs donnent les mêmes valeurs.
- [ ] Les données sont consultables avec Prisma Studio.

---


## Étape 2 — Site : comptes, paquets, album (100 % local)

### Objectif
Un site Next.js qui tourne en local, où l'on crée un compte, reçoit des paquets, les ouvre et consulte sa collection.

**Hors périmètre :** monnaie, revente, échanges, enchères, duels.

### Décisions validées
- **Authentification** : Better Auth, email + mot de passe.
- **10 paquets de bienvenue** à l'inscription.
- **Taux par carte** : N 65 % / R 24 % / SR 8 % / SSR 2,5 % / UR 0,5 %.
- **Carte garantie** : au moins une carte R ou mieux par paquet.
- **Pity SSR** à 15 paquets, **pity UR** à 100 paquets.
- **Numéro d'exemplaire** par personnage.
- **Manquants** affichés grisés et floutés, avec le nom visible.

---

### 1. Stack
| Élément | Choix |
|---|---|
| Framework | Next.js (App Router) + TypeScript |
| Style | Tailwind CSS |
| Base | La même base SQLite que l'étape 1, via Prisma |
| Authentification | Better Auth (email + mot de passe) |

Pas d'envoi d'email en local : pas de vérification d'email ni de « mot de passe oublié » pour l'instant (à ajouter à la mise en ligne).

### 2. Pages
| Page | Contenu |
|---|---|
| `/` | Accueil : présentation, appel à s'inscrire |
| `/signup`, `/login` | Inscription, connexion |
| `/packs` | Paquets disponibles, compte à rebours avant le prochain, compteurs de pity, bouton d'ouverture |
| `/album` | Collection : possédés et manquants, filtres, progression |
| `/character/[id]` | Fiche d'un perso : grande carte, description, séries, stats, type, exemplaires possédés |
| `/profile` | Pseudo, statistiques (nombre de cartes, % de complétion, meilleures cartes) |

### 3. Paquets
> **Remplacé** par les cristaux : voir « Étape 4 bis — Cristaux et bannières » (spec du 2026-10-12, pas encore codée). Cette section décrit le système en place.

- **5 cartes par paquet.**
- **1 paquet toutes les 10 minutes**, **stock maximum de 10**.
- **10 paquets de bienvenue** à l'inscription.
- **Calcul paresseux**, sans tâche planifiée : on stocke `packsStored` et `lastPackAt`, et à chaque lecture :
  ```
  écoulés     = floor((maintenant − lastPackAt) / 10 min)
  disponibles = min(10, packsStored + écoulés)
  ```
  Lors d'une ouverture, `packsStored = disponibles − 1`, et `lastPackAt` avance de `écoulés × 10 min` (ou passe à maintenant si le stock était plein), pour ne pas perdre la progression vers le paquet suivant.

### 4. Tirage
> **Évolue** : le pity passe en cartes (75 / 500), la carte garantie reste par bloc de 5 et le ×10 améliore la 10ᵉ carte : voir « Étape 4 bis ».

Pour chaque carte : on tire d'abord la **rareté**, puis **un personnage au hasard, uniformément, parmi ceux de cette rareté**, puis la **finition**.

**Taux de rareté (par carte)**
| Rareté | Taux | Fréquence moyenne |
|---|---|---|
| N | 65 % | |
| R | 24 % | |
| SR | 8 % | ~1 tous les 2–3 paquets |
| SSR | 2,5 % | ~1 tous les 8 paquets (SSR ou mieux : ~1 tous les 7) |
| UR | 0,5 % | ~1 tous les 40 paquets |

**Taux de finition (par carte, indépendants de la rareté)** : Normal 90 % / Holo 9 % / Gold 1 %.

**Garanties**, appliquées dans cet ordre sur le paquet tiré :
1. **Pity UR** : si `packsSinceUR ≥ 99` (c'est-à-dire que ce paquet est le 100ᵉ sans UR) et que le paquet ne contient pas d'UR, la 5ᵉ carte est remplacée par un UR.
2. **Pity SSR** : si `packsSinceSSR ≥ 14` (15ᵉ paquet sans SSR ou mieux) et que le paquet ne contient ni SSR ni UR, la 5ᵉ carte est retirée parmi SSR et UR (selon leurs taux relatifs : SSR 5/6, UR 1/6).
3. **Carte garantie** : si le paquet ne contient aucune carte R ou mieux, la 5ᵉ carte est retirée parmi R, SR, SSR et UR (selon leurs taux relatifs).

**Compteurs** (sur `User`) :
- `packsSinceSSR` : remis à 0 si le paquet contient au moins un SSR ou un UR, sinon +1.
- `packsSinceUR` : remis à 0 si le paquet contient au moins un UR, sinon +1.
- Affichés sur `/packs` : « SSR garanti dans X paquets », « UR garanti dans Y paquets ».

**Taux réels, garanties comprises** (calcul exact, confirmé par `npm run simulate`) : N 62,5 % / R 25,5 % / SR 8,5 % / SSR 2,9 % / UR 0,61 %. La carte garantie et les pity relèvent légèrement les raretés hautes.

**Premier UR** (simulation de 2 000 nouveaux joueurs) : 32 paquets en moyenne, médiane 24, 90 % des joueurs avant 75, jamais plus de 100. Pour un joueur qui ouvre tout dès la recharge (10 de bienvenue + 6 par heure), c'est ~4 h en moyenne et ~11 h dans le pire des cas courants. Il faut compter plus pour un joueur régulier ou occasionnel.

### 5. Modèle de données (ajouts)
**User** : `id`, `username` (unique), `email` (unique), données d'authentification (gérées par Better Auth), `packsStored`, `lastPackAt`, `packsSinceSSR`, `packsSinceUR`, `createdAt`.

**Card** (un exemplaire possédé)
| Champ | Rôle |
|---|---|
| `id` | identifiant de l'exemplaire |
| `ownerId` | joueur propriétaire |
| `characterId` | personnage |
| `finish` | NORMAL / HOLO / GOLD |
| `serial` | numéro d'exemplaire : n-ième exemplaire de ce personnage tiré sur le site (toutes finitions confondues) |
| `rarityAtPull` | rareté au moment du tirage (historique uniquement) |
| `packOpeningId` | paquet d'origine |
| `obtainedAt` | date d'obtention |

- Contrainte d'unicité sur (`characterId`, `serial`).
- **La carte affiche toujours la rareté actuelle du personnage** (si un import change la rareté de Gojo, toutes les cartes Gojo changent). `rarityAtPull` ne sert qu'à l'historique.

**Character** : ajout de `pullCount` (nombre d'exemplaires tirés), qui sert à attribuer `serial`.

**PackOpening** : `id`, `userId`, `openedAt`, `pityTriggered` (NONE / SSR / UR). Historique des ouvertures, pour vérifier les taux réels et détecter les abus.

### 6. Ouverture d'un paquet
**Côté serveur** (aucun tirage dans le navigateur) :
1. Calculer les paquets disponibles ; refuser s'il n'y en a aucun.
2. Tirer les 5 cartes avec `crypto` (générateur aléatoire sécurisé), en appliquant les garanties du §4.
3. Dans **une seule transaction** : décrémenter le stock, incrémenter `pullCount` et attribuer `serial`, créer les 5 `Card` et le `PackOpening`, mettre à jour les compteurs de pity. En cas d'échec, rien n'est enregistré.
4. Deux ouvertures simultanées ne doivent jamais consommer plus de paquets que disponible.

**Côté interface** :
- Les 5 cartes apparaissent face cachée ; clic pour retourner une à une, ou bouton « tout révéler ».
- Le dos de chaque carte brille de la couleur de sa rareté avant d'être retourné.
- Effets Holo et Gold animés (CSS).
- Badge **« NOUVEAU »** si le joueur ne possédait pas encore ce personnage.
- Images en `<img>` simple depuis l'URL AniList (pas de `next/image`, pour ne pas copier les images sur le serveur).

### 7. Album
- **Grille de tous les personnages**, triée par rareté puis par favoris.
- **Possédés** : affichés avec la meilleure finition possédée, et un compteur ×N pour les doublons.
- **Manquants** : carte grisée et floutée avec un « ? », nom visible.
- **Emplacements par finition** : pour chaque personnage, indicateurs Normal / Holo / Gold possédés ou non.
- **Filtres** : rareté, type, anime, finition, possédés ou manquants, recherche par nom.
- **Vue par anime** : affiche les personnages possédés et manquants, ainsi que la progression (« Jujutsu Kaisen : 12/18 »), pour repérer les collections complétées.
- **Petits anime** : regrouper les anime ayant moins de 5 personnages dans une entrée « Autres anime ». Cette entrée filtre leur union ; la complétion reste calculée séparément pour chaque anime.
- Pagination ou défilement infini (plusieurs milliers de cartes).

### 7 bis. Réalisation de l'album par anime (codé le 2026-10-17, regroupement revu le jour même)
- **Un anime = une franchise entière** : saisons, films, OVA, spin-offs et histoires parallèles ensemble (NARUTO, Shippuden, tous les films dont *Road to Ninja* et Boruto ; Magi et *Adventure of Sinbad*…). Le regroupement vient des **relations d'AniList** (suite, préquelle, histoire parallèle, spin-off, alternative, parent, résumé), suivies de proche en proche, y compris à travers des séries absentes de la base. Résultat rangé dans `Media.franchiseId` (la série la plus populaire du groupe) par `npm run import:franchises` (relations en cache dans `data/anilist-relations.json`).
- Les **crossovers** qui fusionneraient deux franchises distinctes sont ignorés à la main (liste `IGNORED_LINKS` du script) : Lupin III ≠ Détective Conan, Captain Harlock ≠ Galaxy Express 999, Tsubasa ≠ xxxHOLiC, Megalo Box ≠ Tomorrow's Joe.
- Sur les 3 411 séries, on obtient **1 340 franchises**. Les franchises d'au moins **5 personnages** (≈ 285) ont leur entrée dans l'album ; les plus petites sont rassemblées en **blocs de 5 anime tirés au hasard** (« Autres anime n°1, n°2… », ordre fixé par un hachage de l'identifiant : stable d'une visite à l'autre, mais un bloc peut changer quand de nouveaux personnages sont importés).
- Filtre « Anime » (liste déroulante avec la progression de chaque anime, ✓ quand il est complet ; les blocs sont dans un groupe à part), adresse `/album?anime=<id>` ou `anime=autres-<n>`. En-tête de progression avec « Collection complète » ; pour un bloc, la progression de chacun de ses anime.
- La complétion se calcule par franchise, y compris pour les petites : le bloc n'est qu'un regroupement d'affichage. Les succès « anime complet » ne comptent que les franchises listées (au moins 5 personnages).

### 8. Critères pour dire que l'étape 2 est finie
- [x] Inscription, connexion et déconnexion fonctionnent ; un nouveau compte reçoit le cadeau de bienvenue de 50 cartes (voir Étape 4 bis §8).
- [x] Un paquet se recharge toutes les 10 minutes, avec un maximum de 10 (`npm run check:recharge`).
- [x] Chaque paquet contient 5 cartes, dont au moins une R ou mieux.
- [x] Le pity SSR se déclenche au 15ᵉ paquet sans SSR ou mieux, et le pity UR au 100ᵉ sans UR.
- [x] Sur 10 000 paquets simulés, les taux observés correspondent à la spec (en tenant compte des garanties).
- [x] Deux ouvertures simultanées ne consomment pas plus de paquets que disponible.
- [x] Les numéros d'exemplaire sont uniques et consécutifs par personnage.
- [x] L'album affiche possédés et manquants, avec filtres (rareté, type, possession, recherche) et progression globale et par rareté.
- [x] L'album filtre par anime, affiche les personnages manquants et la progression de chaque anime, et regroupe les anime sous le seuil dans « Autres anime ». *(Codé le 2026-10-17, voir « Réalisation » ci-dessous.)*

---

## Étape 3 — Économie

### Objectif
Donner de la valeur aux cartes : revente des doublons, échanges entre joueurs, enchères.

### Décisions validées
- Monnaie : **Ryō** (両).
- **Aucun achat avec de l'argent réel** : la monnaie se gagne uniquement en jouant.
- Prix de vente rapide : N 1 / R 3 / SR 10 / SSR 40 / UR 200 ; Holo ×3, Gold ×10.
- Bonus quotidien : 50 Ryō. Paquet supplémentaire : 100 Ryō, 5 par jour maximum.
- Taxe de 5 % sur les ventes aux enchères (détruite).
- Anti-abus : compte de plus de 24 h et au moins 20 paquets ouverts pour échanger ou utiliser les enchères.

---

### 1. Monnaie
- Chaque mouvement de Ryō est enregistré dans `CurrencyLedger`. Le solde (`User.balance`) doit toujours être égal à la somme du journal ; les deux sont mis à jour dans la même transaction.
- Un solde ne peut jamais devenir négatif.

### 2. Sources et dépenses
> **Évolue** : l'achat de paquets devient l'achat de cristaux (20 Ryō, 25 par jour) : voir « Étape 4 bis ».

| ➕ Sources | ➖ Dépenses |
|---|---|
| Vente rapide d'une carte au système | Achat de paquet : 100 Ryō, 5 par jour maximum (remise à zéro à minuit, heure du serveur) |
| Bonus quotidien : 50 Ryō, réclamé une fois par jour | Taxe de 5 % sur chaque vente aux enchères |
| Vente aux enchères | Achat aux enchères |
| *(Étape 4 : duels, succès)* | |

Un paquet acheté s'ajoute au stock et peut dépasser la limite de 10 (la limite ne concerne que la recharge automatique).

**Vente rapide**
| Rareté | N | R | SR | SSR | UR |
|---|---|---|---|---|---|
| Ryō | 1 | 3 | 10 | 40 | 200 |

- Multiplicateur de finition : Normal ×1, Holo ×3, Gold ×10.
- Prix basé sur la rareté **actuelle** du personnage.
- Repère : un joueur régulier (~40 paquets par jour) qui vend tous ses doublons gagne environ 1 000 Ryō par jour.

**Protections**
- **Vente rapide d'une carte précise** : n'importe quel exemplaire non verrouillé (pas seulement les doublons), après un message d'avertissement (retrait définitif, irréversible ; avertissement renforcé s'il s'agit du seul exemplaire du personnage).
- **Cadenas** (`locked`) : une carte verrouillée ne peut être ni vendue, ni échangée, ni mise aux enchères.
- **Vente groupée des doublons** : filtre par rareté ; conserve toujours, pour chaque personnage, l'exemplaire de meilleure finition (à finition égale, le plus petit numéro d'exemplaire). N'inclut jamais les cartes verrouillées, aux enchères ou en échange.
- Confirmation avec le total en Ryō avant toute vente.

### 3. Échanges directs
- Offre d'un joueur à un autre : cartes et/ou Ryō de chaque côté.
- Statuts : PENDING → ACCEPTED / REFUSED / CANCELLED / EXPIRED / INVALID. Expiration au bout de 48 h.
- Les cartes ne sont pas bloquées pendant l'attente. À l'acceptation, tout est revérifié (propriétaire, carte non verrouillée et pas aux enchères, soldes suffisants) ; sinon l'offre passe en INVALID.
- Exécution dans une seule transaction (tout ou rien), avec une ligne de journal par mouvement de Ryō.
- Maximum 10 offres envoyées en attente par joueur.
- **Tag « À échanger »** (`forTrade`) : la fiche d'un personnage liste les joueurs qui le proposent à l'échange.

### 4. Enchères
- Paramètres : carte, prix de départ (≥ 1 Ryō), durée (1 h, 6 h, 24 h ou 72 h), prix d'achat immédiat facultatif (> prix de départ).
- La carte est bloquée (`inAuction`) pendant toute l'enchère.
- Offre minimale : max(prix de départ, offre actuelle × 1,05 arrondi au supérieur, offre actuelle + 1).
- **Réservation** : le montant de l'offre est retiré du solde (BID_HOLD) ; l'enchérisseur dépassé est remboursé immédiatement (BID_REFUND).
- **Anti-sniping** : une offre placée dans les 2 dernières minutes repousse la fin à « maintenant + 2 minutes ».
- **Achat immédiat** : termine l'enchère sur-le-champ et rembourse l'éventuel meilleur enchérisseur.
- Interdits : enchérir sur sa propre enchère ; annuler une enchère qui a déjà une offre.
- **Clôture** : la carte passe au gagnant, le vendeur reçoit le montant moins 5 % (arrondi à l'inférieur). Sans offre, la carte revient au vendeur.
- **Déclenchement de la clôture** : à chaque consultation d'une enchère ou du marché, et par une tâche qui tourne toutes les minutes. Clôture idempotente (une enchère ne se clôture qu'une fois, même si deux déclenchements arrivent ensemble).
- Maximum 10 enchères actives par vendeur.

### 5. Marché et liste de souhaits
- **Marché** : enchères en cours, filtres (rareté, type, série, finition, prix) et tri (fin la plus proche, prix, plus récentes).
- **Historique des prix** : sur la fiche d'un personnage, les dernières ventes aux enchères et le prix moyen, par finition.
- **Liste de souhaits** : personnages (avec ou sans finition précise). Notification quand l'un d'eux est mis aux enchères ou tagué « À échanger ».

### 6. Notifications
Dans le site uniquement (cloche, pas d'email) : offre dépassée, enchère gagnée, carte vendue, enchère terminée sans offre, échange reçu / accepté / refusé / invalide, carte souhaitée disponible.

### 7. Anti-abus
- Échanges et enchères réservés aux comptes de plus de 24 h ayant ouvert au moins 20 paquets.
- Tout est historisé (journal des Ryō, échanges, offres) pour permettre des enquêtes.
- À envisager si des abus apparaissent : plafond de Ryō par échange.

### 8. Modèle de données (ajouts)
- **User** : `balance`, `lastDailyBonusAt`, `packsBoughtToday`, `packsBoughtDate`
- **CurrencyLedger** : `id`, `userId`, `amount` (±), `reason` (QUICK_SELL, DAILY, PACK_BUY, BID_HOLD, BID_REFUND, AUCTION_SALE, AUCTION_FEE, TRADE_IN, TRADE_OUT), `refId`, `createdAt`
- **Card** : ajout de `locked`, `forTrade`, `inAuction`
- **Trade** : `id`, `fromId`, `toId`, `fromCurrency`, `toCurrency`, `status`, `createdAt`, `expiresAt`, `resolvedAt`
- **TradeItem** : `tradeId`, `cardId`, `side` (FROM / TO)
- **Auction** : `id`, `sellerId`, `cardId`, `startPrice`, `buyNowPrice`, `currentBid`, `currentBidderId`, `endsAt`, `status` (ACTIVE / SOLD / UNSOLD / CANCELLED), `createdAt`
- **Bid** : `id`, `auctionId`, `bidderId`, `amount`, `createdAt`
- **WishlistItem** : `userId`, `characterId`, `finish` (facultatif)
- **Notification** : `id`, `userId`, `type`, `payload` (JSON), `readAt`, `createdAt`

### 9. Pages
| Page | Contenu |
|---|---|
| `/market` | Enchères en cours, filtres |
| `/market/[id]` | Détail d'une enchère, offres, compte à rebours |
| `/trades` | Échanges reçus, envoyés, historique |
| `/trades/new?to=pseudo` | Composer une offre |
| `/wishlist` | Liste de souhaits |
| Album, fiche perso | Actions : vendre, verrouiller, « À échanger », mettre aux enchères ; solde et bonus quotidien dans l'en-tête |

### 10. Critères pour dire que l'étape 3 est finie
- [x] Le solde de chaque joueur est toujours égal à la somme de son journal, et n'est jamais négatif (`npm run check:economy`).
- [x] La vente rapide respecte les prix ; la vente groupée ne touche ni aux cartes verrouillées, ni aux cartes en échange ou aux enchères, ni au meilleur exemplaire de chaque personnage (cartes en échange / aux enchères : à vérifier quand ces fonctions existeront).
- [x] Un échange accepté transfère tout ou rien ; une offre devient invalide si un élément n'est plus disponible (`npm run check:trades`).
- [x] Impossible de gagner une enchère sans les Ryō ; l'enchérisseur dépassé est remboursé immédiatement.
- [x] L'anti-sniping prolonge l'enchère ; la clôture n'a lieu qu'une seule fois.
- [x] Les limites (5 paquets achetés par jour, 10 offres, 10 enchères, ancienneté du compte) sont respectées. *(paquets : fait, `npm run check:economy` ; 10 offres et ancienneté du compte : faits, `npm run check:trades` ; 10 enchères : fait, `npm run check:auctions`)*

---

## Étape 4 — Duels, classements, succès

> **Duels quiz codés, à remplacer** par le combat 4 contre 4 de l'étape 4 quater. Les classements et les succès restent valables.

### Objectif
Donner une utilité de jeu aux cartes : duels quiz utilisant les stats et les types, classements, succès.

### Décisions validées
- Duel **asynchrone** : équipe et ordre d'attaque choisis à l'avance, quiz joués chacun de son côté, combat résolu par le serveur puis rejoué.
- **Carte mystère** : pendant le quiz, seuls le type, la rareté et l'ATK de la carte attaquante sont visibles.
- 4 questions à 4 choix, 15 secondes par question (Mystère : 5 choix, 10 secondes).
- Match nul possible.
- Récompenses : victoire 30 / nul 15 / défaite 10 Ryō. 5 duels lancés par jour maximum ; 2 duels récompensés par jour maximum contre un même adversaire.
- Classements : Elo (duels) et Collection.

---

### 1. Déroulement d'un duel
1. **Défi** : A défie B par son pseudo et choisit 3 cartes et leur ordre d'attaque. Une même carte ne peut pas apparaître deux fois ; deux cartes du même personnage sont autorisées.
2. **Acceptation** (délai 24 h) : B accepte et choisit ses 3 cartes et leur ordre, ou refuse.
3. **Défense** (délai 48 h après l'acceptation) : chaque joueur répond aux quiz sur les 3 cartes adverses, dans l'ordre d'attaque adverse. Une session commencée doit être terminée (une question non répondue à temps compte comme une erreur).
4. **Résolution** : quand les deux défenses sont terminées, le serveur calcule le combat en alternant A1, B1, A2, B2, A3, B3 (le challenger attaque en premier).
5. **Replay** : affichage tour par tour du combat calculé.

**Forfait** : un joueur qui n'a pas terminé sa défense dans les 48 h perd. Si aucun des deux n'a joué, le duel expire sans résultat ni récompense.

**Instantané** : au choix de l'équipe, `characterId`, type, ATK et DEF de chaque carte sont copiés dans le duel. Les cartes restent libres (vente, échange) et une mise à jour de rareté n'affecte pas un duel en cours.

### 2. Quiz
- **Carte mystère** : le défenseur voit le type, la rareté et l'ATK ; le personnage est révélé à la fin du quiz de cette carte.
- 4 questions, 4 choix (5 pour Mystère), 15 s par question (10 s pour Mystère).
- Questions générées à partir des données de l'étape 1, sans LLM, au moment où le défenseur commence sa session :

| # | Question | Bonne réponse | Fausses réponses |
|---|---|---|---|
| 1 | Image du personnage : « Qui est-ce ? » | son nom | noms de personnages de la même série en priorité, sinon de séries aux genres proches |
| 2 | « De quel anime vient ce personnage ? » | sa série principale | séries de genres et d'année proches |
| 3 | Tirée au hasard parmi celles possibles : rôle (principal / secondaire), anniversaire, « lequel de ces personnages est dans la même série ? » | selon le type | selon le type |
| 4 | Sur la série principale : studio ou année de diffusion | studio ou année | studios ou années proches |

- Une question impossible faute de données (pas d'anniversaire, pas de studio…) est remplacée par une autre question possible.
- Ordre des choix mélangé.

**Anti-triche**
- Questions envoyées une par une ; la bonne réponse n'est jamais envoyée au navigateur avant la réponse du joueur.
- Le chrono est vérifié côté serveur (`servedAt` / `answeredAt`, avec une petite tolérance réseau).
- Une question ne peut recevoir qu'une seule réponse.

### 3. Calcul du combat
Appliqué dans cet ordre, à partir des stats de l'instantané :

1. **Modificateurs de type**
   | Type | Modificateur |
   |---|---|
   | 🔥 Combat | DEF × 0,75 |
   | 🔮 Mystère | ATK × 0,75 |
   | ✨ Magie | ATK × 0,85 |
   | 💗 Cœur | ATK × 0,70 ; DEF × 1,3 |
   | 🧭 Aventure | aucun |
2. **Bonus Cœur** : chaque carte Cœur donne +10 % d'ATK aux autres cartes de son équipe (bonus additifs, +20 % maximum pour une carte).
3. **PV de l'équipe** = somme des DEF modifiées (= PV maximum).
4. **Dégâts d'une attaque** = ATK × (erreurs / nombre de questions)
   - 🔥 Combat : ×2 si toutes les réponses sont fausses.
   - 🧭 Aventure : dégâts bornés entre 25 % et 75 % de l'ATK.
   - ✨ Magie : l'attaquant récupère 30 % des dégâts infligés, sans dépasser ses PV maximum.
   - Dégâts arrondis à l'entier ; PV jamais sous 0.
5. **Fin**
   - Une équipe à 0 PV perd immédiatement (les attaques suivantes n'ont pas lieu).
   - Sinon, après les 6 attaques : victoire au plus haut pourcentage de PV restants (PV / PV maximum).
   - Égalité de pourcentage : match nul.

Les chiffres sont indicatifs et seront équilibrés après des tests.

### 4. Récompenses et limites
| Résultat | Ryō |
|---|---|
| Victoire | 30 |
| Nul | 15 |
| Défaite | 10 |
| Forfait | 0 pour le perdant, 30 pour le gagnant |

- 5 duels **lancés** par jour maximum par joueur.
- 2 duels récompensés par jour maximum contre un même adversaire (au-delà, le duel compte pour l'Elo mais ne rapporte rien).
- Duels réservés aux comptes de plus de 24 h ayant ouvert au moins 20 paquets (comme les échanges).

### 5. Classements
- **Duel (Elo)** : départ à 1 000, facteur K = 32. Calcul standard (`attendu = 1 / (1 + 10^((eloAdverse − elo) / 400))`, nul = 0,5). Forfait compté comme une défaite. Pas de variation d'Elo pour un duel expiré.
- **Collection** : somme sur les personnages **uniques** possédés : N 1 / R 3 / SR 10 / SSR 40 / UR 200 (rareté actuelle), plus 50 % de cette valeur si le joueur possède la version Holo et 100 % s'il possède la version Gold.
- Affichage : top 100 et position du joueur. *(Plus tard : saisons mensuelles.)*

### 6. Succès
Définis dans le code, vérifiés après chaque événement pertinent (tirage, duel terminé, vente aux enchères, échange accepté, cadeau de connexion réclamé, personnage ajouté à la collection). Chaque succès ne se débloque qu'une fois et crédite la récompense prévue ; les Ryō sont inscrits au journal (`reason = ACHIEVEMENT`).

| Clé | Condition | Récompense (Ryō, sauf mention contraire) |
|---|---|---|
| `first_pack` | Ouvrir son premier paquet | 20 |
| `first_ssr` | Obtenir un premier SSR | 50 |
| `first_ur` | Obtenir un premier UR | 200 |
| `first_holo` | Obtenir une première Holo | 30 |
| `first_gold` | Obtenir une première Gold | 300 |
| `unique_100` / `500` / `1000` / `2500` | Posséder N personnages uniques | 100 / 300 / 800 / 2 000 |
| `series_complete_1` / `series_complete_5` / `series_complete_10` | Compléter 1 / 5 / 10 anime (tous les personnages présents dans la base ; seuls comptent les anime de l'album, soit au moins 5 personnages) | 150 / 500 / 1 500 *(provisoire, à équilibrer)* ; cristaux spéciaux 3 / 1 / 1 |
| `all_types` | Posséder au moins un personnage de chaque type | 50 |
| `login_streak_7` / `login_streak_30` | Réclamer les cadeaux de connexion 7 / 30 jours consécutifs | Ryō / cristaux, à équilibrer |
| `duel_win_1` / `10` / `50` | Gagner N duels | 30 / 150 / 500 |
| `first_auction_sale` | Première vente aux enchères | 30 |
| `first_trade` | Premier échange accepté | 30 |

### 7. Modèle de données (ajouts)
- **User** : `elo` (1 000), `duelsStartedToday`, `duelsStartedDate`
- **Duel** : `id`, `challengerId`, `opponentId`, `status` (PENDING / ACCEPTED / DONE / DECLINED / EXPIRED / FORFEIT), `createdAt`, `acceptDeadline`, `playDeadline`, `winnerId` (null si nul), `result` (JSON du combat pour le replay), `eloChangeChallenger`, `eloChangeOpponent`, `rewarded`
- **DuelSlot** : `duelId`, `userId`, `position` (1–3), `cardId`, instantané `characterId`, `type`, `attack`, `defense`
- **DuelDefense** : `duelId`, `userId`, `startedAt`, `finishedAt`
- **DuelQuestion** : `id`, `duelId`, `defenderId`, `slotPosition`, `index`, `kind`, `prompt` (JSON), `choices` (JSON), `correctIndex`, `servedAt`, `answeredAt`, `answerIndex`
- **UserAchievement** : `userId`, `key`, `unlockedAt` (unique sur `userId` + `key`)
- **CurrencyLedger.reason** : ajout de DUEL_REWARD, ACHIEVEMENT

### 8. Pages
| Page | Contenu |
|---|---|
| `/duels` | Défis reçus et envoyés, duels à jouer, historique, duels restants aujourd'hui |
| `/duels/new?to=pseudo` | Choix de l'équipe et de l'ordre |
| `/duels/[id]` | Choix de l'équipe (si défié), session de défense, puis replay |
| `/leaderboard` | Classements Duel et Collection |
| `/achievements` | Succès débloqués et à débloquer |

### 9. Critères pour dire que l'étape 4 est finie
- [ ] Un duel se joue de bout en bout en asynchrone, avec délais, forfait et expiration.
- [ ] La bonne réponse n'est jamais envoyée avant la réponse du joueur ; le chrono est vérifié côté serveur.
- [ ] Les effets des 5 types et le bonus Cœur sont couverts par des tests sur des combats calculés à la main.
- [ ] Le replay correspond exactement au combat calculé.
- [ ] L'Elo, les récompenses et les limites (5 par jour, 2 récompensés par adversaire) sont respectés.
- [ ] Chaque succès ne se débloque qu'une fois et crédite les Ryō.

---

## Étape 4 quater — Combat 4 contre 4 (refonte des duels)

> **Statut : règles en cours d'équilibrage (discussion des 2026-10-29 au 2026-10-31).** Moteur pur codé dans `src/lib/battle.ts`, sans page ni base ; équilibrage mesuré par `npm run simulate:battle`. Remplacera le duel quiz 3 contre 3 de l'étape 4 (§1 à §3), qui reste en place tant que la refonte n'est pas codée. Les chiffres ci-dessous sont ceux du moteur au 2026-10-31.

### Objectif
Un vrai combat de cartes, où le type, la rareté et les synergies d'équipe comptent, jouable contre l'ordinateur (PvM) ou contre un autre joueur (PvP).

### Décisions validées
- **4 cartes contre 4.** Le quiz est abandonné (il pourra revenir plus tard comme bonus).
- Chaque carte a un **sort de base**, un **sort affilié** à son type (avec cooldown) et, pour les SSR et UR, un **ultime**.
- **Ultime** : un par anime pour les SSR. Les UR ont deux ultimes, celui de leur anime et un ultime personnel ; le joueur choisit lequel utiliser.
- **Passif UR** : bonus pour les alliés du même anime (franchise), plafonné.
- La rareté ne doit pas tout décider : une bonne combinaison SSR + SR doit pouvoir battre UR + SR au hasard.
- **Pas de formation** (avant / arrière) : testée, elle n'apportait rien.
- **Modes** : tour par tour manuel ; automatique calculé en arrière-plan par le serveur (PvM) ; automatique synchrone, que l'on regarde se dérouler (PvM ou PvP).
- **PvP** : arène asynchrone contre l'équipe de défense d'un joueur absent, avec Elo. Le matchmaking en direct viendra peut-être plus tard.
- **Défense cachée** : en arène, l'équipe de défense n'est révélée qu'au début du combat (impossible de choisir le contre parfait).
- **Ordre de jeu** : l'équipe qui possède la carte avec la plus haute **Puissance** commence. Cela donne une utilité à la Puissance.

### 1. Stats de combat
- **PV** = ATK + DEF de la carte (stats de base de l'étape 1, §6).
- **Dégâts** = ATK × % du sort × affinité × 2000 / (2000 + DEF de la cible). La DEF divise les dégâts par deux quand elle vaut 2000. Plancher : 10 % de l'ATK.
- **Critique** : 15 % de chance, dégâts ×1,5. **Variation** : ±10 % sur chaque coup.
- **Cible** : l'ennemi vivant avec le moins de PV.
- Les bonus (passif UR, franchise) s'appliquent à l'ATK, à la DEF et aux PV.

### 2. Affinités
Cycle : 🔥 Combat → 🔮 Mystère → ✨ Magie → 💗 Cœur → 🧭 Aventure → 🔥 Combat. Chaque type inflige **×1,1** au suivant et **×0,95** au précédent (×1 sinon).

Les atouts et défauts de type de l'étape 1 (§5 ter), pensés pour le quiz, sont remplacés par les sorts affiliés ci-dessous.

### 3. Déroulement
1. L'équipe qui commence est celle qui a la carte de plus haute Puissance (égalité : le challenger, ou A).
2. Les cartes jouent en **alternance par position** : A1, B1, A2, B2, A3, B3, A4, B4, puis un nouveau tour. Une carte à 0 PV ne joue plus.
3. **Compensation** : l'équipe qui joue en second reçoit un bouclier de 15 % de ses PV max, qui disparaît à la fin du 1er tour.
4. Un bouclier absorbe les dégâts avant les PV.
5. **Fin** : une équipe sans carte vivante perd. Au bout de **30 tours**, l'équipe avec le plus haut pourcentage de PV restants gagne ; égalité parfaite : match nul.

### 4. Sorts
**Sort de base** : 1× ATK sur la cible. Disponible à chaque action.

**Sort affilié** (jeu « rôles ») : cooldown de 3 actions, premier lancer à la 2ᵉ action de la carte.

| Type | Rôle | Effet |
|---|---|---|
| 🔥 Combat | Frappe | 1,5× ATK, ignore 40 % de la DEF ; ×1,7 sur une cible **exposée** (et l'exposition est consommée) |
| 🔮 Mystère | Ouverture | 0,8× ATK (1,2× si aucun allié Combat n'est en vie) ; la cible devient **exposée** et **affaiblie** (ATK −20 %) pendant 2 actions |
| ✨ Magie | Vampire | 1,2× ATK ; soigne de 50 % des dégâts infligés le lanceur et chaque allié Cœur |
| 💗 Cœur | Soutien | Soigne de 30 % l'allié le plus blessé, puis donne à toute l'équipe un bouclier de 10 % de ses PV max ; un allié protégé par un bouclier inflige +15 % |
| 🧭 Aventure | Zone | 0,6× ATK sur tous les ennemis ; toute l'équipe gagne l'**élan** (ATK +10 %) pendant 2 actions |

**Combos en duo** : Mystère expose, Combat frappe la cible exposée ; Cœur protège, les alliés protégés tapent plus fort ; Magie partage son drain avec Cœur.

**Mode automatique** (et PvM en arrière-plan) : Cœur ne lance son sort que si un allié est sous 70 % de PV. Combat garde son sort au plus 2 actions en attendant une cible exposée, si un allié Mystère est en vie.

**Ultime** (SSR et UR) : jauge de 100, +20 par action et +10 par coup reçu ; lancé automatiquement quand la jauge est pleine. Dans le moteur actuel, c'est le sort affilié en version ×2, avec son effet appliqué à toute l'équipe adverse. Les ultimes propres à chaque anime et les ultimes personnels des UR restent à écrire.

### 5. Synergies
- **Franchise** : selon le nombre de cartes du même anime dans l'équipe, 2 : +3 %, 3 : +6 %, 4 : +10 % d'ATK, de DEF et de PV.
- **Passif UR** : chaque UR donne +10 % aux autres cartes de son anime, cumulable entre UR, plafonné à +30 %.

### 6. Budget d'équipe *(proposé, à valider)*
Pour que la rareté ne décide pas tout en arène : N 1, R 2, SR 3, SSR 5, UR 8 points, **14 points maximum** par équipe. Les compositions de même budget s'affrontent entre 33 et 67 % de victoires.

### 7. Résultats de la simulation (2026-10-31, 4 000 combats par scénario)

| Mesure | Résultat |
|---|---|
| Taux de victoire par type, à rareté égale (équipes mixtes) | de 43 à 56 % |
| Équipes d'un seul type | suivent le cycle : le type fort gagne de 61 à 86 % (Combat contre Mystère : 86 %) |
| Équipe plus rare d'un cran (4 SSR contre 4 SR) | ~100 % (d'où le budget) |
| Poids de la franchise | +30 points ; un SSR + 3 SR du même anime bat UR + 3 SR au hasard 49 % du temps |
| Poids des combos de types | de +3 à +10 points (Magie + Cœur : le plus fort) |
| Ultimes (4 SSR avec contre sans) | 60 % |
| Celui qui commence (équipes miroir) | de 42 à 46 % |
| Durée | 5,8 tours en moyenne, 95 % en 9 tours ou moins |

### 8. Reste à décider
- Valider le budget d'équipe et son plafond.
- Arène : récompenses, limites par jour, Elo (repris de l'étape 4 §5 ?), choix des adversaires.
- Contenu PvM (la Tour de l'étape 7 pourra réutiliser ce moteur).
- Mode manuel : ce que le joueur choisit à chaque action (sort de base, sort affilié, ultime, cible).
- Écriture des ultimes par anime et des ultimes personnels des UR.
- Combat contre Mystère reste un peu fort (86 % contre ~70 % pour les autres paires du cycle) : à réduire si besoin, par exemple en baissant la pénétration de DEF de Combat contre Mystère.
- Modèle de données, pages, migration du duel quiz existant.

---

## Étape 4 bis — Cristaux et bannières (refonte du tirage)

> **Statut : phase 1 (cristaux, lots), phase 2 (bannières, cristaux spéciaux, cadeau de bienvenue) et phase 3 (expéditions) codées les 2026-10-12 et 2026-10-13.** Elle remplace le stock de paquets (Étape 2 §3, §4), l'achat de paquets (Étape 3 §2) et l'ouverture groupée ×5 / ×10 actuelle. Les règles sont issues d'une discussion, d'un conseil (5 avis + relecture croisée) et de `npm run simulate:crystals` (variante C).

### Objectif
Remplacer le « paquet » par une ressource accumulable, les **cristaux** : **1 cristal = 1 carte tirée**. Cela permet des récompenses de toute taille, des tirages ×5 et ×10, et des **bannières** pour viser des catégories de personnages. Les cristaux sont aussi l'énergie du lore (la machine-araignée en consomme pour capturer).

### Décisions validées
- 1 cristal = 1 carte. Tirages **×5** et **×10** (pas de tirage à l'unité).
- Régénération et plafond équivalents à l'actuel : **1 cristal toutes les 2 min, plafond 50**.
- Achat avec des Ryō : **25 cristaux par jour maximum**.
- **Pity compté en cartes**, un seul compteur : SSR ou mieux garanti à la **75ᵉ** carte sans SSR, UR garanti à la **500ᵉ** carte sans UR (soit exactement l'actuel, 15 et 100 paquets de 5).
- **Le ×10 améliore la 10ᵉ carte**, de façon dégressive : le gain relatif est plus fort sur SR que sur SSR, plus fort que sur UR (variante C, ci-dessous).
- **Bannières** de catégories (sport, shonen, isekai, waifu, husbando) et de personnages ciblés, avec des **cristaux spéciaux** obtenus par **succès** ou **expéditions** (les expéditions avec boss restent à explorer).

### Validé le 2026-10-12 (propositions du conseil, acceptées)
- Prix : **20 Ryō par cristal** (500 Ryō/jour au maximum, comme aujourd'hui).
- Bannière : la rareté est tirée avec les taux normaux, puis **50 %** des cartes viennent de la catégorie mise en avant et 50 % du pool complet.
- Cadeau de bienvenue : **50 cartes** en tout, dont **20 tirages sur une bannière de catégorie au choix du joueur**, à usage unique.
- Cristaux spéciaux : environ 100 sur la vie d'un compte via les succès, puis 10 par semaine au plus via les expéditions.
- Le nom du marché des enchères (§9) reste à décider avec la direction du lore.

---

### 1. Cristaux (stock)
- `User.crystals` (stock au moment de `crystalsUpdatedAt`) et `User.crystalsUpdatedAt`. Calcul **paresseux**, comme pour les paquets :
  ```
  écoulés   = floor((maintenant − crystalsUpdatedAt) / 2 min)
  disponibles = min(50, crystals + écoulés)      // sauf si crystals dépasse déjà 50 : pas de recharge
  ```
- Au-delà de 50 (achats, récompenses), le stock est conservé mais ne se recharge plus tant qu'il reste ≥ 50 (règle actuelle des paquets achetés).
- Les cristaux ne sont **ni vendables, ni échangeables, ni mis aux enchères**.
- Toute dépense ou gain est une mise à jour conditionnelle dans la transaction (le stock ne devient jamais négatif).

### 2. Boutique
| ➖ Dépense | ➕ Gain |
|---|---|
| 20 Ryō = 1 cristal, **25 par jour maximum** (remise à zéro à minuit, heure du serveur), achetés par lots de 5 ou 25 | 1 cristal / 2 min, succès, expéditions (plus tard) |

L'achat s'ajoute au stock et peut le faire dépasser 50. Journal : nouvelle raison `CRYSTAL_BUY` dans `CurrencyLedger`.

### 3. Lots ×5 et ×10
- Un ×5 coûte 5 cristaux, un ×10 coûte 10 cristaux (aucune remise : le gain du ×10 est la 10ᵉ carte).
- Chaque lot se tire dans **une seule transaction**. Un lot est refusé s'il y a moins de cristaux que son coût.
- Taux de rareté de base inchangés : N 65 / R 24 / SR 8 / SSR 2,5 / UR 0,5 %. Finitions inchangées : Normal 90 / Holo 9 / Gold 1 %.

**Règles de tirage d'un lot, appliquées carte par carte dans l'ordre :**
1. **Pity UR** : si `cardsSinceUR ≥ 499`, la carte est un UR.
2. **Pity SSR** : si `cardsSinceSSR ≥ 74` et que la carte tirée n'est ni SSR ni UR, elle est retirée parmi SSR et UR (SSR 5/6, UR 1/6).
3. **Carte garantie** : la 5ᵉ carte de chaque bloc de 5 est tirée parmi R, SR, SSR et UR (selon leurs taux relatifs) si les 4 cartes précédentes du bloc sont toutes N. Comme aujourd'hui.
4. **10ᵉ carte du ×10** : elle est tirée avec la table ci-dessous (au moins R) **à la place** de la règle 3 pour cette carte. Le ×5 n'a pas de 10ᵉ carte.

| Rareté | Taux de base | 10ᵉ carte du ×10 |
|---|---|---|
| N | 65 % | 0 % |
| R | 24 % | 68,75 % |
| SR | 8 % | 24 % (×3) |
| SSR | 2,5 % | 6,25 % (×2,5) |
| UR | 0,5 % | 1 % (×2) |

**Résultats simulés** (2 000 000 cartes, `npm run simulate:crystals`), relatifs à l'actuel, par lot de 10 cartes :
| | SR | SSR | UR |
|---|---|---|---|
| ×5 (variante C) | ±0 % | +1 % | +1 % |
| ×10 (variante C) | **+16 %** | **+9 %** | **+5 %** |

Le ×5 reste équivalent à aujourd'hui, le ×10 est meilleur : il est donc l'unité naturelle. Sans la règle 3 (variante B), le ×5 était 6 % en dessous de l'actuel en SR : rejeté.

**Pity (simulé)** : premier SSR ou mieux en médiane autour de 20–22 cartes (90 % avant 65–71, jamais plus de 75) ; premier UR en médiane autour de 120 cartes (90 % avant ~380–390, jamais plus de 500).

### 4. Pity
- `User.cardsSinceSSR` et `User.cardsSinceUR` remplacent `packsSinceSSR` / `packsSinceUR`.
- **Un seul compteur pour le tirage standard et pour toutes les bannières** : changer de bannière ne permet pas de le contourner.
- Remise à zéro : `cardsSinceSSR` si une carte SSR ou UR est obtenue, `cardsSinceUR` si une carte UR est obtenue ; sinon +1 par carte.
- Affichage : « SSR garanti dans X cartes », « UR garanti dans Y cartes ».

### 5. Bannières (refonte décidée le 2026-10-17)
- Une **bannière** = un nom, une description (lore), une **liste de personnages**, des dates d'ouverture et de fermeture éventuelles, un coût en cristaux (normaux ou spéciaux).
- **Bannières permanentes**, en cristaux normaux : **Générale** (tout le catalogue : c'est le tirage standard), **Waifu** (personnages féminins) et **Husbando** (personnages masculins), à partir du champ `gender` d'AniList.
- **Bannières spéciales temporaires**, en **cristaux spéciaux** uniquement : un anime ou un groupe d'animes, avec des dates. Elles sont définies dans `src/lib/banner-events.ts` (identifiants AniList des séries) ; aucune pour l'instant.
- **Une bannière ne change jamais les taux de rareté** ni le pity. La rareté est tirée comme d'habitude, puis le personnage est pris **parmi ceux de la bannière** à cette rareté (100 %) ; s'il n'y en a aucun de cette rareté, on prend le catalogue complet.
- Les lots ×5 et ×10 fonctionnent de la même manière sur une bannière (mêmes règles de lot, mêmes garanties).
- **Taux affichés** : un bouton « Taux » au bout du bandeau des bannières ouvre un panneau avec les taux par rareté, le nombre de personnages disponibles par rareté dans la bannière choisie, les garanties (bloc de 5, 10ᵉ carte du ×10, pity) et les taux de finition. Les valeurs viennent directement de `src/lib/pull.ts`.
- Abandonné : la rotation hebdomadaire Sport / Shonen / Isekai et la bannière « Élus » (les anciennes encore ouvertes sont fermées automatiquement).

### 6. Cristaux spéciaux
- Ressource séparée (`User.specialCrystals`), utilisable seulement sur les bannières qui en demandent. **Ni achetable, ni vendable, ni échangeable.**
- Sources : d'abord les **succès** (stock total limité, environ 100 sur la vie d'un compte), puis les **expéditions** 10 par semaine au plus.
- Usage (2026-10-17) : réservés aux **bannières spéciales temporaires** d'anime ou de groupes d'animes.
- Règle de garde-fou : toutes les sources spéciales réunies restent **sous 5 % des cartes créées par jour** par les cristaux normaux.
- Journal dédié : table `SpecialCrystalLedger` (`userId`, `amount`, `reason`, `refId`).

### 5 bis. Réalisation des bannières (codé, refonte du 2026-10-17)
- Bannières permanentes `perm-waifu` et `perm-husbando` (part 100 %) ; la Générale est le tirage sans bannière.
- Bienvenue : `welcome-general` (catalogue complet), `welcome-waifu`, `welcome-husbando`. Le choix est **verrouillé au premier tirage** ; un joueur qui avait déjà choisi une ancienne bannière de bienvenue (Sport, Shonen, Isekai) la garde jusqu'à la fin de ses tirages, un nouveau joueur ne peut plus la prendre.
- Événements : créés à la première lecture pendant leurs dates, clé `event-…`, payés en cristaux spéciaux (×5 = 5, ×10 = 10).
- Coût d'un lot : cristaux normaux, cristaux spéciaux ou tirages de bienvenue. Le pity est commun à tout.
- Cadeau de bienvenue : 30 cristaux + 20 tirages de bienvenue ; il n'y a pas encore de conversion automatique en cristaux si le joueur ne s'en sert pas.
- Succès : 11 succès donnent des cristaux spéciaux, **100 au total** (journal `SpecialCrystalLedger`).
- Vérification : `npm run check:banners`.

### 7. Expéditions (à explorer, hors périmètre de cette étape)
Envoyer 1 à 3 cartes explorer une brèche (1, 6 ou 24 h) ; les types influencent le résultat ; un boss à la fin rapporte des cristaux spéciaux. Cette étape ne code que les **hooks** : les cristaux spéciaux existent et les succès en donnent. Les expéditions auront leur propre spec.

### 8. Cadeau de bienvenue
- Remplace les 10 paquets : **50 cartes** en tout.
- 30 cristaux normaux + **20 tirages sur une bannière choisie par le joueur** (Générale, Waifu ou Husbando, §5), à usage unique (un ×20 se joue en deux ×10). Il ne peut pas être perdu en ne choisissant pas : à défaut de choix, les 20 sont convertis en cristaux normaux.
- Le cadeau injecte **autant de cartes qu'aujourd'hui** (50), pas plus.

### 8 bis. Calendrier quotidien de bienvenue
- Calendrier d'un cadeau par jour pendant **30 jours** à compter de l'inscription ; les 7 premiers jours forment le palier de bienvenue d'une semaine.
- Une seule case peut être réclamée par jour, côté serveur. Une case manquée ne peut pas être réclamée rétroactivement.
- Les récompenses peuvent inclure des Ryō, des cristaux normaux et des cristaux spéciaux. Le contenu et les quantités restent à équilibrer ; les cristaux spéciaux sont comptés dans le budget de sources du §6.
- Les succès de connexion (`login_streak_7`, `login_streak_30`) sont distincts des cadeaux quotidiens et se débloquent une fois après 7 puis 30 jours consécutifs.
- **À préciser** : reprise du calendrier après une journée manquée, contenu et quantités des 30 cases, et si le calendrier recommence après le jour 30.

### 9. Vocabulaire et clarté (« marché noir » renommé « Bourse des brèches », décidé le 2026-10-12)
- Chaque terme (cristal, cristal spécial, bannière, pity, Ryō) est défini à l'écran à sa première apparition.
- Les enchères s'appellent « Bourse des brèches » dans l'interface (adresses `/market` inchangées).

### 10. Modèle de données (changements)
- **User** : ajout de `crystals`, `crystalsUpdatedAt`, `specialCrystals`, `crystalsBoughtToday`, `crystalsBoughtDate`, `loginStreak`, `lastLoginRewardAt`, `welcomeLoginRewardDay` ; renommage `packsSinceSSR` → `cardsSinceSSR`, `packsSinceUR` → `cardsSinceUR` ; suppression de `packsStored`, `lastPackAt`, `packsBoughtToday`, `packsBoughtDate`.
- **PackOpening** → **Opening** : `lotSize` (5 ou 10), `bannerId` (nullable), `pityTriggered`.
- **Banner** : `id`, `name`, `description`, `category`, `startsAt`, `endsAt`, `costKind` (NORMAL / SPECIAL), `weight` (part des cartes issues de la bannière).
- **BannerCharacter** : `bannerId`, `characterId`.
- **CurrencyLedger.reason** : ajout de `CRYSTAL_BUY` ; `PACK_BUY` conservé pour l'historique.
- **Migration** : la base ne contient que des comptes de test, on repart d'une base propre (aucun joueur réel à convertir). Pour mémoire, un joueur existant convertirait chaque paquet en stock en 5 cristaux.

### 11. Impact sur l'existant
- Scène 3D : le HUD affiche les cristaux au lieu des paquets ; boutons **Ouvrir ×5** (animation actuelle) et **Ouvrir ×10** (résumé) ; sélecteur de bannière.
- `/packs`, ouverture de secours sans WebGL, accueil, barre du haut, album (bouton d'achat) : « paquets » devient « cristaux ».
- Récompenses de succès : chacune peut donner des Ryō et/ou des cristaux (à répartir dans une passe d'équilibrage).
- `npm run simulate` et `npm run simulate:crystals` à fusionner et à mettre à jour quand le tirage sera codé.

### 12. Critères pour dire que l'étape 4 bis est finie
- [ ] Un ×5 coûte 5 cristaux, un ×10 en coûte 10, jamais plus que le stock, même avec des ouvertures simultanées.
- [ ] La simulation du code de production confirme : ×5 ≈ actuel (à 2 % près), ×10 = +16 / +9 / +5 % de SR / SSR / UR, SSR au plus tard à la 75ᵉ carte, UR à la 500ᵉ.
- [ ] Une bannière ne modifie ni les taux de rareté ni le pity ; un seul compteur de pity.
- [ ] Les cristaux (normaux et spéciaux) sont inscrits dans un journal et ne sont ni vendables ni échangeables.
- [ ] Achat limité à 25 cristaux par jour, solde de Ryō toujours égal à la somme du journal.
- [ ] Le cadeau de bienvenue donne 50 cartes, pas plus.
- [ ] Le calendrier de bienvenue propose une récompense quotidienne pendant 30 jours et reconnaît les paliers de connexion de 7 et 30 jours.

---

## Étape 4 ter — Expéditions dans les brèches

> **Statut : phase 1 (cristaux, lots) et phase 2 (bannières, cristaux spéciaux, cadeau de bienvenue) codées le 2026-10-12.** Les décisions de principe sont validées ; les chiffres marqués *(à équilibrer)* sont des valeurs de départ à tester.

### Objectif
Donner une utilité de jeu aux cartes en dehors des duels : envoyer une équipe explorer une brèche pendant quelques heures, et revenir chercher le butin. Les expéditions sont la source de **cristaux spéciaux** (et un petit revenu en Ryō et en cristaux).

### Décisions validées
- **Mode idle seul** pour l'instant : on envoie, on revient plus tard. Pas de boss ni de combat interactif (idée repoussée : boss de brèche en quiz, réutilisant `duel-quiz.ts`).
- **3 durées**, thèmes de brèche, **1 emplacement au début, 3 après quelques succès**.
- **Gratuit** : aucun coût d'entrée ; les emplacements sont le seul frein.
- Récompenses **qui augmentent avec la puissance de l'équipe** (§3) : **Ryō (plus faible que la vente rapide, pour ne pas concurrencer le marché)**, un peu de cristaux normaux, et des **cristaux spéciaux qui tombent de temps en temps**, sans boss. Plafond de 10 cristaux spéciaux par semaine (déjà décidé, Étape 4 bis §6).
- **Échec sans pénalité** : aucune blessure ni temps de repos ; les cartes reviennent, le butin est réduit.
- **Capture d'un personnage précis** : « on verra » (hors périmètre).

---

### 1. Brèches
Définies **dans le code** (comme les succès), pas en base : `id`, `name`, `lore`, `durationH`, `favoredTypes`, `threshold` (puissance requise) et table de récompenses.

| Niveau | Durée | Seuil de puissance *(à équilibrer)* | Types favorisés |
|---|---|---|---|
| Faille | 1 h | faible | 1 type |
| Brèche | 6 h | moyen | 2 types |
| Gouffre | 24 h | élevé | 2 types |

Chaque niveau a plusieurs brèches thématiques (nom, lore, types favorisés différents) pour varier ; liste initiale à écrire avec la direction du lore. Les noms ci-dessus sont des placeholders.

### 2. Équipe et emplacements
- Une expédition = **1 à 3 cartes** du joueur (cartes distinctes ; deux cartes du même personnage autorisées).
- Les cartes envoyées sont **bloquées** (`Card.inExpedition`) : ni vente, ni échange, ni enchère, ni nouvelle expédition. Elles restent utilisables en duel (le duel copie leurs stats).
- **Emplacements** : 1 au début ; un 2ᵉ puis un 3ᵉ se débloquent avec des succès d'expédition *(seuils à équilibrer, par exemple 5 et 20 expéditions terminées)*.
- Pas de limite par jour : le temps et les emplacements suffisent.

### 3. Résolution
Calculée par le serveur **au retour**, à partir d'une `seed` tirée et enregistrée **au lancement** (recharger la page ne change pas le résultat).

```
score(carte) = puissance × affinité        (type favorisé ×1,25 ; autre type ×1,0)
score(équipe) = Σ score(carte) × aléa      (aléa dans [0,7 ; 1,3] fixé par la seed, élargi le 2026-10-17)
ratio = score(équipe) / seuil de la brèche
```
| Résultat | Condition | Butin |
|---|---|---|
| Échec | ratio < 1 | 25 % des Ryō, rien d'autre |
| Réussite | 1 ≤ ratio < 1,5 | butin de base (§4) |
| Triomphe | ratio ≥ 1,5 | butin de base, avec le bonus de puissance (ci-dessous) |

**Bonus de puissance** *(validé : plus l'équipe est puissante, plus les ressources rares sont probables)* : pour une réussite ou un triomphe, on pose `m = clamp(ratio, 1, 3)`.
- **Ryō** : × `1 + 0,25 × (m − 1)` (jusqu'à ×1,5).
- **Cristaux normaux** : la quantité de base, plus 1 cristal supplémentaire avec une probabilité de `(m − 1) / 2`.
- **Cristal spécial** : probabilité de base × `m` (jusqu'à ×3), toujours dans le plafond de 10 par semaine.
- Une équipe très au-dessus du seuil ne rapporte donc pas des quantités illimitées : les multiplicateurs sont bornés, et les plafonds quotidiens et hebdomadaires restent valables.

*(Coefficients à équilibrer par simulation.)*

### 4. Récompenses *(à équilibrer)*
| Brèche | Ryō (réussite) | Cristaux normaux | Chance de cristal spécial |
|---|---|---|---|
| Faille (1 h) | 10 | 0 | 0 % |
| Brèche (6 h) | 60 | 1 | 5 % |
| Gouffre (24 h) | 250 | 3 | 20 % |

- Repères : le bonus quotidien rapporte 50 Ryō, une UR se vend 200 Ryō. Un joueur à 3 emplacements ne doit pas dépasser environ **600 Ryō par jour** d'expéditions.
- Cristaux normaux gagnés par expédition : plafond **10 par jour**.
- Cristal spécial : 1 par tirage réussi, **plafond de 10 par semaine** (semaine commençant le lundi, heure du serveur).
- Journal : nouvelles raisons `EXPEDITION` (Ryō) ; les cristaux ont leur propre journal (Étape 4 bis).

### 5. Déroulement
1. `/expeditions` : choix d'une brèche, de 1 à 3 cartes, lancement. Le résultat n'est pas affiché.
2. À la fin du temps, l'expédition passe à « terminée » (balayage paresseux à chaque consultation, comme `sweepDuels`, et `POST /api/expeditions/close` pour la production). Une notification `EXPEDITION_DONE` est envoyée.
3. Le joueur **récupère le butin** par un bouton ; le résultat s'affiche alors (échec / réussite / triomphe, gains). Une expédition non récupérée reste en attente : elle occupe l'emplacement mais ne perd rien.
4. Le passage « terminée » → « récupérée » est un **passage conditionnel** (une seule récupération, même en cas de double clic) et crédite Ryō, cristaux et cristal spécial dans la même transaction, avec le journal.

### 6. Succès liés
Nouveaux succès *(à définir et équilibrer)* : première expédition, 5 et 20 expéditions terminées (qui débloquent les emplacements 2 et 3), premier triomphe, premier cristal spécial.

### 7. Modèle de données (ajouts)
- **Expedition** : `id`, `userId`, `breachId`, `startedAt`, `endsAt`, `seed`, `status` (RUNNING / DONE / CLAIMED), `outcome` (FAIL / SUCCESS / TRIUMPH, une fois calculé), `rewards` (JSON), `claimedAt`.
- **ExpeditionCard** : `expeditionId`, `cardId`, instantané `characterId`, `type`, `power`.
- **Card** : ajout de `inExpedition`.
- **User** : ajout de `expeditionsDone` (pour les emplacements et succès).
- **CurrencyLedger.reason** : ajout de `EXPEDITION`.

### 8. Pages
| Page | Contenu |
|---|---|
| `/expeditions` | Emplacements, expéditions en cours avec compte à rebours, à récupérer, historique, formulaire de lancement |
| Accueil / menu | Entrée « Expéditions » avec le nombre à récupérer |

### 8 bis. Réalisation (2026-10-13)
- Brèches : 2 par niveau, seuils de puissance **650** (Faille 1 h), **6 000** (Brèche 6 h), **24 000** (Gouffre 24 h) ; Ryō **10 / 70 / 200** (équilibrage validé le 2026-10-17 par simulation : 3 N réussissent une Faille environ 2 fois sur 3, 1 SR + 2 R une Brèche ~9 fois sur 10, 1 SSR + 2 SR un Gouffre de ~60 % à presque toujours selon les types favorisés ; aléa ±30 % pour garder du suspense près du seuil) ; plafond de **600 Ryō et 10 cristaux par jour** appliqué à la récupération.
- La page `/expeditions` montre une estimation (puissance de l'équipe contre le seuil). Un lien verrouillé vers `/tour` y figure (voir Étape 7, « Préparation v1 »). Dans la scène des paquets, une brèche cliquable à gauche mène à la page.

### 9. Critères pour dire que l'étape 4 ter est finie
- [ ] Une carte en expédition ne peut ni être vendue, ni échangée, ni mise aux enchères, ni envoyée dans une autre expédition.
- [ ] Le résultat est identique quel que soit le nombre de rechargements (seed enregistrée) ; récupérer deux fois ne paie qu'une fois.
- [ ] Le plafond de 10 cristaux spéciaux par semaine et de 10 cristaux normaux par jour est respecté, même avec des récupérations simultanées.
- [ ] Un joueur à 3 emplacements reste sous ~600 Ryō par jour (vérifié par simulation).
- [ ] L'échec rend les cartes sans pénalité et paie 25 % des Ryō.

---

## Étape 5 — Social

### Objectif
Faire jouer les joueurs ensemble : profils publics, amis, guildes, messagerie.

### Décisions validées
- Album **public** par défaut (option « privé » envisageable plus tard).
- Guildes : création à 1 000 Ryō, 20 membres maximum, une seule guilde par joueur.
- Chat : messages privés entre amis et chat de guilde ; **pas de chat global**.
- Temps réel : **polling toutes les 3 secondes** en local, vrai temps réel à la mise en ligne.

---

### 1. Profils publics et vitrine
- `/u/[pseudo]` : pseudo, date d'inscription, Elo, score Collection, nombre de personnages uniques, succès, guilde.
- **Vitrine** : jusqu'à 6 cartes épinglées, affichées en haut du profil. Une carte vendue ou échangée disparaît de la vitrine.
- **Album public** : consultable par tous, avec les mêmes filtres que son propre album, sans les actions (vendre, verrouiller…).

### 2. Amis
- Demande → acceptée / refusée ; suppression possible des deux côtés. Maximum 100 amis.
- Statut : « en ligne » si activité dans les 5 dernières minutes, sinon « vu il y a X » (`lastSeenAt`, mis à jour au plus une fois par minute).
- Raccourcis : défier, proposer un échange, voir le profil, envoyer un message.
- **Blocage** : un joueur bloqué ne peut plus envoyer de demande d'ami, de message, de défi ni d'offre d'échange. Bloquer supprime l'amitié existante.

### 3. Guildes
- Création : 1 000 Ryō (ligne `GUILD_CREATE` dans le journal).
- Nom unique, tag unique de 2 à 4 caractères (lettres et chiffres) affiché à côté du pseudo, description, icône (emoji).
- 20 membres maximum.
- **Rôles** :
  | Rôle | Droits |
  |---|---|
  | Chef | Tout : modifier la guilde, nommer ou retirer des officiers, transmettre le rôle de chef, supprimer des messages, dissoudre la guilde |
  | Officier | Accepter ou refuser les demandes, expulser des membres (pas les officiers ni le chef) |
  | Membre | Discuter, quitter la guilde |
- **Entrée** : guilde ouverte (entrée directe) ou sur demande (validation par un officier ou le chef).
- Une seule guilde par joueur ; délai de 24 h après un départ avant d'en rejoindre une autre.
- Le chef ne peut pas partir sans transmettre son rôle, sauf s'il est seul (la guilde est alors dissoute).
- **Classements des guildes** (deux onglets dans `/leaderboard`) :
  - **Collection** : somme des scores Collection des membres.
  - **Duels de la semaine** : nombre de victoires en duel des membres depuis lundi 0 h.

### 4. Messagerie
- **Messages privés** : uniquement entre amis.
- **Chat de guilde** : une conversation par guilde, ouverte à tous les membres.
- **Polling** toutes les 3 secondes sur la conversation ouverte ; compteur de non-lus dans la cloche.
- Limites : 500 caractères par message, 1 message par seconde par joueur, messages conservés 90 jours.
- **Modération** : signalement d'un message, blocage, filtre de mots basique (liste configurable), suppression de messages par le chef dans le chat de guilde.

### 5. Modèle de données (ajouts)
- **User** : `lastSeenAt`, `showcase` (jusqu'à 6 `cardId`), `guildId`, `guildRole` (OWNER / OFFICER / MEMBER), `guildLeftAt`
- **Friendship** : `requesterId`, `addresseeId`, `status` (PENDING / ACCEPTED), `createdAt`
- **Block** : `blockerId`, `blockedId`, `createdAt`
- **Guild** : `id`, `name`, `tag`, `description`, `icon`, `joinMode` (OPEN / REQUEST), `ownerId`, `createdAt`
- **GuildJoinRequest** : `guildId`, `userId`, `status`, `createdAt`
- **Conversation** : `id`, `kind` (DM / GUILD), `guildId` (si GUILD), `userAId` / `userBId` (si DM)
- **ConversationRead** : `conversationId`, `userId`, `lastReadAt`
- **Message** : `id`, `conversationId`, `authorId`, `content`, `createdAt`, `deletedAt`
- **Report** : `id`, `reporterId`, `messageId`, `reason`, `status`, `createdAt`
- **CurrencyLedger.reason** : ajout de GUILD_CREATE

### 6. Pages
| Page | Contenu |
|---|---|
| `/u/[pseudo]` | Profil public, vitrine, album |
| `/friends` | Amis, demandes reçues et envoyées, joueurs bloqués |
| `/guilds` | Liste, recherche, création |
| `/guilds/[tag]` | Membres, chat, demandes, gestion |
| `/messages` | Conversations privées |

### 7. Critères pour dire que l'étape 5 est finie
- [ ] Demandes d'ami, suppression et blocage fonctionnent ; un joueur bloqué ne peut plus rien envoyer.
- [ ] Création, entrée (ouverte ou sur demande), départ, expulsion, rôles et transmission du rôle de chef fonctionnent, avec les limites (20 membres, une guilde, délai de 24 h).
- [ ] Messages privés et chat de guilde fonctionnent, avec les limites de taille et de fréquence.
- [ ] Signalement, filtre de mots et suppression par le chef fonctionnent.
- [ ] Les classements de guildes s'affichent.

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

---

## Étape 7 — Après le MVP : la Tour

> **Statut : idée validée le 2026-10-12, rien n'est codé.** Elle vient d'un conseil (5 avis + relecture croisée) et d'une discussion. L'histoire est dans `lore.md`. Les chiffres marqués *(à équilibrer)* sont des valeurs de départ à tester avec un script de simulation.

### Objectif
Donner aux cartes un but de progression qui ne dépend pas de la chance des tirages : un mode PvE où le joueur compose son équipe face à un boss connu d'avance.

### Décisions validées
- **La Tour remplace les brèches aléatoires de rang D à S** (qui refaisaient les expéditions). Les rangs sont gardés, répartis par tranches d'étages.
- **La Puissance ne sert pas de PV** (elle va de 100 à 104 000 et mesure la popularité). Elle est renommée **« Popularité »** dans l'interface ; le champ `Character.power` ne change pas. Les expéditions continuent de l'utiliser.
- **Les combats réutilisent la logique des duels** (ATK, DEF, modificateurs de type), sans quiz.
- **Pas de stats brutes ajoutées par des artefacts** : un N équipé ne doit jamais battre un UR nu.
- **Pas de 500 boss faits à la main** : étages générés, environ 10 jalons écrits à la main pour la v1.
- **Récompenses au premier passage seulement**, avec un budget fermé.
- **Sorts génériques** : pas de sort écrit personnage par personnage au début.
- **La v1 couvre les étages 1 à 50.**

---

### 0. Préparation v1 (faite le 2026-10-13)
- Page `/tour` d'attente (accès scellé, lore, aucune mécanique), liée depuis `/expeditions` comme brèche verrouillée « Univers 0 ». Elle ne bloque pas les expéditions et ne crée aucune table.
- Les expéditions utilisent déjà `Character.power` (futur « Popularité ») : le renommage ne touche que l'interface.

### 1. Structure
- La Tour est le méta-univers 0 : 500 étages, un univers par étage.
- Rangs : étages 1–100 = D, 101–200 = C, 201–300 = B, 301–400 = A, 401–499 = S, étage 500 = SS.
- Chaque étage est **identique pour tous les joueurs** (graine fixée par le numéro d'étage).
- **Étage normal** : 3 ennemis tirés du pool de personnages avec cette graine, stats multipliées par `1 + étage / 100` *(à équilibrer)*.
- **Jalon** (tous les 10 étages) : un boss nommé, choisi à la main, avec une ligne de lore et un **trait** visible. 10 jalons pour la v1, 50 à terme.
- L'étage 500 reste verrouillé tant que le mystère du lore n'est pas tranché.

### 2. Combat
- Équipe de **3 cartes** du joueur ; les cartes ne sont pas bloquées (comme en duel, leurs stats sont copiées).
- PV de l'équipe = somme des DEF modifiées, comme en duel. Les modificateurs de type des duels s'appliquent.
- Le combat est **résolu par le serveur**, rejouable grâce à la graine. Il se joue en tours, chaque carte agissant à son tour.
- Le boss est **révélé avant le combat** : type, PV, trait. Le joueur choisit son équipe en conséquence. C'est sa décision.
- Exemples de traits *(à écrire)* : « résiste à Magie », « frappe en premier », « ignore 30 % de la DEF ».
- **3 tentatives par jour** *(à équilibrer)*. Une défaite consomme une tentative, sans autre pénalité.

### 3. Sorts
Chaque carte possède, dans le combat de la Tour :
1. **Sort d'attaque** : un coup dont les dégâts suivent l'ATK. Disponible à chaque tour.
2. **Sort spécial de type** : un effet propre au type de la carte (5 types, donc 5 sorts), avec un **cooldown** en tours.
3. **Sort de personnage** (SSR et UR seulement) : un sort spécial avec cooldown. Il est **générique** au début, déduit du type et du rôle (principal / secondaire) du personnage. Quelques sorts écrits à la main pourront être ajoutés plus tard pour des personnages populaires.

Effets du sort de type *(à écrire et équilibrer)* : pistes à valider, une par type (Combat, Mystère, Magie, Cœur, Aventure), en cohérence avec les atouts et défauts déjà définis pour les duels.

### 4. Récompenses *(à équilibrer)*
Uniquement au **premier passage** d'un étage :
| Étage | Récompense |
|---|---|
| Normal | `10 + étage / 5` Ryō |
| Tous les 10 | 5 cristaux et la **carte du boss du jalon** (une fois) |
| Tous les 50 | 1 cristal spécial (dans le plafond hebdomadaire de 10) et un titre |

- Avec 3 tentatives par jour, finir les 500 étages prend au moins environ 170 jours. Le total de Ryō reste sous environ 20 000, étalé sur des mois.
- La carte offerte au premier passage d'un jalon vient du lore de la capture ; au plus 50 cartes par joueur, à vie.

### 5. Artefacts (phase 2)
Après la v1, si les joueurs reviennent :
- **Effets latéraux seulement** : changer le type de dégât, +1 tentative, modifier un cooldown, cosmétique. Jamais de stats brutes.
- Liés au compte, non échangeables, pour ne pas créer de second marché.
- Raretés, sources et emplacements : à spécifier dans une étape à part.

### 6. Pew
Compagnon-guide, **hors combat**. Il peut signaler des pistes (par exemple l'étage ou le jalon à regarder), sans résoudre l'enquête à la place du joueur. Son histoire est dans `lore.md`.

### 7. Classement
Classement « **étage maximum atteint** », en cas d'égalité le joueur arrivé le premier.

### 8. Modèle de données (ajouts)
- **TowerProgress** : `userId`, `maxFloor`, `updatedAt`
- **TowerAttempt** : `id`, `userId`, `floor`, `team` (JSON, instantané), `result` (JSON du combat pour le replay), `won`, `createdAt`
- **TowerFloorClaim** : `userId`, `floor`, `claimedAt` (une récompense par étage, passage conditionnel)
- **TowerBoss** : définitions dans le code (jalons : personnage, trait, lore)

### 9. Critères pour dire que l'étape 7 est finie
- [ ] `scripts/simulate-tower.ts` affiche le taux de victoire par étage pour trois équipes types : l'équipe R bloque vers les étages 40–60, l'équipe SSR vers 200–300, l'équipe UR doit avoir le bon type et éviter le trait du boss pour passer l'étage 400.
- [ ] Les étages sont les mêmes pour tous les joueurs et le replay correspond au combat calculé.
- [ ] Les récompenses ne sont versées qu'une fois par étage, même en cas de double clic.
- [ ] Les 3 tentatives par jour sont comptées côté serveur.
- [ ] La stat « Puissance » est renommée « Popularité » dans l'interface.

### 10. Questions ouvertes
- Effets exacts des 5 sorts de type et des sorts génériques SSR / UR.
- Liste des 10 premiers jalons et leurs traits (AniList n'indique pas qui est un méchant : choix à la main).
- Durée d'un combat : une habitude quotidienne ou une corvée ?
- Cause du dérèglement, origine de Pew, nature de l'étage 500 (voir `lore.md`).
