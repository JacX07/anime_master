# Lot 6 — Donjons et sets (v0.3.0)

Validé le 2026-11-10. Pas de lumière ni de ténèbres pour le moment ; la foudre est incluse.

## Butin de chaque victoire

| Difficulté | Pièces |
| --- | --- |
| 1 | 1 N |
| 2 | 1 N + 50 % d’un second N |
| 3 | 1 R + 1 N |
| 4 | 1 R + 50 % d’un second R |
| 5 | 1 SR + 1 R |
| 6 | 1 SR + 50 % d’un second SR |
| 7 | 1 SSR + 1 SR |
| 8 | 1 SSR + 50 % d’un second SSR |
| 9 | 1 UR + 1 SSR |
| 10 | 1 UR + 50 % d’un second UR |

Chaque pièce tire indépendamment son emplacement (25 % chacun), sa stat principale et ses sous-stats. Le tirage bonus utilise un flux distinct. Versement atomique, une seule fois, en manuel comme en auto ; aucun butin en cas de défaite ou d’abandon. Les matériaux restent versés une fois par victoire. Les anciens résultats à une seule pièce restent lisibles.

## Nouveaux donjons

Progression indépendante sur 10 difficultés, même coût en énergie et même déblocage au combat 10 de l’histoire que les autres donjons. Fairy Tail appartient à l’univers d’histoire « La Grande Alchimie » : son déblocage et ses matériaux utilisent cet univers, sans ajouter de campagne.

- Attaque des Titans : Cuirasse du temps. 2 pièces : +15 % DEF et PV. 4 pièces : mêmes stats, protection du Titan.
- Demon Slayer : 2 pièces +10 points de critique ; 4 pièces +15 points de critique au total, ignore 25 % de la DEF adverse sur les coups directs.
- Fairy Tail : dégâts élémentaires +15 % / +30 % au total, pour feu, eau, air, terre et foudre. Le bonus porte sur les dégâts du secondaire doté d’un élément et sur sa brûlure ; les soins et autres effets utilitaires ne changent pas. Les attaques sans élément n’en bénéficient pas.

## Protection du Titan

Une seule activation par porteur et par combat, quand des dégâts le font passer à 50 % de ses PV max ou moins et qu’il survit. Ajoute un bouclier de 50 % des PV max, et réduit les dégâts subis de 50 %, pendant deux actions du porteur. Le coup déclencheur est payé avant l’activation ; aucune résurrection. À expiration, seule la part restante de ce bouclier est retirée, les autres boucliers sont conservés. La réduction reste soumise au plafond commun de 70 % et ne disparaît pas quand le bouclier est consommé. Un soin au-dessus du seuil ne réarme pas le set.

Les nouveaux bonus sont optionnels dans les copies de combat : absence signifie aucun effet, pour préserver les anciens replays.

## Vérification du 2026-11-10

- Node 24 : build, typecheck, ESLint ciblé ; `check-battle`, `check-sets`, `check-dungeon` et `check-dungeon-drops` réussis. Les tests couvrent les dix barèmes et 200 000 graines, les tirages pairs en base, les deux pièces garanties, le versement unique des matériaux, le refus des difficultés verrouillées, la persistance, la lecture sans double versement, les bonus 2/4 pièces, le plafond des réductions, l’expiration du bouclier et les deux ordonnanceurs.
- Navigateur sur `next dev` 3012 : les trois donjons, préparation et victoires en auto, deux pièces au résultat et après rechargement ; navigation à 1440, 1024 et 390 px sans débordement. Sets complets et palier actif visibles dans les fiches (PC et mobile). Statut Titan rendu dans le lecteur d’un combat manuel de test reprenable, avec icône existante, durée et dégâts subis −50 %.
- Mobile 390 px : Fairy Tail verrouillé à Grande Alchimie 9/10, persistance après rechargement ; refus d’entrée sans énergie avec erreur lisible ; combat manuel avec sort et cible choisis en vrais clics, fin automatique et deux pièces persistantes.
- Bug préexistant corrigé séparément : « Terminer » cliqué pendant la requête d’une action manuelle doit utiliser le compteur d’action confirmé, même avant le rendu React suivant (voir journal).
- Comptes et équipement de vérification jetables, supprimés après vérification finale. Aucun changement de schéma, aucune publication en production. Les nouveaux boss réutilisent la courbe de difficulté des autres donjons ; pas de nouvelle calibration globale des compositions.
