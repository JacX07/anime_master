# Anime Masters — Collection et tirage

[← Index des specs](README.md)

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
