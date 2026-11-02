# Anime Masters — Donjons, artefacts, boss mondial, armes légendaires

[← Index des specs](README.md)

*(Discuté et décidé dans ses grandes lignes le 2026-10-31. Rien n'est codé. Les chiffres sont à fixer au simulateur.)*

## Vue d'ensemble

Nouvelle boucle de **montée en puissance** autour de l'équipement. Les modes se répartissent ainsi :

| Mode | Ce qu'on y vient chercher |
|---|---|
| Histoire | Ressources d'éveil (étoiles 1 à 3) |
| Raid (boss hebdomadaire, [pvm.md](pvm.md)) | Cœurs de brèche (étoiles 4 et 5) et **boosters de matériaux d'arme** |
| **Donjons** | **Artefacts** (casque, plastron, gants, bottes) et matériaux d'arme de haut niveau |
| **Boss mondial** | Le matériau clé de l'arme légendaire, une fois par jour |
| Tour multiverselle | Classement, sans gain de puissance |

Le raid et le boss mondial sont **deux modes séparés**. Tous utilisent le moteur de [combat.md](combat.md).

## Changement de cap : vrai « power creep »

*(Décidé le 2026-10-31, remplace deux règles antérieures.)*
- Les artefacts donnent de **vraies stats**, grosses, pour que la montée en puissance se sente. L'ancienne règle « jamais de stats brutes » ([pvm.md](pvm.md), Tour §5) est **abandonnée**.
- La règle « un SSR éveillé et armé doit perdre contre un UR nu » ([combat.md](combat.md), Progression §1) est **assouplie** : un SSR bien équipé pourra battre un UR peu équipé. Restent à vérifier au simulateur : à équipement égal, la rareté domine ; un joueur sans équipement n'est pas bloqué dans l'histoire.
- Conséquence : toutes les difficultés (histoire, raid, tour, expéditions) sont à **recalibrer** une fois les plafonds de stats fixés.

## Artefacts

### Emplacements et stats
Quatre emplacements *(confirmé le 2026-11-01)*. Le système suit celui des **reliques de Honkai: Star Rail** : une stat principale et des sous-stats qui montent au fil des niveaux.

| Emplacement | Stat principale |
|---|---|
| Casque | % PV, % DEF ou % ATK |
| Plastron | % PV, % DEF ou % ATK |
| Gants | Chance de critique, dégâts critiques, ATK/DEF/PV plats ou ATK/DEF/PV % (huit choix équiprobables) |
| Bottes | **Vitesse** |

- Les % s'appliquent aux stats de base de la carte, comme les bonus actuels.
- La stat principale monte avec la **rareté** et le **niveau** de la pièce.

### Sous-stats et amélioration *(à la Honkai: Star Rail, décidé le 2026-11-01 ; chiffres de départ à fixer au simulateur)*
- **Sous-stats possibles** (jamais la même que la stat principale) : % PV, % ATK, % DEF, PV / ATK / DEF plats, vitesse plate, chance de critique, dégâts critiques, esquive.
- **À la création**, selon la rareté : N 0 sous-stat, R 0 à 1, SR 1, SSR 1 à 2, UR 2 à 3. Chaque sous-stat est tirée avec une valeur « faible / moyenne / forte » (environ 80 / 90 / 100 % du maximum).
- **Niveaux** : N 0 à 3, R 0 à 6, SR 0 à 9, SSR 0 à 12, UR 0 à 15. Tous les **3 niveaux**, la pièce **ajoute une sous-stat** (jusqu'à 4) ou **renforce l'une des existantes** d'un tirage. La stat principale monte à chaque niveau.
- **Ressource d'amélioration** : les pièces en trop, recyclées (aucune pièce inutile).
- **Pas de plafond de puissance voulu** : la limite vient de la rareté, du niveau maximum et du tirage des sous-stats. Ordre de grandeur d'une pièce UR niveau 15, pour viser une montée forte comme Honkai : % PV / % ATK ≈ +43 %, % DEF ≈ +54 %, chance de critique ≈ +32 points, dégâts critiques ≈ +65 points, vitesse ≈ +25. À ajuster au simulateur, avec les difficultés recalibrées derrière.
- Une pièce est **liée au compte**, non échangeable, mais équipable sur n'importe quelle carte et déplaçable librement (pas de second marché de puissance).

### Raretés et niveaux
- Cinq raretés d'artefact : N, R, SR, SSR, UR.
- Une pièce s'**améliore** avec des ressources (niveau 0 à N, plafond selon la rareté). Les doublons s'**échangent contre ces ressources** : aucune pièce n'est inutile.

### Sets
- **Un set par univers de l'histoire**, thématique (nom et bonus tirés de l'univers). Univers de départ : One Piece, Naruto, Jujutsu Kaisen ; les autres suivent la chaîne des univers ([pvm.md](pvm.md)).
- Bonus de set : **2 pièces** (petit bonus), **4 pièces** (gros bonus, parfois un effet de combat).
- Le bonus à 4 pièces **remplace** celui à 2 pièces (il ne s'y ajoute pas), comme le barème actuel de `setBonus`.
- **Bonus validés le 2026-11-01** (les % d'esquive, de critique et de vitesse sont des **points**, ajoutés à la stat ; l'esquive totale est plafonnée à 60 %, voir [combat.md](combat.md)) :

| Set | 2 pièces | 4 pièces |
|---|---|---|
| One Piece | +5 % ATK | +10 % ATK, +15 points de chance de critique |
| Naruto | +5 points d'esquive | +10 points d'esquive, +15 % de vitesse |
| Jujutsu Kaisen | +5 % de dégâts magiques | +15 % de dégâts magiques ; chaque sort actif charge **50** points d'ultime au lieu de 34 |
| Dragon Ball Z | +10 % de dégâts physiques, +10 % DEF | +20 % de dégâts physiques, +20 % DEF |
| Bleach | +25 % de dégâts de saignement | +40 % de dégâts de saignement ; **précision** : les attaques ne peuvent plus être esquivées |

- Le bonus de saignement de Bleach ne s'applique que sur le saignement infligé par un porteur de sabre/épée (seuls eux en infligent, voir [combat.md](combat.md) §4 septies).
- Les bonus « physique » et « magique » exigent un **type de dégâts** par carte : voir [combat.md](combat.md) §4 septies, « À trancher ».
- Remplace l'ancien barème unique (+5 % ATK à 2 pièces, +10 % ATK et +15 % dégâts critiques à 4) ; les pièces sans set connu gardent l'ancien barème tant que les sets de Naruto, JJK, DBZ et Bleach n'existent pas.

## Donjons

- **Plusieurs donjons**, un par set (donc par univers de l'histoire). Un donjon = **un boss unique, difficile**, avec ses sbires (moteur 4 contre 4, boss géant).
- **10 niveaux de difficulté** par donjon, débloqués un par un. Les niveaux montent la force du boss et la **rareté des artefacts** : 2 niveaux par rareté (niv. 1–2 N, 3–4 R, 5–6 SR, 7–8 SSR, 9–10 UR).
- **Butin** d'une victoire : exactement une pièce du set du donjon. Casque, plastron, gants et bottes ont chacun 25 % de chances ; aucun cycle ni garantie d'obtenir chaque emplacement en quatre victoires. Le tirage est déterministe par graine de combat, avec flux séparés pour l'emplacement, la stat principale et les sous-stats. Les niveaux élevés lâchent aussi des **matériaux d'arme légendaire**.
- Gants : huit stats principales à 12,5 % chacune : critique, dégâts critiques, ATK/DEF/PV plats et ATK/DEF/PV %. Les flats sont l'équivalent arrondi des stats moyennes de base multipliées par le taux principal en % de même rareté. Valeurs N/R/SR/SSR/UR : ATK +20/+57/+140/+333/+653, DEF +16/+45/+107/+249/+436, PV +101/+285/+692/+1 628/+3 049. Les valeurs en % utilisent les tables déjà appliquées au casque/plastron : 2,5/4/6,5/11/16 %. Critique et dégâts critiques gardent leurs tables existantes : 3/5/8/12/16 % et 5/10/17/26/36 %.
- **Illimité avec plafond quotidien doux**, comme l'histoire : au-delà du seuil, les gains continuent à taux réduit ([pvm.md](pvm.md), « Rejouer et farmer »). Source `DUNGEON` dans `DailyGain`.
- Lots de combats automatiques et manuel disponibles, comme l'histoire. Défaite sans pénalité.

## Boss mondial

- **Un boss par jour**, le même pour tous (graine = jour), **solo** pour l'instant.
- **Une victoire récompensée par jour** : elle donne le **matériau clé** de l'arme légendaire, en quantité fixe (déterministe, pas de chance). Les tentatives restent libres ; une défaite donne un petit lot proportionnel aux dégâts (on ne repart jamais les mains vides).
- Le PvM communautaire (PV partagés, classement des contributions) viendra plus tard.

## Raid et boosters

- Le raid garde son rôle (cœurs de brèche).
- Il peut en plus lâcher des **boosters de matériaux d'arme** : un paquet dédié qui, une fois ouvert, donne des matériaux de fabrication au hasard. Taux et contenu : à fixer.

## Arme légendaire

- Réservée aux cartes **éveillées à 5 étoiles**.
- **Fabriquée** avec : matériaux du boss mondial (une quantité par jour), matériaux de donjons hauts niveaux, matériaux de boosters du raid, et ressources d'arme des boss finaux de l'histoire.
- **Boost non négligeable** : plus que le +5 % actuel (ordre de grandeur +10 % de stats) plus un **passif fort**. À fixer au simulateur.
- **Objectif de rythme** : environ 3 à 4 semaines pour un joueur régulier, sans hasard bloquant (fangame gratuit : jouer assez suffit toujours).
- **Armes génériques d'abord**, une par type d'affinité (passifs déjà testés : esquive, renfort de type). Des **armes dédiées à des personnages précis** s'ajouteront peu à peu.

## Questions ouvertes

1. **Vitesse** : jauge d'action, sans plafond, vitesse de base 90 à 110 par personnage : décidé, voir [combat.md](combat.md). À écrire : la valeur de chaque SSR/UR, la compensation du second joueur, la durée maximale d'un combat. Touche le moteur, les rejeux et toutes les simulations.
2. **Valeurs exactes** des stats principales et sous-stats par rareté, et bonus de set : à fixer au simulateur.
3. Noms des boss de donjon, du boss mondial, des sets.

## Modèle de données *(proposé)*

- `Artifact` : joueur, set (clé d'univers), emplacement, rareté, niveau, stat principale et valeur, sous-stats (JSON), carte équipée (nullable), verrou.
- `DungeonProgress` : joueur, donjon, plus haut niveau gagné (1 à 10). L'ancien champ `nextSlot` peut rester en base mais n'est plus lu ni mis à jour.
- `ResourceStock` existe déjà pour les matériaux d'arme et d'amélioration.
- `WorldBossDaily` : joueur, jour, victoire récompensée ou non.
- `Battle.mode` : ajouter `DUNGEON` et `WORLD_BOSS`.
- Définitions (donjons, sets, armes, boss) dans le code, comme les univers.
- Moteur : `BattleCard` reçoit ses artefacts et son arme ; la vitesse dépend de la décision n° 2 ci-dessus.

### Forge disponible (2026-11-01)

La page `/forge` fabrique et équipe directement une arme générique du type de la carte, à 5★. Une seule arme par exemplaire ; elle suit la carte dans les échanges et ne peut pas être détachée. Une carte armée ne sert pas de doublon d'éveil. Les cartes en enchère, expédition ou échange en attente sont exclues de la forge.

Recette provisoire tant que les donjons et le boss mondial ne sont pas disponibles : **20 ressources de boss final de l'histoire**, tous univers confondus (consommées dans l'ordre des univers), et **50 cœurs de brèche**. Le débit et l'équipement sont atomiques. Bonus : +10 % ATK, DEF et PV ; renfort +10 % ATK pour le type du porteur, ou esquive 15 % pour MYSTERE.

### Équipement depuis l’équipe et amélioration (2026-11-01)

Le portrait d’une carte ouvre son équipement : quatre emplacements d’artefacts (casque, plastron, gants, bottes) et l’arme liée à l’exemplaire. Un clic sur un emplacement affiche uniquement les objets de ce type, avec leurs boutons Équiper/Retirer et Améliorer. Les ressources et consommables restent dans l’inventaire général.

Une amélioration garantie monte un artefact de +0 à +10, sans destruction ni changement de sous-stats. Chaque niveau ajoute 5 % de la valeur initiale de la stat principale (+50 % à +10). Le coût provisoire pour passer au niveau suivant est `(niveau actuel + 1) × base` : base 100/150/200/300/400 Ryō pour les grades N/R/SR/SSR/UR existants. Débit, niveau et journal `ARTIFACT_UPGRADE` sont transactionnels ; un niveau attendu empêche le double clic de payer deux améliorations.

Palette des artefacts : Commun gris `#a7b4c9`, Rare bleu `#65b9ff`, Épique violet `#b68bff`, Légendaire or `#ffc45c`. Les anciens grades SSR et UR sont regroupés visuellement sous Légendaire ; leurs valeurs et leurs coûts sont conservés. Les raretés des cartes ne changent pas. Les nouvelles directions d’illustrations anime sont soumises au choix du joueur avant remplacement des images existantes.

### Donjons par univers (2026-11-01)

Les cinq sets ont chacun un donjon accessible depuis `/donjons` : One Piece (Trône des profondeurs), Naruto (Sanctuaire du Sharingan, Madara), Jujutsu Kaisen (Sanctuaire malveillant, Sukuna), Dragon Ball (Forteresse de Freeza) et Bleach (Palais du Hueco Mundo, Aizen).
Chaque donjon possède dix difficultés, une progression indépendante et un artefact de son propre set par victoire. Les mécaniques de palier conservent les mêmes valeurs, avec des noms propres à l'univers. Les nouveaux boss utilisent le budget de statistiques UR pour éviter qu'une faible rareté de collection réduise leur difficulté. À partir du niveau 7, les quatre nouveaux donjons donnent le matériau de forge de leur univers ; One Piece conserve les Éclats du Trône existants. L'accès global aux donjons reste soumis à la progression d'aventure.
