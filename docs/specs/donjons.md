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
Quatre emplacements *(trois annoncés au départ, les gants ont été ajoutés ensuite : à confirmer)*.

| Emplacement | Stat principale |
|---|---|
| Casque | % PV, % DEF ou % ATK |
| Plastron | % PV, % DEF ou % ATK |
| Gants | Dégâts critiques ou chance de critique |
| Bottes | **Vitesse** |

- Les % s'appliquent aux stats de base de la carte, comme les bonus actuels.
- La stat principale monte avec la **rareté** et le **niveau** de la pièce.
- Sous-stats (0 à 3 lignes selon la rareté) : à valider, pour donner de la profondeur sans devenir une loterie.
- Une pièce est **liée au compte**, non échangeable, mais équipable sur n'importe quelle carte et déplaçable librement (pas de second marché de puissance).

### Raretés et niveaux
- Cinq raretés d'artefact : N, R, SR, SSR, UR.
- Une pièce s'**améliore** avec des ressources (niveau 0 à N, plafond selon la rareté). Les doublons s'**échangent contre ces ressources** : aucune pièce n'est inutile.

### Sets
- **Un set par univers de l'histoire**, thématique (nom et bonus tirés de l'univers). Univers de départ : One Piece, Naruto, Jujutsu Kaisen ; les autres suivent la chaîne des univers ([pvm.md](pvm.md)).
- Bonus de set : **2 pièces** (petit bonus), **4 pièces** (gros bonus, parfois un effet de combat).
- Bonus exacts : à écrire.

## Donjons

- **Plusieurs donjons**, un par set (donc par univers de l'histoire). Un donjon = **un boss unique, difficile**, avec ses sbires (moteur 4 contre 4, boss géant).
- **10 niveaux de difficulté** par donjon, débloqués un par un. Les niveaux montent la force du boss et la **rareté des artefacts** : 2 niveaux par rareté (niv. 1–2 N, 3–4 R, 5–6 SR, 7–8 SSR, 9–10 UR).
- **Butin** d'une victoire : une pièce du set du donjon, de l'emplacement tiré avec une **pitié** (on ne reste jamais indéfiniment sans l'emplacement manquant). Les niveaux élevés lâchent aussi des **matériaux d'arme légendaire**.
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

1. **Gants** : confirmer les 4 emplacements.
2. **Vitesse** : le moteur n'a pas de stat de vitesse. L'ordre de jeu est aujourd'hui l'alternance par position ([combat.md](combat.md) §3). L'intention est de **changer le tour par tour** pour que la vitesse compte. Pistes : (a) ordre de jeu de tout le champ par vitesse décroissante à chaque tour ; (b) jauge d'action qui se remplit selon la vitesse (comme Honkai Star Rail). Il faut aussi une **vitesse de base** par carte (identique pour tous, ou selon type / rareté) et revoir la compensation du second joueur. Ce changement touche le moteur, les rejeux (`check:replay`) et toutes les simulations : à spécifier à part dans combat.md avant de coder.
3. **Sous-stats** des artefacts : oui ou non, et combien.
4. **Plafonds de stats** : valeurs de montée en puissance voulues (somme équipement + éveil + arme).
5. Noms des boss de donjon, du boss mondial, des sets.

## Modèle de données *(proposé)*

- `Artifact` : joueur, set (clé d'univers), emplacement, rareté, niveau, stat principale et valeur, sous-stats (JSON), carte équipée (nullable), verrou.
- `ArtifactPity` : joueur, donjon, compteur par emplacement.
- `DungeonProgress` : joueur, donjon, plus haut niveau gagné (1 à 10).
- `ResourceStock` existe déjà pour les matériaux d'arme et d'amélioration.
- `WorldBossDaily` : joueur, jour, victoire récompensée ou non.
- `Battle.mode` : ajouter `DUNGEON` et `WORLD_BOSS`.
- Définitions (donjons, sets, armes, boss) dans le code, comme les univers.
- Moteur : `BattleCard` reçoit ses artefacts et son arme ; la vitesse dépend de la décision n° 2 ci-dessus.
