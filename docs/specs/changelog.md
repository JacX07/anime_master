# Historique et annonce des mises à jour

Demande du 13 novembre 2026 : un onglet Changelog pour toutes les versions et une annonce à l'arrivée dans le jeu lorsqu'une nouvelle version est disponible.

## Parcours prévu

- Lien « Changelog » dans la navigation principale, sur ordinateur et mobile, vers `/changelog`.
- Historique des cinq versions actuellement documentées, dernière version sélectionnée par défaut. Choisir une ancienne version affiche ses notes ; la liste devient horizontale sur téléphone.
- Source unique : `CHANGELOG.md`. Les sections de déploiement et de migration restent dans le document technique, hors de la lecture destinée aux joueurs.
- Une fenêtre affiche les notes de la dernière version au joueur connecté qui ne l'a pas encore lue. « Fermer », Échap et « C'est lu, jouer » mémorisent la lecture pour cette version, sur son compte ; « Toutes les mises à jour » ouvre l'historique et mémorise aussi la lecture.
- La fermeture persiste après rechargement et sur les autres appareils du compte. Une nouvelle version du changelog déclenche une nouvelle annonce.
- Ne pas superposer l'annonce à un combat en cours ou au tutoriel ; conserver l'accès permanent à l'historique.

## Intégration envisagée après validation visuelle

Lecture et découpage des notes côté serveur, rendu React sans HTML brut du document. Champ nullable sur `User` pour la dernière version lue et action authentifiée pour l'acquittement ; migration additive à prévoir. Aucune modification du tag v0.3.0 existant.

## Maquette

`docs/maquettes/changelog.html` : HTML autonome, logo et polices du jeu intégrés, palette et mesures reprises de `docs/direction-artistique.md`. Les boutons en haut permettent de voir l'historique et la fenêtre d'arrivée. Les notes sont celles du changelog actuel ; la maquette ne lit ni ne modifie de données joueur.

Statut : maquette à valider avant intégration du code visuel, conformément à la section 8 de la direction artistique. Aucune route ni annonce automatique n'est encore ajoutée au jeu.
