# Lot 5 — Éveil et progression (v0.3.0)

Décisions validées le 2026-11-10 ; intégration reprise après interruption.

- Chaque étoile : +6 % ATK, DEF et PV. À 2★ : +25 de jauge ultime initiale ; à 3★ : secondaire −1 action de recharge ; à 4★ : +10 points de critique et +20 points de dégâts critiques ; à 5★ : tertiaire −1, arme et bouclier initial de 10 % des PV. Le bouclier se cumule avec celui du second camp.
- SSR et UR, 4★/5★ : mêmes coûts en cœurs (60/120 et 120/240). Doublon facultatif, choisi explicitement, coût en cœurs divisé par deux. Les protections des cartes consommables restent applicables.
- Histoire : 1★ victoire ; 2★ sans aucun K.O. allié ; 3★ sans K.O. et au plus 10 tours. Une victoire avec exactement deux cartes donne une étoile bonus indépendante, même avec un K.O.
- Les étoiles déjà acquises restent acquises. La migration attribue le bonus duo aux anciens scores de 3★. Les récompenses déjà réclamées restent réclamées.
- Récompense supplémentaire par univers : 15 étoiles duo donnent 15 cristaux et 500 Ryō, une seule fois. Les 45 étoiles ordinaires restent séparées.
- Déblocage inchangé : terminer les 15 combats de l’univers précédent. La puissance ennemie suit une courbe continue sur les 225 combats, entre les budgets de début et de fin existants. Le casting et les raretés sont conservés ; ATK et DEF sont ajustées au budget de puissance, vitesse comprise. Le boss conserve son avantage relatif au sein de son équipe. Les affinités et les sorts peuvent rendre un affrontement plus ou moins favorable malgré la puissance croissante.
- Animation et son d’éveil : maquette validée le 2026-11-10, intégration dans la liste et la fiche personnage.

## Validation du 2026-11-10

- Node 24 : build et typecheck réussis ; ESLint ciblé sans erreur. Contrôles combat, éveil, histoire (225 puissances croissantes, butins et parcours manuel), paliers, carte, boss et préparation réussis.
- Navigateur sur le build local, port 3012 : 4★ sans doublon ; 5★ avec doublon et demi-coût ; persistance après rechargement ; victoire duo réelle et résultat 3★ + bonus ; bonus conservé sur la carte ; palier bonus réclamé et conservé après rechargement ; statistiques à 25 % de critique et 170 % de dégâts critiques. Vérifications desktop 1440 px et mobile 390 px, sans débordement de page ni erreur JavaScript.
- Migration duo appliquée sur la base de développement. Aucune publication en production.
- Pas de nouvelle simulation des taux de victoire par univers : la garantie testée porte sur la puissance ennemie, les sorts et affinités gardent leur influence. Animation et son validés ensuite via la maquette ci-dessous.

## Maquette d’animation validée le 2026-11-10

[Éveil interactif](../maquettes/eveil-animation.html) : Roy Mustang SSR, passage 3★ → 4★ ; l’étoile avance d’un cran, éclat ambré bref, trois petits éclats du sprite existant, deux notes métalliques synthétisées. La séquence dure 620 ms. Les nouvelles statistiques restent affichées. Son désactivable, rejeu, interruption par Échap, résultat immédiat sans son en mouvements réduits.

La maquette reprend les polices et couleurs du site, le portrait AniList déjà utilisé dans la maquette Histoire et l’étoile de `public/icons/icons.json`. Vérifiée en navigateur à 728, 768 et 390 px, au clavier et avec les mouvements réduits. Aucun parcours du jeu ni aucune ressource ne sont modifiés. Validation visuelle reçue (« ok ») ; intégration autorisée.

## Intégration de l’animation

- `AwakeningStars` réutilise le sprite héraldique et le même mouvement de 620 ms dans la liste d’éveil et la fiche personnage. L’effet démarre après la réponse de succès, jamais après un refus. Les contrôles restent ceux du jeu.
- Le dernier résultat maximal reste affiché dans la liste jusqu’au prochain éveil ou rechargement ; il n’offre plus de bouton d’éveil. Les statistiques détaillées de la fiche viennent toujours des données serveur rafraîchies.
- Le son utilise les préférences et le volume général du site. Son sous-bus se coupe avec l’animation sans affecter l’ambiance. Échap, changement d’onglet et fermeture nettoient les effets.
- La garde sur la première frame affichée empêche `Activity` de rejouer un ancien succès au retour sur la page. Aucun carillon au rechargement, en mouvements réduits, lorsque le son est coupé ou après une erreur serveur.

### Vérifications de l’intégration (2026-11-10)

Build Node 24 (typecheck compris), ESLint ciblé et `check:awakening` réussis. Navigateur sur le build local, desktop 1440 px et mobile 390 px : fiche et liste, étoile gagnée visible, 4★ puis 5★ avec doublon, résultat maximal conservé, statistiques actualisées, rechargement sans rejeu, navigation Next vers l’accueil puis retour sans second carillon, son désactivé, mouvements réduits et refus serveur après épuisement des ressources. Le refus conserve l’étoile et ne lance ni animation ni carillon. Le déclenchement audio a été contrôlé sur les quatre oscillateurs des deux notes et leurs partiels. Échap coupe l’effet sans fermer la fiche. Aucun débordement de page ni erreur JavaScript constaté.
