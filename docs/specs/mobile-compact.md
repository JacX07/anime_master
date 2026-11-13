# Mobile : énergie, collection et inventaire compacts

Demande du 13 novembre 2026. Statut : maquette prête, accord visuel attendu avant intégration.

## Périmètre

- Retirer le logo Anima Clash de l'en-tête complet et de la mini-barre, sur PC et téléphone. Conserver un accès à l'accueil dans la navigation.
- Afficher clairement l'énergie sur téléphone : libellé, réserve sur 20 et délai de recharge visibles sans ouvrir le profil. Réutiliser les calculs et règles d'énergie existants.
- Collection mobile : trois cartes par ligne, portraits plus petits, noms et raretés lisibles ; conserver l'accès aux fiches et à tous les filtres. Regrouper les filtres pour remonter les cartes dans l'écran.
- Inventaire : cases carrées homogènes pour les ressources, armes et artefacts ; quatre colonnes sur téléphone, quantité ou niveau dans un coin. Détails et actions complets au toucher. Conserver filtres, équipement, amélioration et confirmation du recyclage.
- Ajouter les trois images DBZ aux décors de combat de cet univers : Namek, tournoi des arts martiaux et Enfer.
- Illustrer les quatre emplacements des sets Fairy Tail et Bleach avec les huit images fournies.

## Maquette

`docs/maquettes/mobile-compact.html`, autonome et interactive : onglets Inventaire, Personnages et Fonds DBZ. Valeurs de compte, niveaux et éveils fictifs, explicitement signalés ; portraits existants et images fournies par l'utilisateur. Aucun état de compte modifié.

Palette et polices reprises de `docs/direction-artistique.md`. Les choix de densité restent à valider avant de mettre à jour cette référence. Les onglets de démonstration ne constituent pas une nouvelle navigation à ajouter au jeu.

Les images préparées se trouvent dans `docs/maquettes/mobile-assets/` : WebP, largeur maximale de 320 px pour les équipements, 1600 px pour les fonds, sans agrandissement. Les originaux restent dans les pièces jointes du fil. Les fichiers seront déplacés vers les chemins publics appropriés à l'intégration.

## Validation

Maquette vérifiée dans Chromium à 390, 768 et 1440 px : colonnes attendues, absence de débordement horizontal, recherche et état vide, filtre Bleach, ouverture des détails et fermeture par Échap, trois décors chargés. Aucun échec de chargement d'image ni erreur JavaScript.

Le parcours sur le vrai jeu, la recharge effective et la persistance des opérations d'inventaire restent à vérifier après intégration. Le site existant a seulement été consulté pour relever l'état initial.
