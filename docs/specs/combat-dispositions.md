# Dispositions du combat — propositions du 13 novembre 2026

Statut : variante A validée et intégrée le 13 novembre 2026. B reste une proposition non retenue.

Maquette autonome : `docs/maquettes/combat-dispositions.html`. Palette, polices, portraits, icônes et fond de la citadelle repris des assets du jeu.

## A — Sorts sous le plateau (recommandée)

- Plateau sur toute la largeur, équipes en deux diagonales opposées, espace central pour l'action.
- Ordre des huit personnages dans une bande horizontale sous le titre et le compteur de tours.
- Portraits avec nom, rareté, effet, PV et jauge ; sélection et cible distinctes.
- Résumé du personnage puis quatre sorts sur une ligne : attaque de base, secondaire, tertiaire et ultime, chacun avec cible, recharge ou jauge.
- Une seule description développée, celle du sort sélectionné. Effets et statistiques dépliables.
- Commandes regroupées sous les sorts : lecture/pause, tour suivant, vitesse, manuel/auto, effets, sons, musique, abandon.

## B — Panneau latéral compact

- Même formation ; panneau des sorts de 265 px sur grand écran, quatre actions empilées et description sélectionnée.
- Le panneau suit sa hauteur de contenu ; aucune réserve verticale pour le tableau des statistiques fermé.
- Sur téléphone, le panneau passe sous le plateau, avec deux sorts par ligne, comme A.

## Téléphone et interactions

- Référence mobile corrigée par l’utilisateur après la proposition : ennemis en diagonale en haut à droite, alliés en diagonale en bas à gauche. Le centre reste ouvert ; les PV sont alignés à gauche pour rester visibles malgré le chevauchement des portraits.
- Choix A/B et aperçu PC/mobile interactifs ; sélection d'allié, de sort puis de cible, détails dépliables, vitesse, modes et résultat de démonstration.
- Valeurs et résultat illustratifs ; aucun appel serveur ni effet sur un compte. Pas de persistance des commandes du prototype.
- La maquette se consulte par défilement. Dans le lecteur intégré, l’arène utilise la hauteur restante, les sorts et commandes restent dans la fenêtre ; les détails défilent dans leur propre panneau.

Vérifications : Chromium à 1600, 728, 390 et 320 px, deux variantes ; images chargées, cartes contenues dans le plateau, absence de débordement horizontal, interactions et fermeture des détails par Échap. Inspection visuelle PC et téléphone.

## Révision du 13 novembre 2026 (soir) — proposition, à valider

Maquette : `public/mockups/combat-face-a-face.html` (interactive, trois dispositions).

Demandes du joueur : la croix tout en haut ; l'ordre de combat sous le titre ; la barre de sorts tout en bas, les commandes (auto, vitesse…) juste au-dessus ; mieux utiliser la largeur ; plus aucune carte superposée, la perspective doit suffire à montrer que les équipes se font face ; valable sur tous les écrans.

Zones, de haut en bas : bandeau (titre, tour, « À toi », croix à droite) · ordre de combat · arène · commandes · sorts.

Formation : chaque carte a un emplacement calculé (centre et taille en part de l'arène), l'ennemi est le miroir de l'allié. Les emplacements garantissent qu'aucune carte n'en touche une autre ; la taille des cartes est bornée par la largeur et par la hauteur de l'arène. Les cartes sont inclinées vers le centre (rotation 3D), en paysage comme en portrait (alliés en bas, ennemis en haut).

- **D · Diagonales `\ \`** (ajoutée à la demande du joueur) : les deux camps sur deux diagonales parallèles, comme la disposition précédente, mais sans superposition ; la carte du bas, plus proche, est plus grande. L'ennemi n'est pas le miroir de l'allié. En portrait : ennemis en diagonale en haut, alliés en diagonale en bas.
- **A · Lignes en V** : quatre cartes par camp sur une ligne qui s'enfonce (les cartes du fond plus petites et plus hautes). Utilise 85 à 98 % de la largeur du 16:9 à l'ultra-large.
- **B · Deux rangs** : deux colonnes de deux par camp, premier rang plus grand. Plus grandes cartes sur écran 16:10 ou tablette, mais marges latérales sur écran très large.
- **C · Lignes droites** : quatre cartes de même taille alignées, inclinées vers le centre.

Vérifié dans Chromium, 4 dispositions × 9 tailles (320×568 à 3440×950) : aucun chevauchement, aucune carte hors de l'arène, zones dans l'ordre demandé, sorts collés au bas de l'écran, pas de défilement horizontal.

## Décision du 13 novembre 2026 (soir) — codée

Le joueur garde les **diagonales parallèles sur toute la largeur** (l'état d'avant le plafonnement 9:5), avec les nouvelles zones.

- Zones, de haut en bas : bandeau (titre, tour, action en cours, croix à droite) · ordre de combat · arène · commandes · sorts. Le bandeau est sorti du plateau (`BattlePlayer.tsx`) pour passer au-dessus de l'ordre.
- Formation : pas horizontal de 10 % par carte, largeur de carte `min(9.4cqw, 27cqh, 260px)` : une carte n'est jamais plus large que le pas, donc aucune superposition. La formation occupe toute la largeur jusqu'au ratio 3,6:1 ; au-delà (ultra-large) elle reste centrée.
- Arène plus haute que large (ratio ≤ 6:5, requête de conteneur) : ennemis en diagonale en haut, alliés en diagonale en bas, une colonne par carte.
- Vérifié dans le jeu (`/combat/test`) de 320×568 à 3440×950 : aucun chevauchement, aucune carte hors de l'arène, zones dans l'ordre, croix en haut à droite, pas de défilement horizontal.
