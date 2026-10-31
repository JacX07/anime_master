# Anime Masters — Personnages

[← Index des specs](README.md)

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
