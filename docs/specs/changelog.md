# Historique et annonce des mises à jour

Demande du 13 novembre 2026 : un onglet Changelog pour toutes les versions et une annonce à l'arrivée dans le jeu lorsqu'une nouvelle version est disponible.

## Parcours prévu

- Lien « Changelog » dans la navigation principale, sur ordinateur et mobile, vers `/changelog`.
- Historique des cinq versions actuellement documentées, dernière version sélectionnée par défaut. Choisir une ancienne version affiche ses notes ; la liste devient horizontale sur téléphone.
- Source unique : `CHANGELOG.md`. Les sections de déploiement et de migration restent dans le document technique, hors de la lecture destinée aux joueurs.
- Une fenêtre affiche les notes de la dernière version au joueur connecté qui ne l'a pas encore lue. « Fermer », Échap et « C'est lu, jouer » mémorisent la lecture pour cette version, sur son compte ; « Toutes les mises à jour » ouvre l'historique et mémorise aussi la lecture.
- La fermeture persiste après rechargement et sur les autres appareils du compte. Une nouvelle version du changelog déclenche une nouvelle annonce.
- Ne pas superposer l'annonce à un combat en cours ou au tutoriel ; conserver l'accès permanent à l'historique.

## Intégration

Lecture et découpage des notes côté serveur, cache partagé et inclusion de `CHANGELOG.md` dans les traces de déploiement. Rendu React sans HTML brut du document. Champ nullable `User.lastReadChangelogVersion` et action authentifiée pour l'acquittement ; migration additive `20261113020000_changelog_read`, à appliquer sur chaque base avant de publier le code. La mise à jour est conditionnelle pour empêcher un ancien onglet de faire reculer la lecture. Les échecs d'enregistrement laissent l'annonce ouverte avec une erreur lisible et une nouvelle tentative possible. Aucune modification du tag v0.3.0 existant.

## Maquette

`docs/maquettes/changelog.html` : HTML autonome, logo et polices du jeu intégrés, palette et mesures reprises de `docs/direction-artistique.md`. Les boutons en haut permettent de voir l'historique et la fenêtre d'arrivée. Les notes sont celles du changelog actuel ; la maquette ne lit ni ne modifie de données joueur.

Statut : maquette validée par l'utilisateur (« je valide ») le 13 novembre 2026 ; intégration autorisée. La route et l'annonce reprennent les composants de la maquette et les contrôles partagés du jeu.
