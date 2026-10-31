# Buffs et rythme des tours — 31 octobre 2026

## Règle intégrée

- Attaque de base présélectionnée en manuel ; retour à la base après chaque action, changement d'acteur ou nouveau journal.
- Les buffs purement personnels SSR/UR rendent la main immédiatement : le joueur peut ensuite attaquer ou utiliser un autre sort prêt.
- Les buffs d'équipe et les frappes combinées à une protection consomment toujours le tour.
- Une recharge ne progresse qu'une fois par tour. Les nouveaux buffs entrent normalement en recharge ; un ultime dépense sa jauge.
- Les effets durables progressent après l'action payante. Un bonus personnel d'un tour bénéficie à l'attaque immédiate puis expire.
- Les continuations sont conservées par sérialisation et par le rejeu serveur des choix manuels.

## Couverture du catalogue

Comptage sur les 236 fiches de `skill-data.json`, soit 708 secondaires, tertiaires et ultimes. Un buff d'équipe est ici un bonus positif de stats, bouclier, réduction de dégâts, immunité ou régénération avec portée `team`. Les soins et purges sont comptés séparément comme soutien d'équipe.

| Emplacement | Buff d'équipe | Buff personnel instantané | Total de sorts |
|---|---:|---:|---:|
| Secondaire | 45 | 19 | 236 |
| Tertiaire | 107 | 55 | 236 |
| Ultime | 67 | 8 | 236 |
| Total | 219 | 82 | 708 |

- **121 personnages sur 236** possèdent au moins un buff d'équipe.
- **168 sorts** accordent un bonus positif de stats à toute l'équipe.
- En ajoutant les soins et purges de groupe : **127 personnages** et **252 sorts** de soutien d'équipe.

En nombre et en répartition, les buffs de groupe sont déjà présents, surtout sur les tertiaires. Ce comptage ne prouve pas à lui seul leur équilibre : la valeur d'un tour, l'intensité du bonus, sa durée et l'IA restent déterminantes.

## Vérifications

Tests ciblés SSR/UR : conservation immédiate de la main, retour à l'adversaire après l'attaque, trois buffs prêts enchaînables sans relance infinie, jauge normale, persistance après sérialisation, absence de double tic de poison ou de recharge, maintien du verrou d'un autre sort et expiration correcte du bonus après l'attaque immédiate. Les attaques avec protection et buffs d'équipe terminent bien le tour.

## Simulation après changement de rythme

`npm run simulate:compositions -- --games 500 --seed 42`, Node 24 : 12 500 combats au total. Chaque équipe contient deux SSR et deux UR, positions aléatoires et puissance appariée. Chaque cellule repose sur ses propres tirages ; les cellules opposées ne sont pas nécessairement complémentaires.

Victoires de l'équipe en ligne, en pourcentage :

| Équipe | Tout-attaque | Mix équilibré | Défense + soutien | Soutien + contrôle | Sans soutien |
|---|---:|---:|---:|---:|---:|
| Tout-attaque | 46,4 | 30,6 | 21,2 | 68,0 | 43,2 |
| Mix équilibré | 69,4 | 54,8 | 51,0 | 79,8 | 59,9 |
| Défense + soutien | 74,6 | 51,4 | 51,2 | 83,2 | 63,6 |
| Soutien + contrôle | 28,8 | 25,0 | 15,6 | 50,7 | 28,9 |
| Sans soutien | 59,1 | 38,9 | 40,4 | 65,7 | 50,6 |

Durée moyenne : 14,1 tours ; limite des tours atteinte : 3,4 %. Le résultat confirme que les compositions avec soutien et protection restent efficaces. Les buffs personnels gratuits modifient l'équilibre : l'ancienne cible indicative de 60–65 % n'est pas garantie par ce changement. Un échantillon de 500 combats garde environ ±4 points d'incertitude près de 50 %, et le profil défense+soutien reste favorisé contre le tout-attaque. Une calibration plus fine reste nécessaire ; aucun nouveau buff d'équipe n'a été ajouté sur la seule base du comptage.
