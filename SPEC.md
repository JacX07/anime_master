# Anime Masters — Spécifications

Jeu de cartes à collectionner de personnages d'anime, inspiré de WikiMasters.

## MVP (validé)
Objectif : ouvrir des paquets et voir sa collection, en local.

- **Étape 1** complète, sauf : reprise de l'import page par page, table `ImportRun` (résumé dans la console), `attributes`, `descriptionFr`.
- **Étape 2** minimale : comptes, paquets (recharge, stock, bienvenue), tirage complet (taux, finitions, carte garantie, pity SSR/UR, numéros d'exemplaire), ouverture (retournement, Holo/Gold, « NOUVEAU »), album (filtres rareté / type, recherche, doublons), fiche perso, script de simulation des taux.
- **Repoussé** : lueur de rareté au dos des cartes, progression par série, indicateurs de finition, filtre par série, page `/profile`, étapes 3 à 6.

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
- **Types** : 5 types tirés des genres de l'anime, chacun avec un atout et un défaut (voir §5 ter). Version initiale, susceptible d'évoluer.
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

**Media** : `id`, `titleRomaji`, `titleEnglish`, `titleNative`, `format`, `year`, `coverUrl`, `popularity`, `genres`, `studio`

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
Propriété du **personnage**, calculée à l'import à partir des genres de sa **série principale**.

| Type | Genres AniList | Style | ✅ Atout | ❌ Défaut |
|---|---|---|---|---|
| 🔥 Combat | Action, Sports, Mecha | Tout ou rien | **Coup critique** : dégâts ×2 si le défenseur rate toutes les questions | DEF −25 % |
| 🔮 Mystère | Mystery, Psychological, Thriller, Horror | Pression | **Fausse piste** : le défenseur a 5 choix au lieu de 4 et moins de temps | ATK −25 % |
| ✨ Magie | Fantasy, Supernatural, Mahou Shoujo | Vampire | **Drain** : récupère 30 % des dégâts infligés en PV (sans dépasser les PV de départ) | ATK −15 % |
| 💗 Cœur | Romance, Drama, Slice of Life, Music, Comedy, Ecchi | Tank et soutien | **Lien** : DEF comptée ×1,3 dans les PV, +10 % ATK aux autres cartes de l'équipe | ATK −30 % |
| 🧭 Aventure | Adventure, Sci-Fi | Régulier | **Persévérance** : inflige au moins 25 % de son ATK même sans erreur adverse | **Plafond** : jamais plus de 75 % de son ATK |

**Série principale** : la série de type ANIME la plus populaire où le personnage a le rôle MAIN ; à défaut, la plus populaire tous rôles confondus.

**Règle d'attribution :**
1. Compter, pour chaque type, le nombre de genres de la série principale qui lui appartiennent.
2. Le type avec le plus de genres l'emporte.
3. En cas d'égalité, ordre de priorité : Aventure > Mystère > Magie > Cœur > Combat (les types aux genres les plus spécifiques passent en premier).
4. Aucun genre reconnu → Cœur par défaut.

**Notes :**
- Les chiffres (−25 %, ×1,3…) sont indicatifs et seront équilibrés à l'étape « duels ». L'étape 1 ne stocke que le type.
- Pas de cycle « fort contre » au départ ; à réévaluer après des tests.
- Après le premier import, vérifier la répartition des types. Si Aventure est sous-représenté, ajuster l'ordre de priorité.
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

**2. Répartition ATK / DEF**
| Rôle dans la série principale | Part ATK | Part DEF |
|---|---|---|
| MAIN | 60 % | 40 % |
| SUPPORTING / BACKGROUND | 45 % | 55 % |

- Variation fixe par personnage : la part d'ATK est décalée de ±5 points (donc environ ±10 % sur chaque stat), selon une valeur pseudo-aléatoire dérivée de l'id AniList.
- La variation porte sur la répartition, pas sur la puissance totale : les plages des raretés restent disjointes.
- `ATK = round(puissance × partATK, 10)`, `DEF = puissance − ATK`.

**Exemple :** Gojo, UR, MAIN, le plus favori → puissance 8 000 → ATK ≈ 4 800 / DEF ≈ 3 200 (± variation).

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

**Temps moyen pour un premier UR** (pour référence) : ~7 h pour un joueur qui ouvre tout, ~1 jour pour un joueur régulier, ~4 jours pour un joueur occasionnel. Avec le pity UR, jamais plus de 100 paquets.

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
- **Filtres** : rareté, type, série, finition, possédés ou manquants, recherche par nom.
- **Progression** : complétion globale et par série (« Jujutsu Kaisen : 12/18 »).
- Pagination ou défilement infini (plusieurs milliers de cartes).

### 8. Critères pour dire que l'étape 2 est finie
- [ ] Inscription, connexion et déconnexion fonctionnent ; un nouveau compte reçoit 10 paquets.
- [ ] Un paquet se recharge toutes les 10 minutes, avec un maximum de 10.
- [ ] Chaque paquet contient 5 cartes, dont au moins une R ou mieux.
- [ ] Le pity SSR se déclenche au 15ᵉ paquet sans SSR ou mieux, et le pity UR au 100ᵉ sans UR.
- [ ] Sur 10 000 paquets simulés, les taux observés correspondent à la spec (en tenant compte des garanties).
- [ ] Deux ouvertures simultanées ne consomment pas plus de paquets que disponible.
- [ ] Les numéros d'exemplaire sont uniques et consécutifs par personnage.
- [ ] L'album affiche possédés et manquants, avec filtres et progression par série.

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
- [ ] Le solde de chaque joueur est toujours égal à la somme de son journal, et n'est jamais négatif.
- [ ] La vente rapide respecte les prix ; la vente groupée ne touche ni aux cartes verrouillées, ni aux cartes en échange ou aux enchères, ni au meilleur exemplaire de chaque personnage.
- [ ] Un échange accepté transfère tout ou rien ; une offre devient invalide si un élément n'est plus disponible.
- [ ] Impossible de gagner une enchère sans les Ryō ; l'enchérisseur dépassé est remboursé immédiatement.
- [ ] L'anti-sniping prolonge l'enchère ; la clôture n'a lieu qu'une seule fois.
- [ ] Les limites (5 paquets achetés par jour, 10 offres, 10 enchères, ancienneté du compte) sont respectées.

---

## Étape 4 — Duels, classements, succès

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
Définis dans le code, vérifiés après chaque événement (paquet ouvert, duel terminé, vente aux enchères, échange accepté). Chaque succès ne se débloque qu'une fois et crédite les Ryō dans le journal (`reason = ACHIEVEMENT`).

| Clé | Condition | Ryō |
|---|---|---|
| `first_pack` | Ouvrir son premier paquet | 20 |
| `first_ssr` | Obtenir un premier SSR | 50 |
| `first_ur` | Obtenir un premier UR | 200 |
| `first_holo` | Obtenir une première Holo | 30 |
| `first_gold` | Obtenir une première Gold | 300 |
| `unique_100` / `500` / `1000` / `2500` | Posséder N personnages uniques | 100 / 300 / 800 / 2 000 |
| `series_complete` | Compléter une série (tous ses personnages présents dans la base) — une fois | 150 |
| `all_types` | Posséder au moins un personnage de chaque type | 50 |
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
