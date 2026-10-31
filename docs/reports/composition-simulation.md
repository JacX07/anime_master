# Compositions SSR/UR — 31 octobre 2026

## Configuration

- Catalogue : 236 personnages, trois sorts personnels chacun, sans rôle affiché dans le jeu.
- Moteur réel en automatique, statistiques de la base locale, zéro étoile, sans arme.
- Chaque équipe contient deux SSR et deux UR ; les fonctions sont réparties aléatoirement entre raretés et positions.
- Puissance totale appariée au mieux parmi 30 tirages ; camps alternés. Les bonus de type et de franchise restent actifs.
- PV = 2,8 × (ATK + DEF). Bonus/malus ATK et DEF plafonnés à ±60 %, réduction des dégâts à 70 %, chances de critique et d'esquive entre 0 et 100 %.
- 1 000 combats par cellule, graine 42, soit 25 000 combats. Un nul compte pour une demi-victoire.

Commande, avec Node 24 : `npm run simulate:compositions -- --games 1000 --seed 42`.

## Profils

| Profil | Composition de simulation |
|---|---|
| Tout-attaque | 4 attaque |
| Mix équilibré | attaque, soutien, protection, contrôle |
| Défense + soutien | attaque, soutien, protection, soutien |
| Soutien + contrôle | attaque, soutien, contrôle, contrôle |
| Sans soutien | attaque, attaque, protection, contrôle |

Ces étiquettes servent à sélectionner les personnages. Les sorts restent transversaux : un attaquant peut protéger et un soutien peut infliger des dégâts.

## Résultats

Victoires de l'équipe en ligne, en pourcentage. Chaque cellule repose sur ses propres tirages ; deux cellules opposées ne sont donc pas exactement complémentaires.

| Équipe | Tout-attaque | Mix équilibré | Défense + soutien | Soutien + contrôle | Sans soutien |
|---|---:|---:|---:|---:|---:|
| Tout-attaque | 48,5 | 37,0 | 30,3 | 53,4 | 52,0 |
| Mix équilibré | 62,5 | 49,0 | 43,5 | 69,2 | 64,5 |
| Défense + soutien | 72,0 | 59,3 | 47,8 | 78,5 | 72,7 |
| Soutien + contrôle | 42,6 | 30,9 | 21,9 | 50,5 | 50,8 |
| Sans soutien | 47,6 | 36,3 | 29,4 | 52,0 | 55,0 |

Durée moyenne : **14,7 tours** ; limite des 30 tours atteinte dans **3,3 %** des combats.

Vérification indépendante avec la graine **2026**, également 25 000 combats : le mix équilibré gagne **64,1 %** contre le tout-attaque, pour **14,8 tours** en moyenne et **3,4 %** de limites de tours atteintes.

Le mix équilibré se situe dans la cible indicative de 60–65 % contre le tout-attaque. Le profil avec deux soutiens domine davantage cet échantillon. Le léger avantage du tout-attaque contre le profil sans soutien est trop faible pour affirmer une supériorité robuste à partir de cette seule série.

## Portée

La mesure porte sur des équipes aléatoires et l'IA actuelle. Elle ne garantit pas le résultat d'un duel précis ni un cycle de contres universel. L'incertitude d'un taux proche de 50 % sur 1 000 combats est d'environ ±3 points à 95 %.

Les cinq profils sélectionnent les 207 fiches d'orientation attaque, soutien, protection ou contrôle. Les 29 fiches classées hybrides restent jouables et couvertes par les tests du catalogue ; elles ne sont pas échantillonnées dans cette matrice.

Les contrôles du moteur couvrent également provocation, refus d'une cible protégée, mort du provocateur, réduction et son plafond, critique/esquive à 0 et 100 %, poison, silence et résistance des boss, purge, réanimation, boucliers et rejeu. La simulation d'histoire a été exécutée sur 50 combats par case ; la progression PvM n'a pas été recalibrée intégralement.

Contrôle navigateur sur le serveur de développement : le builder affiche les 236 personnages et leurs 944 sorts ; les multiplicateurs figurent dans les aides au survol et les anciens libellés « première action » ont disparu. Le lecteur de démonstration a été contrôlé à 1 280 × 800 puis 390 × 844 : deux colonnes, deux rangées pour un UR, ultime doré et détails sans multiplicateur visible. Sur mobile, les zones du plateau et des sorts défilent si leur contenu dépasse l'écran. Le compte local créé pour ce contrôle a été supprimé.
