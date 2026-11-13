# Mobile : énergie, collection et inventaire compacts

Demande du 13 novembre 2026. Maquette validée par « oui c mieux ». Interface intégrée ; vérifications sur le build de production local réalisées avant commit.

## Périmètre

- Retirer le logo Anima Clash de l'en-tête complet et de la mini-barre, sur PC et téléphone. Conserver un accès à l'accueil dans la navigation.
- Afficher clairement l'énergie sur téléphone : libellé, réserve sur 20 et délai de recharge visibles sans ouvrir le profil. Réutiliser les calculs et règles d'énergie existants.
- Collection mobile : trois cartes par ligne, portraits plus petits, noms et raretés lisibles ; conserver l'accès aux fiches et à tous les filtres. Regrouper les filtres pour remonter les cartes dans l'écran.
- Inventaire : cases carrées homogènes pour les ressources, armes et artefacts ; quatre colonnes sur téléphone, quantité ou niveau dans un coin. Détails et actions complets au toucher. Conserver filtres, équipement, amélioration et confirmation du recyclage.
- Ajouter les trois images DBZ aux décors de combat de cet univers : Namek, tournoi des arts martiaux et Enfer.
- Nouvelle demande du 13 novembre : l'image d'arène de la citadelle remplace ensuite les décors dans tous les combats, DBZ compris. Le fond est appliqué directement au lecteur partagé, sans condition par mode ou univers.
- Illustrer les quatre emplacements des sets Fairy Tail et Bleach avec les huit images fournies.

## Maquette

`docs/maquettes/mobile-compact.html`, autonome et interactive : onglets Inventaire, Personnages et Fonds DBZ. Valeurs de compte, niveaux et éveils fictifs, explicitement signalés ; portraits existants et images fournies par l'utilisateur. Aucun état de compte modifié.

Palette et polices reprises de `docs/direction-artistique.md`. Les choix validés sont reportés aux sections 4.10 et 4.25 de cette référence. Les onglets de démonstration ne constituent pas une nouvelle navigation à ajouter au jeu.

Les images préparées se trouvent dans `docs/maquettes/mobile-assets/` : WebP, largeur maximale de 320 px pour les équipements, 1600 px pour les fonds, sans agrandissement. Les originaux restent dans les pièces jointes du fil. Les images livrées sont dans `public/images/artifacts/sets/{fairy-tail,bleach}/` et `public/images/battle/dragon-ball/`.

## Validation

Maquette vérifiée dans Chromium à 390, 768 et 1440 px : colonnes attendues, absence de débordement horizontal, recherche et état vide, filtre Bleach, ouverture des détails et fermeture par Échap, trois décors chargés. Aucun échec de chargement d'image ni erreur JavaScript.

Intégration vérifiée dans Chromium sur le build de production local, avec un compte temporaire dédié : inventaire carré à 320, 390, 768, 1440 et 1600 px, huit illustrations chargées, équipement et amélioration persistants après rechargement, erreur réseau suivie d'une nouvelle tentative, filtre et recherche vide. Collection à trois colonnes, filtres conservés dans l'URL après rechargement et état vide. Compteur d'énergie : délai visible et gain sans rechargement vérifiés avec l'horloge navigateur ; règles serveur inchangées. Navigation PC sans chevauchement avec le compte.

Les trois fonds ont été vérifiés en vrais combats manuels d'histoire DBZ (niveaux 1, 6, 11) et de donjon (difficultés 1, 4, 7), puis sortie du combat. Vues téléphone et PC pour Namek ; plateau habituel vérifié dans un combat One Piece. Aucun combat nécessaire sur un compte joueur existant. Aucune migration ni publication en production.
