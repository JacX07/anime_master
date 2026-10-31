# Anime Masters — Combat

[← Index des specs](README.md)

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

> **Ultimes désactivés pour le moment** (décidé le 2026-10-31) : ils reviendront avec les ultimes écrits par anime.

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
- Budget d'équipe et son plafond : à mettre en place plus tard.
- Mode manuel *(décidé le 2026-10-31)* : à chaque action, le joueur choisit **le sort** (base ou affilié s'il est prêt) **et la cible**. En automatique, la cible reste l'ennemi le plus faible.
- Écriture des ultimes par anime et des ultimes personnels des UR ; sorts spéciaux en plus pour les UR.
- Combat contre Mystère reste un peu fort (86 % contre ~70 % pour les autres paires du cycle) : à réduire si besoin, par exemple en baissant la pénétration de DEF de Combat contre Mystère.
- Modèle de données, pages, migration du duel quiz existant.
- L'arène est décrite dans [pvp.md](pvp.md), les modes PvM dans [pvm.md](pvm.md).

---

## Progression des cartes *(décidé le 2026-10-31, chiffres à fixer au simulateur)*

### 1. Règle de puissance
Tout ce qui rend une carte plus forte, avec une limite pour chaque source. Le combat amplifie les écarts : un SSR a ~38 % de stats de plus qu'un SR, mais 4 SSR battent 4 SR 99,9 % du temps. L'écart moyen SSR → UR n'est que de ~31 %. Les bonus de progression doivent donc rester petits.

| Source | Ce qu'elle apporte | Limite |
|---|---|---|
| Rareté | L'écart de départ | **Un UR domine un SSR** : c'est voulu |
| Synergies | Franchise (+3 / 6 / 10 %), passif UR (+10 % par UR, 30 % max) | Valeurs actuelles jugées bonnes ; sorts spéciaux à ajouter pour les UR |
| Éveil (0 à 5 étoiles) | Stats et réduction de cooldown | Jamais assez pour battre la rareté du dessus |
| Arme légendaire | Stats et un passif spécial | Comptée avec l'éveil dans la limite |

**Test automatique** (dans `npm run simulate:battle`) : un SSR éveillé 5 étoiles avec une arme légendaire doit perdre contre un UR à 0 étoile sans arme. Un éveil 5 étoiles doit valoir moins d'un demi-cran de rareté.

### 2. Éveil
- De 0 à 5 étoiles, sur la carte du joueur (l'exemplaire, pas le personnage).
- Chaque étoile ajoute des stats et réduit le cooldown du sort affilié. Montants à tester au simulateur.
- **Coût** : étoiles 1 à 3 = ressource du mode histoire ; étoiles 4 et 5 = ressource rare du raid **et un seul doublon** du personnage. Un doublon consommé ne circule plus : en demander davantage ferait de la Bourse un marché de puissance.
- À 5 étoiles, la carte peut équiper une **arme légendaire**.

### 3. Arme légendaire
- Équipable uniquement sur une carte éveillée 5 étoiles.
- **Fabriquée** à partir des ressources obtenues en jeu, et **difficile** à obtenir.
- Apporte des stats et un **passif un peu spécial**. Exemples : 3 % de chance d'esquiver un sort, renforcement d'un type.
- Liste des armes, recettes et passifs : à écrire.

### 4. Rythme
Fangame gratuit, sans frustration : en jouant assez, on finit toujours par obtenir ce qu'on veut. Le rythme et le tableau des ressources (ce que chaque mode donne, et combien par jour) restent à retravailler.
