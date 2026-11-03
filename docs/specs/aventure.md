# Quêtes et niveau d’Arpenteur

Le joueur renforce son empreinte en retrouvant les signatures dispersées entre les univers. Le niveau d’Arpenteur est global au compte, de 1 à 50 ; il ne modifie aucune statistique de combat. Les cartes gardent leur éveil et leur équipement.

## Expérience et rangs

Chaque combat d’histoire ne donne de l’XP qu’une fois : 100 + 25 × (rang de l’univers − 1), +100 pour un boss d’acte et +300 supplémentaires pour le boss final. L’histoire seule permet d’atteindre le niveau 50. L’expérience cumulée au niveau L est `100 × (L−1) + 25 × (L−1) × (L−2)`.

Un succès rapporte 75 XP. Des quêtes de découverte récompensent la première équipe complète (100), le premier éveil (150), le premier équipement (150), la première expédition récupérée (150), les paliers de Tour et de donjon (200 chacun), et la première victoire de raid (300). Aucune obtention aléatoire n’est nécessaire aux accès.

Les rangs sont Éveillé (1–10), Traverseur (11–20), Tisseur de liens (21–30), Gardien des brèches (31–40), Arpenteur des mondes (41–50). Chaque rang possède un texte de lore. Chaque niveau à partir de 2 donne automatiquement 25 Ryō, +100 aux niveaux multiples de dix. Les gains sont journalisés comme récompenses d’accomplissement.

## Passages

- Expéditions : niveau 3 et combat 5 de One Piece remporté.
- Donjons : niveau 5 et combat 10 de One Piece remporté.
- Tour : niveau 8 et One Piece terminé.
- Raid : niveau 12 et les deux premiers univers terminés.

L’histoire seule fournit le niveau requis à chacun de ces jalons. Les conditions s’appliquent côté serveur au lancement. Les combats et expéditions déjà commencés restent terminables. Les pages verrouillées expliquent les conditions et renvoient vers les Quêtes.

## Carnet

L’onglet principal Quêtes (`/quetes`) présente le niveau, la barre d’XP, le lore du rang, le prochain passage, trois objectifs disponibles, les quatre modes et le journal filtrable : À suivre, Histoire, Découverte, Succès, Accomplies. Les objectifs futurs restent consultables. Le niveau est également visible dans le menu utilisateur.

**Évolution (en cours de validation visuelle)** : le carnet n’affiche plus que les **quêtes quotidiennes et hebdomadaires**, avec leur progression, leur remise à zéro et un bouton « Récupérer » quand l’objectif est atteint. Les quêtes d’histoire, de découverte et les succès ne sont plus listés dans ce carnet. Leur XP continue d’être calculée et versée automatiquement : niveau, modes et guide restent inchangés. Règles des quêtes périodiques et barème : [economie.md](economie.md), § « Succès et quêtes périodiques ». Les récompenses se réclament (une fois par période) ; les quêtes périodiques ne donnent pas d’XP.

## Historique et sûreté

Les objectifs sont reconstitués depuis les progressions existantes et mémorisés dans `AdventureRecord`. Ils ne se perdent pas si une carte est vendue ou un équipement retiré. Une clé unique compte + objectif empêche de gagner deux fois la même XP ou récompense. L’expérience passée et les récompenses de niveau sont attribuées rétroactivement. Un mode déjà pratiqué reste accessible grâce à un enregistrement permanent d’accès ; une ancienne tentative suffit.

Le service est partagé par les pages et les contrôles serveur. Les récompenses et leurs écritures de journal sont transactionnelles. Vérification : `npm run check:adventure`.
