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
