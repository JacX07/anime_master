# Simulation des quatre slots personnalisés SSR/UR

- Roster : **236 SSR/UR** ; 4 slots testés par personnage (944 mesures). Graine 42.
- Méthode : **500 paires par personnage et par slot**, soit 1000 combats pour chaque mesure ; équipe miroir avec une seule capacité active contre les mêmes cartes sans capacités personnalisées. Les camps sont inversés. Les passifs UR, la franchise, le type, les statistiques et les sorts affiliés restent identiques. L'impact mesure la capacité isolée, pas la qualité du personnage.
- Jauge : 100 points, +34 par action offensive réussie, une seule fois même si l'action touche plusieurs adversaires ; l'ultime dépense toute la jauge et ne la recharge pas.

## Impact moyen par slot

| Slot | Fiches | Ensemble | SSR | UR | Cible indicative |
|---|---:|---:|---:|---:|---|
| Base | 236 | +1.12 pp | +1.14 pp | +1.08 pp | 0 à +1 pp |
| Secondaire | 236 | -0.05 pp | +0.18 pp | -1.00 pp | de +1 à +6 pp |
| Tertiaire | 236 | +4.01 pp | +3.84 pp | +4.68 pp | de +1 à +6 pp |
| Ultime | 236 | +5.35 pp | +5.28 pp | +5.63 pp | de +1 à +6 pp |

## Équipe complète

Les équipes chargées ont leurs quatre slots ; leur clone garde les attaques et sorts affiliés standards. Les deux camps utilisent les mêmes personnages et la simulation inverse le premier joueur.

| Composition | Victoires de l'équipe complète | Impact vs clone | IC 95 % | Ultimes par combat | Combats avec ultime | 1er ultime (tour moyen) | Durée moyenne |
|---|---:|---:|---:|---:|---:|---:|---:|
| 4 SSR | 51.45 % | +1.45 pp | ±3.03 pp | 1.90 | 98.80 % | 4.0 | 6.8 tours |
| 2 UR + 2 SSR | 47.20 % | -2.80 pp | ±3.07 pp | 1.83 | 99.80 % | 4.0 | 6.6 tours |
| 4 UR | 50.90 % | +0.90 pp | ±3.13 pp | 1.78 | 99.10 % | 4.0 | 6.3 tours |

## Extrêmes par slot

L'IC à 95 % provient de la dispersion des paires de combats. Un verdict hors marge sert à repérer les fiches à retoucher ; il ne juge pas la puissance brute du personnage.

| Groupe | Personnage | Compétence | Effet | Impact | IC 95 % | Verdict |
|---|---|---|---|---:|---:|---|
| Base — plus forts | Raphtalia (SSR) | Frappe inspirée de Transformation de raphtalia | esquive +3 points pour le lanceur, jusqu'à sa prochaine action | +4.50 pp | ±2.28 pp | dans la marge |
| Base — plus forts | Senkuu Ishigami (SSR) | Frappe inspirée de Science du monde | rend 2 % des PV max au lanceur | +4.40 pp | ±1.33 pp | dans la marge |
| Base — plus forts | Lucy (SSR) | Frappe inspirée de Netrunner | esquive +3 points pour le lanceur, jusqu'à sa prochaine action | +4.40 pp | ±2.39 pp | dans la marge |
| Base — plus forts | Kyou Souma (SSR) | Frappe inspirée de Rage du chat | esquive +3 points pour le lanceur, jusqu'à sa prochaine action | +4.30 pp | ±2.20 pp | dans la marge |
| Base — plus forts | Shouko Nishimiya (SSR) | Frappe inspirée de Langue des signes | rend 2 % des PV max au lanceur | +4.00 pp | ±1.19 pp | dans la marge |
| Base — plus faibles | Chuuya Nakahara (SSR) | Frappe inspirée de Corruption | ignore 3 % de la DEF sur la prochaine attaque du lanceur | -0.10 pp | ±0.20 pp | à renforcer |
| Base — plus faibles | Tanya Degurechaff (SSR) | Frappe inspirée de Magie des mots | ignore 3 % de la DEF sur la prochaine attaque du lanceur | -0.10 pp | ±0.20 pp | à renforcer |
| Base — plus faibles | Erza Scarlet (SSR) | Frappe inspirée de Armure Purgatoire | ignore 3 % de la DEF sur la prochaine attaque du lanceur | +0.00 pp | ±0.39 pp | à renforcer |
| Base — plus faibles | Holo (SSR) | Frappe inspirée de Marchandage | DEF −3 % pour la cible, pour sa prochaine action | +0.00 pp | ±0.00 pp | à renforcer |
| Base — plus faibles | Kiritsugu Emiya (SSR) | Frappe inspirée de Origine : Time Alter | critique +3 points pour le lanceur, pour sa prochaine action | +0.00 pp | ±0.00 pp | à renforcer |
| Secondaire — plus forts | Naruto Uzumaki (UR) | Mode Kyubi | 0,46799999999999997× ATK sur tous les ennemis ; ATK +8 % pour l'équipe, 1 action ; soin sur la durée de 3 % des PV max pour le lanceur, 2 actions. | +13.30 pp | ±2.57 pp | trop fort |
| Secondaire — plus forts | Yor Forger (SSR) | Rose épineuse | 1,237× ATK. | +13.30 pp | ±2.00 pp | trop fort |
| Secondaire — plus forts | Kakashi Hatake (UR) | Raikiri | 1,25× ATK, ignore 10 % de la DEF, traverse les boucliers. | +12.80 pp | ±2.05 pp | trop fort |
| Secondaire — plus forts | Usopp (SSR) | Kemuri Boshi | 0,5× ATK sur tous les ennemis ; esquive +5 % pour l'équipe, 1 action. | +12.60 pp | ±2.89 pp | trop fort |
| Secondaire — plus forts | Robin Nico (SSR) | Mil Fleur | 1,1× ATK ; silence sur la cible (sort de base seulement), 1 action; sans effet sur les boss. | +12.00 pp | ±2.81 pp | trop fort |
| Secondaire — plus faibles | Tobio Kageyama (SSR) | Passe parfaite | 0,56× ATK ; critique +8 points pour l'équipe, 1 action. | -16.60 pp | ±2.17 pp | à renforcer |
| Secondaire — plus faibles | Misato Katsuragi (SSR) | Ordre de tir | 0,56× ATK ; critique +8 points pour l'équipe, 1 action. | -16.50 pp | ±2.21 pp | à renforcer |
| Secondaire — plus faibles | Killua Zoldyck (UR) | Godspeed | 0,68× ATK ; esquive +18 % pour le lanceur, 1 action. | -15.40 pp | ±2.19 pp | à renforcer |
| Secondaire — plus faibles | Shouyou Hinata (SSR) | Attaque éclair | 0,66× ATK ; esquive +18 % pour le lanceur, 1 action. | -14.60 pp | ±2.23 pp | à renforcer |
| Secondaire — plus faibles | Ai Hayasaka (SSR) | Ninja du conseil | 0,66× ATK ; esquive +18 % pour le lanceur, 1 action. | -14.10 pp | ±2.54 pp | à renforcer |
| Tertiaire — plus forts | Spike Spiegel (SSR) | Spike Spiegel : Jeet Kune Do — Percée mesurée | 1,224× ATK, ignore 12 % de la DEF. | +14.30 pp | ±2.10 pp | trop fort |
| Tertiaire — plus forts | Levi (UR) | Levi : Tourbillon de lames — Percée mesurée | 1,224× ATK, ignore 12 % de la DEF. | +13.50 pp | ±2.12 pp | trop fort |
| Tertiaire — plus forts | Zenitsu Agatsuma (SSR) | Zenitsu Agatsuma : Respiration de la foudre — Percée mesurée | 1,224× ATK, ignore 12 % de la DEF. | +13.10 pp | ±2.05 pp | trop fort |
| Tertiaire — plus forts | Artoria Pendragon (SSR) | Artoria Pendragon : Excalibur — Percée mesurée | 1,224× ATK, ignore 12 % de la DEF. | +12.50 pp | ±2.00 pp | trop fort |
| Tertiaire — plus forts | Luffy Monkey (UR) | Luffy Monkey : Pistolet Gum-Gum — Percée mesurée | 1,224× ATK, ignore 12 % de la DEF. | +12.30 pp | ±2.34 pp | trop fort |
| Tertiaire — plus faibles | Homura Akemi (SSR) | Homura Akemi : Arrêt du temps — Pas de côté | 1,054× ATK ; esquive +6 % pour le lanceur, 1 action. | +0.50 pp | ±1.29 pp | dans la marge |
| Tertiaire — plus faibles | Usopp (SSR) | Usopp : Étoile explosive — Marque persistante | 1,054× ATK ; poison : 2 % des PV max par action pour la cible, 2 actions. | +0.60 pp | ±0.73 pp | dans la marge |
| Tertiaire — plus faibles | Mami Nanami (SSR) | Mami Nanami : Petite amie en location — Pas de côté | 1,054× ATK ; esquive +6 % pour le lanceur, 1 action. | +0.60 pp | ±1.88 pp | dans la marge |
| Tertiaire — plus faibles | Nezuko Kamado (SSR) | Nezuko Kamado : Forme de démon — Second souffle | 1,054× ATK ; soigne le lanceur de 5 % des PV max. | +0.80 pp | ±1.41 pp | dans la marge |
| Tertiaire — plus faibles | Yuuta Okkotsu (SSR) | Yuuta Okkotsu : Coupe de katana avec Rika — Second souffle | 1,054× ATK ; soigne le lanceur de 5 % des PV max. | +0.80 pp | ±1.11 pp | dans la marge |
| Ultime — plus forts | Gon Freecss (SSR) | Jajanken — Pierre, feuille, ciseaux | 2,05× ATK, ignore 30 % de la DEF, coup critique assuré. | +23.10 pp | ±2.19 pp | trop fort |
| Ultime — plus forts | Levi (UR) | Levi — Déchaînement : Tourbillon de lames | 1,65× ATK, ignore 40 % de la DEF. | +22.90 pp | ±2.19 pp | trop fort |
| Ultime — plus forts | Guts (UR) | Berserk — Dragonslayer | 1,55× ATK, ignore 30 % de la DEF, coup critique assuré. | +22.00 pp | ±2.18 pp | trop fort |
| Ultime — plus forts | Emilia (UR) | Puck — Exécution glaciale | 1,9× ATK, ignore 30 % de la DEF, traverse les boucliers. | +20.40 pp | ±2.16 pp | trop fort |
| Ultime — plus forts | Senkuu Ishigami (SSR) | Senkuu Ishigami — Déchaînement : Science du monde | 0,4× ATK sur tous les ennemis ; soigne l'équipe de 30 % des PV max ; retire les malus de l'équipe. | +19.80 pp | ±2.20 pp | trop fort |
| Ultime — plus faibles | Rintarou Okabe (UR) | Time Leap | soin sur la durée de 8 % des PV max pour l'équipe, 3 actions ; retire les malus de l'équipe. | -8.80 pp | ±1.67 pp | à renforcer |
| Ultime — plus faibles | Satoru Gojou (UR) | Pourpre | 0,72× ATK sur tous les ennemis, traverse les boucliers. | -7.60 pp | ±1.80 pp | à renforcer |
| Ultime — plus faibles | Shouya Ishida (SSR) | Shouya Ishida — Déchaînement : Rédemption | 0,45× ATK sur tous les ennemis ; DEF +20 % pour l'équipe, 2 actions. | -5.20 pp | ±1.76 pp | à renforcer |
| Ultime — plus faibles | Subaru Natsuki (SSR) | Retour par la mort | soigne le lanceur de 50 % des PV max ; bouclier de 15 % des PV max pour le lanceur. | -3.70 pp | ±2.08 pp | à renforcer |
| Ultime — plus faibles | Sukuna (SSR) | Extension du Sanctuaire | 0,42× ATK sur tous les ennemis ; poison : 6 % des PV max par action pour tous les ennemis, 2 actions. | -1.55 pp | ±1.78 pp | à renforcer |

## Détail complet des 944 fiches

| ID | Personnage | Rareté | Slot | Compétence | Effet | Taux traité | Impact | IC 95 % | Verdict |
|---:|---|---|---|---|---|---:|---:|---:|---|
| 1 | Spike Spiegel | SSR | Base | Frappe inspirée de Jeet Kune Do | ignore 3 % de la DEF sur la prochaine attaque du lanceur | 51.10 % | +1.10 pp | ±0.64 pp | dans la marge |
| 1 | Spike Spiegel | SSR | Secondaire | Jeet Kune Do | 0,94× ATK, ignore 15 % de la DEF. | 51.30 % | +1.30 pp | ±0.75 pp | dans la marge |
| 1 | Spike Spiegel | SSR | Tertiaire | Spike Spiegel : Jeet Kune Do — Percée mesurée | 1,224× ATK, ignore 12 % de la DEF. | 64.30 % | +14.30 pp | ±2.10 pp | trop fort |
| 1 | Spike Spiegel | SSR | Ultime | Spike Spiegel — Déchaînement : Jeet Kune Do | 1,65× ATK, ignore 40 % de la DEF. | 66.10 % | +16.10 pp | ±2.05 pp | trop fort |
| 2 | Faye Valentine | SSR | Base | Frappe inspirée de Bluff | esquive +3 points pour le lanceur, jusqu'à sa prochaine action | 52.10 % | +2.10 pp | ±2.04 pp | dans la marge |
| 2 | Faye Valentine | SSR | Secondaire | Bluff | 0,4× ATK sur tous les ennemis ; esquive +5 % pour l'équipe, 1 action. | 55.30 % | +5.30 pp | ±2.78 pp | dans la marge |
| 2 | Faye Valentine | SSR | Tertiaire | Faye Valentine : Bluff — Pas de côté | 1,054× ATK ; esquive +6 % pour le lanceur, 1 action. | 54.30 % | +4.30 pp | ±2.27 pp | dans la marge |
| 2 | Faye Valentine | SSR | Ultime | Faye Valentine — Déchaînement : Bluff | 1,25× ATK ; esquive +30 % pour le lanceur, 2 actions. | 50.10 % | +0.10 pp | ±0.20 pp | à renforcer |
| 5 | Ichigo Kurosaki | SSR | Base | Frappe inspirée de Getsuga Tenshou | ATK +3 % pour le lanceur, pour sa prochaine action | 52.10 % | +2.10 pp | ±1.04 pp | dans la marge |
| 5 | Ichigo Kurosaki | SSR | Secondaire | Getsuga Tenshou | 0,92× ATK ; ATK +12 % pour le lanceur, 1 action. | 50.50 % | +0.50 pp | ±1.63 pp | dans la marge |
| 5 | Ichigo Kurosaki | SSR | Tertiaire | Ichigo Kurosaki : Getsuga Tenshou — Élan bref | 1,054× ATK ; ATK +8 % pour le lanceur, 1 action. | 53.80 % | +3.80 pp | ±1.56 pp | dans la marge |
| 5 | Ichigo Kurosaki | SSR | Ultime | Ichigo Kurosaki — Déchaînement : Getsuga Tenshou | 1,35× ATK ; ATK +20 % pour le lanceur, 2 actions. | 60.50 % | +10.50 pp | ±1.81 pp | trop fort |
| 6 | Rukia Kuchiki | SSR | Base | Frappe inspirée de Tsukishiro | ATK −3 % pour la cible, pour sa prochaine action | 50.30 % | +0.30 pp | ±0.34 pp | à renforcer |
| 6 | Rukia Kuchiki | SSR | Secondaire | Tsukishiro | 1,06× ATK ; silence sur la cible (sort de base seulement), 1 action; sans effet sur les boss. | 53.20 % | +3.20 pp | ±2.75 pp | dans la marge |
| 6 | Rukia Kuchiki | SSR | Tertiaire | Rukia Kuchiki : Tsukishiro — Pression ciblée | 1,054× ATK ; ATK −8 % pour la cible, 1 action. | 51.80 % | +1.80 pp | ±1.03 pp | dans la marge |
| 6 | Rukia Kuchiki | SSR | Ultime | Rukia Kuchiki — Déchaînement : Tsukishiro | 1,3× ATK ; ATK −20 % pour la cible, 2 actions. | 51.00 % | +1.00 pp | ±0.61 pp | dans la marge |
| 11 | Edward Elric | UR | Base | Frappe inspirée de Alchimie sans cercle | ignore 3 % de la DEF sur la prochaine attaque du lanceur | 50.60 % | +0.60 pp | ±0.55 pp | dans la marge |
| 11 | Edward Elric | UR | Secondaire | Alchimie sans cercle | 1,0779999999999998× ATK, traverse les boucliers. | 53.10 % | +3.10 pp | ±1.43 pp | dans la marge |
| 11 | Edward Elric | UR | Tertiaire | Edward Elric : Alchimie sans cercle — Percée mesurée | 1,224× ATK, ignore 12 % de la DEF. | 61.00 % | +11.00 pp | ±2.30 pp | trop fort |
| 11 | Edward Elric | UR | Ultime | Edward Elric — Déchaînement : Alchimie sans cercle | 1,65× ATK, ignore 40 % de la DEF. | 56.10 % | +6.10 pp | ±1.44 pp | dans la marge |
| 12 | Alphonse Elric | SSR | Base | Frappe inspirée de Armure d'Al | bouclier de 2 % des PV max pour le lanceur | 52.20 % | +2.20 pp | ±1.06 pp | dans la marge |
| 12 | Alphonse Elric | SSR | Secondaire | Armure d'Al | 0,4× ATK sur tous les ennemis ; bouclier de 3 % des PV max pour l'équipe. | 56.30 % | +6.30 pp | ±2.88 pp | dans la marge |
| 12 | Alphonse Elric | SSR | Tertiaire | Alphonse Elric : Armure d'Al — Garde protectrice | 1,054× ATK ; bouclier de 6 % des PV max pour le lanceur. | 57.60 % | +7.60 pp | ±1.85 pp | dans la marge |
| 12 | Alphonse Elric | SSR | Ultime | Alphonse Elric — Déchaînement : Armure d'Al | 0,5× ATK sur tous les ennemis ; bouclier de 20 % des PV max pour l'équipe. | 51.50 % | +1.50 pp | ±0.75 pp | dans la marge |
| 13 | Sasuke Uchiha | SSR | Base | Kunai de foudre | DEF −3 % pour la cible, pour sa prochaine action | 50.90 % | +0.90 pp | ±0.65 pp | dans la marge |
| 13 | Sasuke Uchiha | SSR | Secondaire | Amaterasu | 1,216× ATK ; poison : 3 % des PV max par action pour la cible, 2 actions. | 60.55 % | +10.55 pp | ±1.88 pp | trop fort |
| 13 | Sasuke Uchiha | SSR | Tertiaire | Sasuke Uchiha : Kunai de foudre — Brèche tactique | 1,054× ATK ; DEF −8 % pour la cible, 1 action. | 52.80 % | +2.80 pp | ±1.25 pp | dans la marge |
| 13 | Sasuke Uchiha | SSR | Ultime | Sasuke Uchiha — Déchaînement : Kunai de foudre | 1,45× ATK ; DEF −20 % pour la cible, 2 actions. | 55.10 % | +5.10 pp | ±1.49 pp | dans la marge |
| 14 | Itachi Uchiha | UR | Base | Shuriken Sharingan | ATK −3 % pour la cible, pour sa prochaine action | 52.20 % | +2.20 pp | ±0.90 pp | dans la marge |
| 14 | Itachi Uchiha | UR | Secondaire | Tsukuyomi | 1,1× ATK ; silence sur la cible (sort de base seulement), 1 action; sans effet sur les boss ; ATK −12 % pour la cible, 1 action. | 52.70 % | +2.70 pp | ±3.07 pp | dans la marge |
| 14 | Itachi Uchiha | UR | Tertiaire | Itachi Uchiha : Shuriken Sharingan — Pression ciblée | 1,054× ATK ; ATK −8 % pour la cible, 1 action. | 52.80 % | +2.80 pp | ±1.15 pp | dans la marge |
| 14 | Itachi Uchiha | UR | Ultime | Itachi Uchiha — Déchaînement : Shuriken Sharingan | 1,3× ATK ; ATK −20 % pour la cible, 2 actions. | 55.80 % | +5.80 pp | ±1.51 pp | dans la marge |
| 17 | Naruto Uzumaki | UR | Base | Rasengan direct | ATK +3 % pour le lanceur, pour sa prochaine action | 50.60 % | +0.60 pp | ±0.55 pp | dans la marge |
| 17 | Naruto Uzumaki | UR | Secondaire | Mode Kyubi | 0,46799999999999997× ATK sur tous les ennemis ; ATK +8 % pour l'équipe, 1 action ; soin sur la durée de 3 % des PV max pour le lanceur, 2 actions. | 63.30 % | +13.30 pp | ±2.57 pp | trop fort |
| 17 | Naruto Uzumaki | UR | Tertiaire | Naruto Uzumaki : Rasengan direct — Élan bref | 1,054× ATK ; ATK +8 % pour le lanceur, 1 action. | 53.40 % | +3.40 pp | ±1.30 pp | dans la marge |
| 17 | Naruto Uzumaki | UR | Ultime | Naruto Uzumaki — Déchaînement : Rasengan direct | 1,35× ATK ; ATK +20 % pour le lanceur, 2 actions. | 51.50 % | +1.50 pp | ±0.80 pp | dans la marge |
| 27 | Killua Zoldyck | UR | Base | Décharge du bout des doigts | esquive +3 points pour le lanceur, jusqu'à sa prochaine action | 50.70 % | +0.70 pp | ±1.16 pp | dans la marge |
| 27 | Killua Zoldyck | UR | Secondaire | Godspeed | 0,68× ATK ; esquive +18 % pour le lanceur, 1 action. | 34.60 % | -15.40 pp | ±2.19 pp | à renforcer |
| 27 | Killua Zoldyck | UR | Tertiaire | Killua Zoldyck : Décharge du bout des doigts — Pas de côté | 1,054× ATK ; esquive +6 % pour le lanceur, 1 action. | 54.10 % | +4.10 pp | ±1.52 pp | dans la marge |
| 27 | Killua Zoldyck | UR | Ultime | Vitesse céleste | 1,35× ATK ; esquive +30 % pour le lanceur, 2 actions. | 62.60 % | +12.60 pp | ±1.94 pp | trop fort |
| 28 | Kurapika | UR | Base | Frappe inspirée de Chaîne du jugement | ATK −3 % pour la cible, pour sa prochaine action | 51.10 % | +1.10 pp | ±0.64 pp | dans la marge |
| 28 | Kurapika | UR | Secondaire | Chaîne du jugement | 1,1× ATK ; silence sur la cible (sort de base seulement), 1 action; sans effet sur les boss. | 44.80 % | -5.20 pp | ±2.76 pp | à renforcer |
| 28 | Kurapika | UR | Tertiaire | Kurapika : Chaîne du jugement — Pression ciblée | 1,054× ATK ; ATK −8 % pour la cible, 1 action. | 53.50 % | +3.50 pp | ±1.31 pp | dans la marge |
| 28 | Kurapika | UR | Ultime | Kurapika — Déchaînement : Chaîne du jugement | 1,3× ATK ; ATK −20 % pour la cible, 2 actions. | 54.40 % | +4.40 pp | ±1.24 pp | dans la marge |
| 30 | Gon Freecss | SSR | Base | Coup direct | ATK +3 % pour le lanceur, pour sa prochaine action | 51.90 % | +1.90 pp | ±0.84 pp | dans la marge |
| 30 | Gon Freecss | SSR | Secondaire | Jajanken | 0,92× ATK ; ATK +12 % pour le lanceur, 1 action. | 50.60 % | +0.60 pp | ±1.49 pp | dans la marge |
| 30 | Gon Freecss | SSR | Tertiaire | Gon Freecss : Coup direct — Élan bref | 1,054× ATK ; ATK +8 % pour le lanceur, 1 action. | 54.80 % | +4.80 pp | ±1.46 pp | dans la marge |
| 30 | Gon Freecss | SSR | Ultime | Jajanken — Pierre, feuille, ciseaux | 2,05× ATK, ignore 30 % de la DEF, coup critique assuré. | 73.10 % | +23.10 pp | ±2.19 pp | trop fort |
| 31 | Hisoka Morow | SSR | Base | Frappe inspirée de Bungee Gum | ATK −3 % pour la cible, pour sa prochaine action | 51.00 % | +1.00 pp | ±0.67 pp | dans la marge |
| 31 | Hisoka Morow | SSR | Secondaire | Bungee Gum | 0,98× ATK ; ATK −12 % pour la cible, 1 action. | 51.60 % | +1.60 pp | ±0.91 pp | dans la marge |
| 31 | Hisoka Morow | SSR | Tertiaire | Hisoka Morow : Bungee Gum — Pression ciblée | 1,054× ATK ; ATK −8 % pour la cible, 1 action. | 53.80 % | +3.80 pp | ±1.26 pp | dans la marge |
| 31 | Hisoka Morow | SSR | Ultime | Hisoka Morow — Déchaînement : Bungee Gum | 1,3× ATK ; ATK −20 % pour la cible, 2 actions. | 56.40 % | +6.40 pp | ±1.47 pp | dans la marge |
| 40 | Luffy Monkey | UR | Base | Pistolet Gum-Gum | ignore 3 % de la DEF sur la prochaine attaque du lanceur | 52.70 % | +2.70 pp | ±0.99 pp | dans la marge |
| 40 | Luffy Monkey | UR | Secondaire | Gomu Gomu no Gatling | 0,82× ATK ; ATK +12 % pour le lanceur, 1 action. | 47.10 % | -2.90 pp | ±2.32 pp | à renforcer |
| 40 | Luffy Monkey | UR | Tertiaire | Luffy Monkey : Pistolet Gum-Gum — Percée mesurée | 1,224× ATK, ignore 12 % de la DEF. | 62.30 % | +12.30 pp | ±2.34 pp | trop fort |
| 40 | Luffy Monkey | UR | Ultime | Gear Second | 1,5× ATK ; ATK +20 % pour le lanceur, 2 actions. | 66.90 % | +16.90 pp | ±2.08 pp | trop fort |
| 58 | Chrollo Lucilfer | SSR | Base | Frappe inspirée de Skill Hunter | ATK −3 % pour la cible, pour sa prochaine action | 51.30 % | +1.30 pp | ±0.70 pp | dans la marge |
| 58 | Chrollo Lucilfer | SSR | Secondaire | Skill Hunter | 1,06× ATK ; silence sur la cible (sort de base seulement), 1 action; sans effet sur les boss. | 50.40 % | +0.40 pp | ±2.69 pp | dans la marge |
| 58 | Chrollo Lucilfer | SSR | Tertiaire | Chrollo Lucilfer : Skill Hunter — Pression ciblée | 1,054× ATK ; ATK −8 % pour la cible, 1 action. | 54.10 % | +4.10 pp | ±1.27 pp | dans la marge |
| 58 | Chrollo Lucilfer | SSR | Ultime | Chrollo Lucilfer — Déchaînement : Skill Hunter | 1,3× ATK ; ATK −20 % pour la cible, 2 actions. | 55.50 % | +5.50 pp | ±1.37 pp | dans la marge |
| 61 | Robin Nico | SSR | Base | Bras fleuri | DEF −3 % pour la cible, pour sa prochaine action | 50.60 % | +0.60 pp | ±0.55 pp | dans la marge |
| 61 | Robin Nico | SSR | Secondaire | Mil Fleur | 1,1× ATK ; silence sur la cible (sort de base seulement), 1 action; sans effet sur les boss. | 62.00 % | +12.00 pp | ±2.81 pp | trop fort |
| 61 | Robin Nico | SSR | Tertiaire | Robin Nico : Bras fleuri — Brèche tactique | 1,054× ATK ; DEF −8 % pour la cible, 1 action. | 54.30 % | +4.30 pp | ±1.41 pp | dans la marge |
| 61 | Robin Nico | SSR | Ultime | Robin Nico — Déchaînement : Bras fleuri | 1,45× ATK ; DEF −20 % pour la cible, 2 actions. | 59.30 % | +9.30 pp | ±1.71 pp | trop fort |
| 62 | Zoro Roronoa | UR | Base | Coupe à trois sabres | critique +3 points pour le lanceur, pour sa prochaine action | 50.50 % | +0.50 pp | ±0.52 pp | dans la marge |
| 62 | Zoro Roronoa | UR | Secondaire | Santoryu Ogi | 0,94× ATK ; critique +18 points pour le lanceur, 2 actions. | 52.80 % | +2.80 pp | ±1.99 pp | dans la marge |
| 62 | Zoro Roronoa | UR | Tertiaire | Zoro Roronoa : Coupe à trois sabres — Visée précise | 1,054× ATK ; critique +6 points pour le lanceur, 1 action. | 54.50 % | +4.50 pp | ±1.45 pp | dans la marge |
| 62 | Zoro Roronoa | UR | Ultime | Zoro Roronoa — Déchaînement : Coupe à trois sabres | 1,55× ATK ; critique +35 points pour le lanceur, 2 actions. | 62.00 % | +12.00 pp | ±1.87 pp | trop fort |
| 68 | Roy Mustang | SSR | Base | Frappe inspirée de Flame Alchemy | ATK −3 % pour la cible, pour sa prochaine action | 52.60 % | +2.60 pp | ±1.01 pp | dans la marge |
| 68 | Roy Mustang | SSR | Secondaire | Flame Alchemy | 0,4× ATK sur tous les ennemis. | 46.70 % | -3.30 pp | ±2.79 pp | à renforcer |
| 68 | Roy Mustang | SSR | Tertiaire | Roy Mustang : Flame Alchemy — Pression ciblée | 1,054× ATK ; ATK −8 % pour la cible, 1 action. | 53.00 % | +3.00 pp | ±1.44 pp | dans la marge |
| 68 | Roy Mustang | SSR | Ultime | Roy Mustang — Déchaînement : Flame Alchemy | 1,3× ATK ; ATK −20 % pour la cible, 2 actions. | 62.20 % | +12.20 pp | ±1.88 pp | trop fort |
| 71 | L Lawliet | UR | Base | Frappe inspirée de Déduction | DEF −3 % pour la cible, pour sa prochaine action | 51.90 % | +1.90 pp | ±0.84 pp | dans la marge |
| 71 | L Lawliet | UR | Secondaire | Déduction | 0,72× ATK ; DEF −15 % pour la cible, 1 action. | 41.60 % | -8.40 pp | ±1.69 pp | à renforcer |
| 71 | L Lawliet | UR | Tertiaire | L Lawliet : Déduction — Brèche tactique | 1,054× ATK ; DEF −8 % pour la cible, 1 action. | 54.50 % | +4.50 pp | ±1.26 pp | dans la marge |
| 71 | L Lawliet | UR | Ultime | L Lawliet — Déchaînement : Déduction | 1,45× ATK ; DEF −20 % pour la cible, 2 actions. | 56.60 % | +6.60 pp | ±1.48 pp | dans la marge |
| 75 | Ryuk | SSR | Base | Frappe inspirée de Pomme du shinigami | ATK −3 % pour la cible, pour sa prochaine action | 50.10 % | +0.10 pp | ±0.44 pp | à renforcer |
| 75 | Ryuk | SSR | Secondaire | Pomme du shinigami | 0,98× ATK ; ATK −12 % pour la cible, 1 action. | 51.70 % | +1.70 pp | ±0.89 pp | dans la marge |
| 75 | Ryuk | SSR | Tertiaire | Ryuk : Pomme du shinigami — Pression ciblée | 1,054× ATK ; ATK −8 % pour la cible, 1 action. | 54.50 % | +4.50 pp | ±1.29 pp | dans la marge |
| 75 | Ryuk | SSR | Ultime | Ryuk — Déchaînement : Pomme du shinigami | 1,3× ATK ; ATK −20 % pour la cible, 2 actions. | 50.60 % | +0.60 pp | ±0.48 pp | dans la marge |
| 80 | Light Yagami | UR | Base | Frappe inspirée de Crise cardiaque | poison : 0,5 % des PV max de la cible à sa prochaine action | 50.30 % | +0.30 pp | ±0.34 pp | à renforcer |
| 80 | Light Yagami | UR | Secondaire | Crise cardiaque | 0,92× ATK ; poison : 3 % des PV max par action pour la cible, 2 actions. | 49.90 % | -0.10 pp | ±0.71 pp | à renforcer |
| 80 | Light Yagami | UR | Tertiaire | Light Yagami : Crise cardiaque — Marque persistante | 1,054× ATK ; poison : 2 % des PV max par action pour la cible, 2 actions. | 54.40 % | +4.40 pp | ±1.27 pp | dans la marge |
| 80 | Light Yagami | UR | Ultime | Light Yagami — Déchaînement : Crise cardiaque | 1,15× ATK ; poison : 8 % des PV max par action pour la cible, 3 actions. | 51.70 % | +1.70 pp | ±0.84 pp | dans la marge |
| 85 | Kakashi Hatake | UR | Base | Kunai copié | critique +3 points pour le lanceur, pour sa prochaine action | 50.60 % | +0.60 pp | ±0.48 pp | dans la marge |
| 85 | Kakashi Hatake | UR | Secondaire | Raikiri | 1,25× ATK, ignore 10 % de la DEF, traverse les boucliers. | 62.80 % | +12.80 pp | ±2.05 pp | trop fort |
| 85 | Kakashi Hatake | UR | Tertiaire | Kakashi Hatake : Kunai copié — Visée précise | 1,054× ATK ; critique +6 points pour le lanceur, 1 action. | 53.30 % | +3.30 pp | ±1.09 pp | dans la marge |
| 85 | Kakashi Hatake | UR | Ultime | Kamui — Éclair copié | 1,8× ATK, traverse les boucliers. | 57.00 % | +7.00 pp | ±1.52 pp | dans la marge |
| 86 | Rei Ayanami | SSR | Base | Frappe inspirée de Champ A.T. | bouclier de 0,5 % des PV max pour le lanceur | 51.10 % | +1.10 pp | ±0.64 pp | dans la marge |
| 86 | Rei Ayanami | SSR | Secondaire | Champ A.T. | 0,4× ATK sur tous les ennemis ; bouclier de 3 % des PV max pour l'équipe. | 50.20 % | +0.20 pp | ±2.68 pp | dans la marge |
| 86 | Rei Ayanami | SSR | Tertiaire | Rei Ayanami : Champ A.T. — Garde protectrice | 1,054× ATK ; bouclier de 6 % des PV max pour le lanceur. | 55.60 % | +5.60 pp | ±1.49 pp | dans la marge |
| 86 | Rei Ayanami | SSR | Ultime | Rei Ayanami — Déchaînement : Champ A.T. | 0,5× ATK sur tous les ennemis ; bouclier de 20 % des PV max pour l'équipe. | 63.20 % | +13.20 pp | ±1.97 pp | trop fort |
| 89 | Shinji Ikari | SSR | Base | Frappe inspirée de Synchronisation | ATK +3 % pour le lanceur, pour sa prochaine action | 51.20 % | +1.20 pp | ±0.73 pp | dans la marge |
| 89 | Shinji Ikari | SSR | Secondaire | Synchronisation | 0,4× ATK sur tous les ennemis ; ATK +7 % pour l'équipe, 1 action. | 48.00 % | -2.00 pp | ±2.74 pp | à renforcer |
| 89 | Shinji Ikari | SSR | Tertiaire | Shinji Ikari : Synchronisation — Élan bref | 1,054× ATK ; ATK +8 % pour le lanceur, 1 action. | 54.50 % | +4.50 pp | ±1.29 pp | dans la marge |
| 89 | Shinji Ikari | SSR | Ultime | Shinji Ikari — Déchaînement : Synchronisation | 1,35× ATK ; ATK +20 % pour le lanceur, 2 actions. | 55.70 % | +5.70 pp | ±1.42 pp | dans la marge |
| 94 | Asuka Langley Souryuu | SSR | Base | Frappe inspirée de Unit-02 déchaîné | ATK +3 % pour le lanceur, pour sa prochaine action | 52.40 % | +2.40 pp | ±0.94 pp | dans la marge |
| 94 | Asuka Langley Souryuu | SSR | Secondaire | Unit-02 déchaîné | 0,92× ATK ; ATK +12 % pour le lanceur, 1 action. | 50.40 % | +0.40 pp | ±1.62 pp | dans la marge |
| 94 | Asuka Langley Souryuu | SSR | Tertiaire | Asuka Langley Souryuu : Unit-02 déchaîné — Élan bref | 1,054× ATK ; ATK +8 % pour le lanceur, 1 action. | 53.00 % | +3.00 pp | ±1.33 pp | dans la marge |
| 94 | Asuka Langley Souryuu | SSR | Ultime | Asuka Langley Souryuu — Déchaînement : Unit-02 déchaîné | 1,35× ATK ; ATK +20 % pour le lanceur, 2 actions. | 59.90 % | +9.90 pp | ±1.75 pp | trop fort |
| 207 | Tooru Honda | SSR | Base | Frappe inspirée de Sourire de Tooru | bouclier de 2 % des PV max pour le lanceur | 53.10 % | +3.10 pp | ±1.56 pp | dans la marge |
| 207 | Tooru Honda | SSR | Secondaire | Sourire de Tooru | 0,4× ATK sur tous les ennemis ; immunité aux malus pour l'équipe, 1 action ; bouclier de 2 % des PV max pour l'équipe. | 48.50 % | -1.50 pp | ±2.76 pp | dans la marge |
| 207 | Tooru Honda | SSR | Tertiaire | Tooru Honda : Sourire de Tooru — Garde protectrice | 1,054× ATK ; bouclier de 6 % des PV max pour le lanceur. | 55.90 % | +5.90 pp | ±1.88 pp | dans la marge |
| 207 | Tooru Honda | SSR | Ultime | Tooru Honda — Déchaînement : Sourire de Tooru | 0,5× ATK sur tous les ennemis ; bouclier de 20 % des PV max pour l'équipe. | 54.90 % | +4.90 pp | ±1.44 pp | dans la marge |
| 209 | Kyou Souma | SSR | Base | Frappe inspirée de Rage du chat | esquive +3 points pour le lanceur, jusqu'à sa prochaine action | 54.30 % | +4.30 pp | ±2.20 pp | dans la marge |
| 209 | Kyou Souma | SSR | Secondaire | Rage du chat | 0,66× ATK ; esquive +18 % pour le lanceur, 1 action. | 37.20 % | -12.80 pp | ±2.67 pp | à renforcer |
| 209 | Kyou Souma | SSR | Tertiaire | Kyou Souma : Rage du chat — Pas de côté | 1,054× ATK ; esquive +6 % pour le lanceur, 1 action. | 52.50 % | +2.50 pp | ±1.77 pp | dans la marge |
| 209 | Kyou Souma | SSR | Ultime | Kyou Souma — Déchaînement : Rage du chat | 1,25× ATK ; esquive +30 % pour le lanceur, 2 actions. | 58.70 % | +8.70 pp | ±1.86 pp | trop fort |
| 210 | Kisuke Urahara | SSR | Base | Frappe inspirée de Benihime | DEF −3 % pour la cible, pour sa prochaine action | 50.80 % | +0.80 pp | ±0.62 pp | dans la marge |
| 210 | Kisuke Urahara | SSR | Secondaire | Benihime | 0,85× ATK ; DEF −15 % pour la cible, 1 action. | 49.60 % | -0.40 pp | ±1.11 pp | à renforcer |
| 210 | Kisuke Urahara | SSR | Tertiaire | Kisuke Urahara : Benihime — Brèche tactique | 1,054× ATK ; DEF −8 % pour la cible, 1 action. | 52.80 % | +2.80 pp | ±1.22 pp | dans la marge |
| 210 | Kisuke Urahara | SSR | Ultime | Kisuke Urahara — Déchaînement : Benihime | 1,45× ATK ; DEF −20 % pour la cible, 2 actions. | 53.90 % | +3.90 pp | ±1.18 pp | dans la marge |
| 246 | Gokuu Son | SSR | Base | Frappe inspirée de Kaio-ken | ATK +3 % pour le lanceur, pour sa prochaine action | 50.90 % | +0.90 pp | ±0.58 pp | dans la marge |
| 246 | Gokuu Son | SSR | Secondaire | Kaio-ken | 0,92× ATK ; ATK +12 % pour le lanceur, 1 action. | 50.50 % | +0.50 pp | ±1.81 pp | dans la marge |
| 246 | Gokuu Son | SSR | Tertiaire | Gokuu Son : Kaio-ken — Élan bref | 1,054× ATK ; ATK +8 % pour le lanceur, 1 action. | 54.50 % | +4.50 pp | ±1.40 pp | dans la marge |
| 246 | Gokuu Son | SSR | Ultime | Gokuu Son — Déchaînement : Kaio-ken | 1,35× ATK ; ATK +20 % pour le lanceur, 2 actions. | 54.60 % | +4.60 pp | ±1.27 pp | dans la marge |
| 305 | Sanji | SSR | Base | Coup de pied enflammé | ATK +3 % pour le lanceur, pour sa prochaine action | 51.70 % | +1.70 pp | ±0.97 pp | dans la marge |
| 305 | Sanji | SSR | Secondaire | Diable Jambe | 0,96× ATK, ignore 15 % de la DEF. | 52.30 % | +2.30 pp | ±1.07 pp | dans la marge |
| 305 | Sanji | SSR | Tertiaire | Sanji : Coup de pied enflammé — Élan bref | 1,054× ATK ; ATK +8 % pour le lanceur, 1 action. | 53.70 % | +3.70 pp | ±1.45 pp | dans la marge |
| 305 | Sanji | SSR | Ultime | Sanji — Déchaînement : Coup de pied enflammé | 1,35× ATK ; ATK +20 % pour le lanceur, 2 actions. | 62.20 % | +12.20 pp | ±1.88 pp | trop fort |
| 309 | Chopper Tony Tony | SSR | Base | Coup de sabot | rend 2 % des PV max au lanceur | 51.60 % | +1.60 pp | ±0.87 pp | dans la marge |
| 309 | Chopper Tony Tony | SSR | Secondaire | Rumble Ball | 0,4× ATK sur tous les ennemis ; soigne l'équipe de 9 % des PV max ; retire les malus de l'équipe. | 53.20 % | +3.20 pp | ±2.47 pp | dans la marge |
| 309 | Chopper Tony Tony | SSR | Tertiaire | Chopper Tony Tony : Coup de sabot — Second souffle | 1,054× ATK ; soigne le lanceur de 5 % des PV max. | 51.70 % | +1.70 pp | ±1.15 pp | dans la marge |
| 309 | Chopper Tony Tony | SSR | Ultime | Horn Point — Réanimation | réanime un allié mort avec 35 % de ses PV max (une fois par combat) ; soigne l'équipe de 15 % des PV max. | 62.60 % | +12.60 pp | ±1.90 pp | trop fort |
| 417 | Lelouch Lamperouge | UR | Base | Frappe inspirée de Geass | ATK −3 % pour la cible, pour sa prochaine action | 51.60 % | +1.60 pp | ±0.77 pp | dans la marge |
| 417 | Lelouch Lamperouge | UR | Secondaire | Geass | 1,1× ATK ; silence sur la cible (sort de base seulement), 1 action; sans effet sur les boss. | 47.10 % | -2.90 pp | ±2.85 pp | à renforcer |
| 417 | Lelouch Lamperouge | UR | Tertiaire | Lelouch Lamperouge : Geass — Pression ciblée | 1,054× ATK ; ATK −8 % pour la cible, 1 action. | 54.10 % | +4.10 pp | ±1.33 pp | dans la marge |
| 417 | Lelouch Lamperouge | UR | Ultime | Lelouch Lamperouge — Déchaînement : Geass | 1,3× ATK ; ATK −20 % pour la cible, 2 actions. | 57.00 % | +7.00 pp | ±1.52 pp | dans la marge |
| 422 | Guts | UR | Base | Coup de Dragonslayer | ignore 3 % de la DEF sur la prochaine attaque du lanceur | 51.30 % | +1.30 pp | ±0.75 pp | dans la marge |
| 422 | Guts | UR | Secondaire | Dragonslayer | 1,0779999999999998× ATK, traverse les boucliers. | 52.60 % | +2.60 pp | ±1.15 pp | dans la marge |
| 422 | Guts | UR | Tertiaire | Guts : Coup de Dragonslayer — Percée mesurée | 1,224× ATK, ignore 12 % de la DEF. | 61.70 % | +11.70 pp | ±2.27 pp | trop fort |
| 422 | Guts | UR | Ultime | Berserk — Dragonslayer | 1,55× ATK, ignore 30 % de la DEF, coup critique assuré. | 72.00 % | +22.00 pp | ±2.18 pp | trop fort |
| 424 | Griffith | SSR | Base | Pointe de rapière | critique +3 points pour le lanceur, pour sa prochaine action | 50.40 % | +0.40 pp | ±0.39 pp | à renforcer |
| 424 | Griffith | SSR | Secondaire | Éclipse | 0,4× ATK sur tous les ennemis ; silence sur tous les ennemis (sort de base seulement), 1 action; sans effet sur les boss. | 57.20 % | +7.20 pp | ±2.76 pp | dans la marge |
| 424 | Griffith | SSR | Tertiaire | Griffith : Pointe de rapière — Visée précise | 1,054× ATK ; critique +6 points pour le lanceur, 1 action. | 53.20 % | +3.20 pp | ±1.21 pp | dans la marge |
| 424 | Griffith | SSR | Ultime | Éclipse | 0,68× ATK sur tous les ennemis ; soigne le lanceur de 25 % des PV max ; ATK +20 % pour le lanceur, 2 actions. | 53.80 % | +3.80 pp | ±1.20 pp | dans la marge |
| 434 | Eikichi Onizuka | SSR | Base | Frappe inspirée de Leçon de vie | DEF +3 % pour le lanceur, pour sa prochaine action | 50.90 % | +0.90 pp | ±0.58 pp | dans la marge |
| 434 | Eikichi Onizuka | SSR | Secondaire | Leçon de vie | 0,4× ATK sur tous les ennemis ; DEF +8 % pour l'équipe, 2 actions. | 50.90 % | +0.90 pp | ±2.78 pp | dans la marge |
| 434 | Eikichi Onizuka | SSR | Tertiaire | Eikichi Onizuka : Leçon de vie — Garde resserrée | 1,054× ATK ; DEF +8 % pour le lanceur, 1 action. | 54.00 % | +4.00 pp | ±1.34 pp | dans la marge |
| 434 | Eikichi Onizuka | SSR | Ultime | Eikichi Onizuka — Déchaînement : Leçon de vie | 0,45× ATK sur tous les ennemis ; DEF +20 % pour l'équipe, 2 actions. | 49.70 % | -0.30 pp | ±0.76 pp | à renforcer |
| 458 | Revy | SSR | Base | Frappe inspirée de Two Hands | ATK −3 % pour la cible, pour sa prochaine action | 50.30 % | +0.30 pp | ±0.52 pp | à renforcer |
| 458 | Revy | SSR | Secondaire | Two Hands | 0,4× ATK sur tous les ennemis. | 45.70 % | -4.30 pp | ±2.76 pp | à renforcer |
| 458 | Revy | SSR | Tertiaire | Revy : Two Hands — Pression ciblée | 1,054× ATK ; ATK −8 % pour la cible, 1 action. | 52.40 % | +2.40 pp | ±0.98 pp | dans la marge |
| 458 | Revy | SSR | Ultime | Revy — Déchaînement : Two Hands | 1,3× ATK ; ATK −20 % pour la cible, 2 actions. | 52.40 % | +2.40 pp | ±0.94 pp | dans la marge |
| 497 | Artoria Pendragon | SSR | Base | Frappe inspirée de Excalibur | ignore 3 % de la DEF sur la prochaine attaque du lanceur | 50.90 % | +0.90 pp | ±0.65 pp | dans la marge |
| 497 | Artoria Pendragon | SSR | Secondaire | Excalibur | 1,0899999999999999× ATK, traverse les boucliers. | 53.30 % | +3.30 pp | ±1.19 pp | dans la marge |
| 497 | Artoria Pendragon | SSR | Tertiaire | Artoria Pendragon : Excalibur — Percée mesurée | 1,224× ATK, ignore 12 % de la DEF. | 62.50 % | +12.50 pp | ±2.00 pp | trop fort |
| 497 | Artoria Pendragon | SSR | Ultime | Artoria Pendragon — Déchaînement : Excalibur | 1,65× ATK, ignore 40 % de la DEF. | 66.60 % | +16.60 pp | ±2.08 pp | trop fort |
| 498 | Rin Toosaka | SSR | Base | Frappe inspirée de Gemmes de Tohsaka | ATK −3 % pour la cible, pour sa prochaine action | 51.20 % | +1.20 pp | ±0.73 pp | dans la marge |
| 498 | Rin Toosaka | SSR | Secondaire | Gemmes de Tohsaka | 0,4× ATK sur tous les ennemis. | 39.90 % | -10.10 pp | ±2.79 pp | à renforcer |
| 498 | Rin Toosaka | SSR | Tertiaire | Rin Toosaka : Gemmes de Tohsaka — Pression ciblée | 1,054× ATK ; ATK −8 % pour la cible, 1 action. | 54.20 % | +4.20 pp | ±1.39 pp | dans la marge |
| 498 | Rin Toosaka | SSR | Ultime | Rin Toosaka — Déchaînement : Gemmes de Tohsaka | 1,3× ATK ; ATK −20 % pour la cible, 2 actions. | 54.70 % | +4.70 pp | ±1.37 pp | dans la marge |
| 500 | Sakura Matou | UR | Base | Frappe inspirée de Vers de Zouken | poison : 0,5 % des PV max de la cible à sa prochaine action | 50.60 % | +0.60 pp | ±0.48 pp | dans la marge |
| 500 | Sakura Matou | UR | Secondaire | Vers de Zouken | 0,4× ATK sur tous les ennemis ; poison : 3 % des PV max par action pour tous les ennemis, 2 actions. | 58.20 % | +8.20 pp | ±2.47 pp | dans la marge |
| 500 | Sakura Matou | UR | Tertiaire | Sakura Matou : Vers de Zouken — Marque persistante | 1,054× ATK ; poison : 2 % des PV max par action pour la cible, 2 actions. | 52.90 % | +2.90 pp | ±1.17 pp | dans la marge |
| 500 | Sakura Matou | UR | Ultime | Sakura Matou — Déchaînement : Vers de Zouken | 1,15× ATK ; poison : 8 % des PV max par action pour la cible, 3 actions. | 51.30 % | +1.30 pp | ±0.75 pp | dans la marge |
| 507 | Howl | SSR | Base | Frappe inspirée de Château ambulant | bouclier de 2 % des PV max pour le lanceur | 51.90 % | +1.90 pp | ±1.01 pp | dans la marge |
| 507 | Howl | SSR | Secondaire | Château ambulant | 0,4× ATK sur tous les ennemis ; bouclier de 3 % des PV max pour l'équipe. | 53.40 % | +3.40 pp | ±2.80 pp | dans la marge |
| 507 | Howl | SSR | Tertiaire | Howl : Château ambulant — Garde protectrice | 1,054× ATK ; bouclier de 6 % des PV max pour le lanceur. | 54.90 % | +4.90 pp | ±1.42 pp | dans la marge |
| 507 | Howl | SSR | Ultime | Howl — Déchaînement : Château ambulant | 0,5× ATK sur tous les ennemis ; bouclier de 20 % des PV max pour l'équipe. | 53.80 % | +3.80 pp | ±1.16 pp | dans la marge |
| 672 | Gintoki Sakata | UR | Base | Frappe inspirée de Lame de bois | critique +3 points pour le lanceur, pour sa prochaine action | 50.50 % | +0.50 pp | ±0.44 pp | à renforcer |
| 672 | Gintoki Sakata | UR | Secondaire | Lame de bois | 1,237× ATK. | 57.60 % | +7.60 pp | ±1.65 pp | dans la marge |
| 672 | Gintoki Sakata | UR | Tertiaire | Gintoki Sakata : Lame de bois — Visée précise | 1,054× ATK ; critique +6 points pour le lanceur, 1 action. | 52.20 % | +2.20 pp | ±0.94 pp | dans la marge |
| 672 | Gintoki Sakata | UR | Ultime | Gintoki Sakata — Déchaînement : Lame de bois | 1,55× ATK ; critique +35 points pour le lanceur, 2 actions. | 50.20 % | +0.20 pp | ±0.28 pp | à renforcer |
| 702 | Nana Oosaki | SSR | Base | Frappe inspirée de Black Stones | ATK +3 % pour le lanceur, pour sa prochaine action | 50.70 % | +0.70 pp | ±0.59 pp | dans la marge |
| 702 | Nana Oosaki | SSR | Secondaire | Black Stones | 0,4× ATK sur tous les ennemis ; ATK +7 % pour l'équipe, 1 action. | 54.50 % | +4.50 pp | ±2.68 pp | dans la marge |
| 702 | Nana Oosaki | SSR | Tertiaire | Nana Oosaki : Black Stones — Élan bref | 1,054× ATK ; ATK +8 % pour le lanceur, 1 action. | 52.10 % | +2.10 pp | ±1.27 pp | dans la marge |
| 702 | Nana Oosaki | SSR | Ultime | Nana Oosaki — Déchaînement : Black Stones | 1,35× ATK ; ATK +20 % pour le lanceur, 2 actions. | 52.00 % | +2.00 pp | ±0.98 pp | dans la marge |
| 718 | Kenzou Tenma | SSR | Base | Frappe inspirée de Le serment du médecin | rend 2 % des PV max au lanceur | 50.50 % | +0.50 pp | ±0.59 pp | dans la marge |
| 718 | Kenzou Tenma | SSR | Secondaire | Le serment du médecin | 0,4× ATK sur tous les ennemis ; soigne l'équipe de 9 % des PV max ; retire les malus de l'équipe. | 49.70 % | -0.30 pp | ±2.44 pp | dans la marge |
| 718 | Kenzou Tenma | SSR | Tertiaire | Kenzou Tenma : Le serment du médecin — Second souffle | 1,054× ATK ; soigne le lanceur de 5 % des PV max. | 52.30 % | +2.30 pp | ±1.00 pp | dans la marge |
| 718 | Kenzou Tenma | SSR | Ultime | Kenzou Tenma — Déchaînement : Le serment du médecin | 0,4× ATK sur tous les ennemis ; soigne l'équipe de 30 % des PV max ; retire les malus de l'équipe. | 53.00 % | +3.00 pp | ±1.24 pp | dans la marge |
| 719 | Johan Liebert | SSR | Base | Frappe inspirée de Le monstre sans nom | ATK −3 % pour la cible, pour sa prochaine action | 50.70 % | +0.70 pp | ±0.59 pp | dans la marge |
| 719 | Johan Liebert | SSR | Secondaire | Le monstre sans nom | 1,06× ATK ; silence sur la cible (sort de base seulement), 1 action; sans effet sur les boss. | 48.60 % | -1.40 pp | ±2.81 pp | dans la marge |
| 719 | Johan Liebert | SSR | Tertiaire | Johan Liebert : Le monstre sans nom — Pression ciblée | 1,054× ATK ; ATK −8 % pour la cible, 1 action. | 52.20 % | +2.20 pp | ±1.06 pp | dans la marge |
| 719 | Johan Liebert | SSR | Ultime | Johan Liebert — Déchaînement : Le monstre sans nom | 1,3× ATK ; ATK −20 % pour la cible, 2 actions. | 54.30 % | +4.30 pp | ±1.23 pp | dans la marge |
| 723 | Nami | SSR | Base | Frappe du Clima-Tact | ATK −3 % pour la cible, pour sa prochaine action | 51.00 % | +1.00 pp | ±0.61 pp | dans la marge |
| 723 | Nami | SSR | Secondaire | Thunderbolt Tempo | 0,4× ATK sur tous les ennemis ; ATK −5 % pour tous les ennemis, 1 action. | 58.90 % | +8.90 pp | ±2.71 pp | trop fort |
| 723 | Nami | SSR | Tertiaire | Nami : Frappe du Clima-Tact — Pression ciblée | 1,054× ATK ; ATK −8 % pour la cible, 1 action. | 53.10 % | +3.10 pp | ±1.26 pp | dans la marge |
| 723 | Nami | SSR | Ultime | Nami — Déchaînement : Frappe du Clima-Tact | 1,3× ATK ; ATK −20 % pour la cible, 2 actions. | 53.40 % | +3.40 pp | ±1.14 pp | dans la marge |
| 724 | Usopp | SSR | Base | Étoile explosive | poison : 0,5 % des PV max de la cible à sa prochaine action | 50.50 % | +0.50 pp | ±0.44 pp | à renforcer |
| 724 | Usopp | SSR | Secondaire | Kemuri Boshi | 0,5× ATK sur tous les ennemis ; esquive +5 % pour l'équipe, 1 action. | 62.60 % | +12.60 pp | ±2.89 pp | trop fort |
| 724 | Usopp | SSR | Tertiaire | Usopp : Étoile explosive — Marque persistante | 1,054× ATK ; poison : 2 % des PV max par action pour la cible, 2 actions. | 50.60 % | +0.60 pp | ±0.73 pp | dans la marge |
| 724 | Usopp | SSR | Ultime | Usopp — Déchaînement : Étoile explosive | 1,15× ATK ; poison : 8 % des PV max par action pour la cible, 3 actions. | 50.20 % | +0.20 pp | ±0.28 pp | à renforcer |
| 835 | Misa Amane | SSR | Base | Frappe inspirée de Yeux de shinigami | critique +3 points pour le lanceur, pour sa prochaine action | 50.10 % | +0.10 pp | ±0.20 pp | à renforcer |
| 835 | Misa Amane | SSR | Secondaire | Yeux de shinigami | 0,56× ATK ; critique +8 points pour l'équipe, 1 action. | 39.70 % | -10.30 pp | ±2.07 pp | à renforcer |
| 835 | Misa Amane | SSR | Tertiaire | Misa Amane : Yeux de shinigami — Visée précise | 1,054× ATK ; critique +6 points pour le lanceur, 1 action. | 51.20 % | +1.20 pp | ±0.67 pp | dans la marge |
| 835 | Misa Amane | SSR | Ultime | Misa Amane — Déchaînement : Yeux de shinigami | 1,55× ATK ; critique +35 points pour le lanceur, 2 actions. | 50.70 % | +0.70 pp | ±0.52 pp | dans la marge |
| 908 | Yoruichi Shihouin | SSR | Base | Frappe inspirée de Shunko | esquive +3 points pour le lanceur, jusqu'à sa prochaine action | 53.90 % | +3.90 pp | ±2.50 pp | dans la marge |
| 908 | Yoruichi Shihouin | SSR | Secondaire | Shunko | 0,66× ATK ; esquive +18 % pour le lanceur, 1 action. | 55.70 % | +5.70 pp | ±2.81 pp | dans la marge |
| 908 | Yoruichi Shihouin | SSR | Tertiaire | Yoruichi Shihouin : Shunko — Pas de côté | 1,054× ATK ; esquive +6 % pour le lanceur, 1 action. | 55.00 % | +5.00 pp | ±2.41 pp | dans la marge |
| 908 | Yoruichi Shihouin | SSR | Ultime | Yoruichi Shihouin — Déchaînement : Shunko | 1,25× ATK ; esquive +30 % pour le lanceur, 2 actions. | 51.90 % | +1.90 pp | ±0.84 pp | dans la marge |
| 913 | Vegeta | SSR | Base | Frappe inspirée de Final Flash | ignore 3 % de la DEF sur la prochaine attaque du lanceur | 50.50 % | +0.50 pp | ±0.52 pp | dans la marge |
| 913 | Vegeta | SSR | Secondaire | Final Flash | 1,0899999999999999× ATK, traverse les boucliers. | 51.00 % | +1.00 pp | ±0.83 pp | dans la marge |
| 913 | Vegeta | SSR | Tertiaire | Vegeta : Final Flash — Percée mesurée | 1,224× ATK, ignore 12 % de la DEF. | 59.10 % | +9.10 pp | ±1.78 pp | trop fort |
| 913 | Vegeta | SSR | Ultime | Vegeta — Déchaînement : Final Flash | 1,65× ATK, ignore 40 % de la DEF. | 52.20 % | +2.20 pp | ±0.90 pp | dans la marge |
| 1086 | Sousuke Aizen | SSR | Base | Frappe inspirée de Kyoka Suigetsu | critique −3 points pour la cible, pour sa prochaine action | 50.10 % | +0.10 pp | ±0.20 pp | à renforcer |
| 1086 | Sousuke Aizen | SSR | Secondaire | Kyoka Suigetsu | 0,4× ATK sur tous les ennemis ; critique −8 points pour tous les ennemis, 1 action ; DEF −8 % pour tous les ennemis, 1 action. | 56.70 % | +6.70 pp | ±2.50 pp | dans la marge |
| 1086 | Sousuke Aizen | SSR | Tertiaire | Sousuke Aizen : Kyoka Suigetsu — Trouble-fête | 1,054× ATK ; critique −6 points pour la cible, 1 action. | 51.60 % | +1.60 pp | ±0.95 pp | dans la marge |
| 1086 | Sousuke Aizen | SSR | Ultime | Sousuke Aizen — Déchaînement : Kyoka Suigetsu | 1,25× ATK ; critique −25 points pour la cible, 2 actions. | 50.80 % | +0.80 pp | ±0.55 pp | dans la marge |
| 1111 | C.C. | SSR | Base | Frappe inspirée de Code | rend 2 % des PV max au lanceur | 51.20 % | +1.20 pp | ±0.67 pp | dans la marge |
| 1111 | C.C. | SSR | Secondaire | Code | 0,4× ATK sur tous les ennemis ; soin sur la durée de 4 % des PV max pour l'équipe, 2 actions. | 45.10 % | -4.90 pp | ±2.73 pp | à renforcer |
| 1111 | C.C. | SSR | Tertiaire | C.C. : Code — Second souffle | 1,054× ATK ; soigne le lanceur de 5 % des PV max. | 51.90 % | +1.90 pp | ±0.97 pp | dans la marge |
| 1111 | C.C. | SSR | Ultime | C.C. — Déchaînement : Code | 0,4× ATK sur tous les ennemis ; soigne l'équipe de 30 % des PV max ; retire les malus de l'équipe. | 56.10 % | +6.10 pp | ±1.66 pp | dans la marge |
| 1259 | Misato Katsuragi | SSR | Base | Frappe inspirée de Ordre de tir | critique +3 points pour le lanceur, pour sa prochaine action | 50.30 % | +0.30 pp | ±0.34 pp | à renforcer |
| 1259 | Misato Katsuragi | SSR | Secondaire | Ordre de tir | 0,56× ATK ; critique +8 points pour l'équipe, 1 action. | 33.50 % | -16.50 pp | ±2.21 pp | à renforcer |
| 1259 | Misato Katsuragi | SSR | Tertiaire | Misato Katsuragi : Ordre de tir — Visée précise | 1,054× ATK ; critique +6 points pour le lanceur, 1 action. | 52.30 % | +2.30 pp | ±1.04 pp | dans la marge |
| 1259 | Misato Katsuragi | SSR | Ultime | Misato Katsuragi — Déchaînement : Ordre de tir | 1,55× ATK ; critique +35 points pour le lanceur, 2 actions. | 58.50 % | +8.50 pp | ±1.65 pp | trop fort |
| 1662 | Gaara | SSR | Base | Poing de sable | DEF +3 % pour le lanceur, pour sa prochaine action | 50.90 % | +0.90 pp | ±0.65 pp | dans la marge |
| 1662 | Gaara | SSR | Secondaire | Armure de sable | 0,4× ATK sur tous les ennemis ; bouclier de 3 % des PV max pour l'équipe. | 58.10 % | +8.10 pp | ±2.77 pp | dans la marge |
| 1662 | Gaara | SSR | Tertiaire | Gaara : Poing de sable — Garde resserrée | 1,054× ATK ; DEF +8 % pour le lanceur, 1 action. | 54.30 % | +4.30 pp | ±1.38 pp | dans la marge |
| 1662 | Gaara | SSR | Ultime | Gaara — Déchaînement : Poing de sable | 0,45× ATK sur tous les ennemis ; DEF +20 % pour l'équipe, 2 actions. | 50.20 % | +0.20 pp | ±0.62 pp | à renforcer |
| 2007 | Shikamaru Nara | SSR | Base | Ombre croisée | ATK −3 % pour la cible, pour sa prochaine action | 51.40 % | +1.40 pp | ±0.78 pp | dans la marge |
| 2007 | Shikamaru Nara | SSR | Secondaire | Possession des ombres | 0,432× ATK sur tous les ennemis ; critique −8 points pour tous les ennemis, 1 action ; DEF −8 % pour tous les ennemis, 1 action. | 53.80 % | +3.80 pp | ±2.70 pp | dans la marge |
| 2007 | Shikamaru Nara | SSR | Tertiaire | Shikamaru Nara : Ombre croisée — Pression ciblée | 1,054× ATK ; ATK −8 % pour la cible, 1 action. | 53.70 % | +3.70 pp | ±1.21 pp | dans la marge |
| 2007 | Shikamaru Nara | SSR | Ultime | Possession des ombres | 1,05× ATK ; silence sur la cible (sort de base seulement), 2 actions; sans effet sur les boss ; ATK −20 % pour la cible, 2 actions. | 49.30 % | -0.70 pp | ±1.05 pp | à renforcer |
| 2072 | Ace Portgas | SSR | Base | Flamme légère | poison : 0,5 % des PV max de la cible à sa prochaine action | 50.30 % | +0.30 pp | ±0.59 pp | à renforcer |
| 2072 | Ace Portgas | SSR | Secondaire | Hiken | 0,96× ATK, rend 24 % des dégâts en PV. | 48.70 % | -1.30 pp | ±0.93 pp | à renforcer |
| 2072 | Ace Portgas | SSR | Tertiaire | Ace Portgas : Flamme légère — Marque persistante | 1,054× ATK ; poison : 2 % des PV max par action pour la cible, 2 actions. | 52.90 % | +2.90 pp | ±1.26 pp | dans la marge |
| 2072 | Ace Portgas | SSR | Ultime | Ace Portgas — Déchaînement : Flamme légère | 1,15× ATK ; poison : 8 % des PV max par action pour la cible, 3 actions. | 51.50 % | +1.50 pp | ±0.85 pp | dans la marge |
| 2075 | Kamina | SSR | Base | Frappe inspirée de Qui crois-tu que je sois ?! | ATK +3 % pour le lanceur, pour sa prochaine action | 51.00 % | +1.00 pp | ±0.67 pp | dans la marge |
| 2075 | Kamina | SSR | Secondaire | Qui crois-tu que je sois ?! | 0,4× ATK sur tous les ennemis ; ATK +7 % pour l'équipe, 1 action. | 56.90 % | +6.90 pp | ±2.61 pp | dans la marge |
| 2075 | Kamina | SSR | Tertiaire | Kamina : Qui crois-tu que je sois ?! — Élan bref | 1,054× ATK ; ATK +8 % pour le lanceur, 1 action. | 56.70 % | +6.70 pp | ±1.62 pp | dans la marge |
| 2075 | Kamina | SSR | Ultime | Kamina — Déchaînement : Qui crois-tu que je sois ?! | 1,35× ATK ; ATK +20 % pour le lanceur, 2 actions. | 53.30 % | +3.30 pp | ±1.09 pp | dans la marge |
| 2219 | Lain Iwakura | SSR | Base | Frappe inspirée de Le Wired | ATK −3 % pour la cible, pour sa prochaine action | 50.50 % | +0.50 pp | ±0.44 pp | à renforcer |
| 2219 | Lain Iwakura | SSR | Secondaire | Le Wired | 1,06× ATK ; silence sur la cible (sort de base seulement), 1 action; sans effet sur les boss. | 50.30 % | +0.30 pp | ±2.92 pp | dans la marge |
| 2219 | Lain Iwakura | SSR | Tertiaire | Lain Iwakura : Le Wired — Pression ciblée | 1,054× ATK ; ATK −8 % pour la cible, 1 action. | 52.60 % | +2.60 pp | ±1.12 pp | dans la marge |
| 2219 | Lain Iwakura | SSR | Ultime | Lain Iwakura — Déchaînement : Le Wired | 1,3× ATK ; ATK −20 % pour la cible, 2 actions. | 51.70 % | +1.70 pp | ±0.80 pp | dans la marge |
| 2257 | Simon | SSR | Base | Frappe inspirée de Giga Drill Break | ignore 3 % de la DEF sur la prochaine attaque du lanceur | 50.80 % | +0.80 pp | ±0.55 pp | dans la marge |
| 2257 | Simon | SSR | Secondaire | Giga Drill Break | 1,0899999999999999× ATK, traverse les boucliers. | 52.00 % | +2.00 pp | ±1.13 pp | dans la marge |
| 2257 | Simon | SSR | Tertiaire | Simon : Giga Drill Break — Percée mesurée | 1,224× ATK, ignore 12 % de la DEF. | 60.60 % | +10.60 pp | ±1.90 pp | trop fort |
| 2257 | Simon | SSR | Ultime | Simon — Déchaînement : Giga Drill Break | 1,65× ATK, ignore 40 % de la DEF. | 52.80 % | +2.80 pp | ±1.01 pp | dans la marge |
| 2423 | Jiraiya | SSR | Base | Rasengan crapaud | DEF −3 % pour la cible, pour sa prochaine action | 50.80 % | +0.80 pp | ±0.55 pp | dans la marge |
| 2423 | Jiraiya | SSR | Secondaire | Rasengan crapaud | 0,5× ATK sur tous les ennemis ; DEF −8 % pour tous les ennemis, 1 action. | 51.70 % | +1.70 pp | ±2.53 pp | dans la marge |
| 2423 | Jiraiya | SSR | Tertiaire | Jiraiya : Rasengan crapaud — Brèche tactique | 1,054× ATK ; DEF −8 % pour la cible, 1 action. | 53.30 % | +3.30 pp | ±1.16 pp | dans la marge |
| 2423 | Jiraiya | SSR | Ultime | Jiraiya — Déchaînement : Rasengan crapaud | 1,45× ATK ; DEF −20 % pour la cible, 2 actions. | 50.00 % | +0.00 pp | ±0.00 pp | à renforcer |
| 2514 | Gilgamesh | SSR | Base | Frappe inspirée de Gate of Babylon | ATK −3 % pour la cible, pour sa prochaine action | 50.20 % | +0.20 pp | ±0.39 pp | à renforcer |
| 2514 | Gilgamesh | SSR | Secondaire | Gate of Babylon | 0,4× ATK sur tous les ennemis. | 43.90 % | -6.10 pp | ±2.64 pp | à renforcer |
| 2514 | Gilgamesh | SSR | Tertiaire | Gilgamesh : Gate of Babylon — Pression ciblée | 1,054× ATK ; ATK −8 % pour la cible, 1 action. | 52.50 % | +2.50 pp | ±1.00 pp | dans la marge |
| 2514 | Gilgamesh | SSR | Ultime | Gilgamesh — Déchaînement : Gate of Babylon | 1,3× ATK ; ATK −20 % pour la cible, 2 actions. | 51.50 % | +1.50 pp | ±0.75 pp | dans la marge |
| 3096 | Wolfgang Grimmer | SSR | Base | Frappe inspirée de Interrogatoire | ATK −3 % pour la cible, pour sa prochaine action | 50.20 % | +0.20 pp | ±0.28 pp | à renforcer |
| 3096 | Wolfgang Grimmer | SSR | Secondaire | Interrogatoire | 0,98× ATK ; ATK −12 % pour la cible, 1 action. | 50.50 % | +0.50 pp | ±0.90 pp | dans la marge |
| 3096 | Wolfgang Grimmer | SSR | Tertiaire | Wolfgang Grimmer : Interrogatoire — Pression ciblée | 1,054× ATK ; ATK −8 % pour la cible, 1 action. | 51.80 % | +1.80 pp | ±1.03 pp | dans la marge |
| 3096 | Wolfgang Grimmer | SSR | Ultime | Wolfgang Grimmer — Déchaînement : Interrogatoire | 1,3× ATK ; ATK −20 % pour la cible, 2 actions. | 50.60 % | +0.60 pp | ±0.48 pp | dans la marge |
| 4003 | Joutarou Kuujou | SSR | Base | Frappe inspirée de Star Platinum | ignore 3 % de la DEF sur la prochaine attaque du lanceur | 50.90 % | +0.90 pp | ±0.70 pp | dans la marge |
| 4003 | Joutarou Kuujou | SSR | Secondaire | Star Platinum | 1,0899999999999999× ATK, traverse les boucliers. | 54.40 % | +4.40 pp | ±1.33 pp | dans la marge |
| 4003 | Joutarou Kuujou | SSR | Tertiaire | Joutarou Kuujou : Star Platinum — Percée mesurée | 1,224× ATK, ignore 12 % de la DEF. | 61.50 % | +11.50 pp | ±2.19 pp | trop fort |
| 4003 | Joutarou Kuujou | SSR | Ultime | Joutarou Kuujou — Déchaînement : Star Platinum | 1,65× ATK, ignore 40 % de la DEF. | 59.80 % | +9.80 pp | ±1.79 pp | trop fort |
| 4004 | Dio Brando | SSR | Base | Frappe inspirée de The World | rend 2 % des dégâts infligés en PV | 50.10 % | +0.10 pp | ±0.20 pp | à renforcer |
| 4004 | Dio Brando | SSR | Secondaire | The World | 1,024× ATK, rend 24 % des dégâts en PV. | 51.90 % | +1.90 pp | ±0.93 pp | dans la marge |
| 4004 | Dio Brando | SSR | Tertiaire | Dio Brando : The World — Siphon léger | 1,1560000000000001× ATK, rend 15 % des dégâts en PV. | 55.20 % | +5.20 pp | ±1.42 pp | dans la marge |
| 4004 | Dio Brando | SSR | Ultime | Dio Brando — Déchaînement : The World | 1,55× ATK, rend 65 % des dégâts en PV. | 56.20 % | +6.20 pp | ±1.45 pp | dans la marge |
| 5189 | Erza Scarlet | SSR | Base | Frappe inspirée de Armure Purgatoire | ignore 3 % de la DEF sur la prochaine attaque du lanceur | 50.00 % | +0.00 pp | ±0.39 pp | à renforcer |
| 5189 | Erza Scarlet | SSR | Secondaire | Armure Purgatoire | 0,94× ATK, ignore 15 % de la DEF. | 50.50 % | +0.50 pp | ±0.44 pp | à renforcer |
| 5189 | Erza Scarlet | SSR | Tertiaire | Erza Scarlet : Armure Purgatoire — Percée mesurée | 1,224× ATK, ignore 12 % de la DEF. | 56.90 % | +6.90 pp | ±1.68 pp | dans la marge |
| 5189 | Erza Scarlet | SSR | Ultime | Erza Scarlet — Déchaînement : Armure Purgatoire | 1,65× ATK, ignore 40 % de la DEF. | 52.20 % | +2.20 pp | ±0.90 pp | dans la marge |
| 6356 | Joseph Joestar | UR | Base | Frappe inspirée de Hermit Purple | critique −3 points pour la cible, pour sa prochaine action | 50.70 % | +0.70 pp | ±0.52 pp | dans la marge |
| 6356 | Joseph Joestar | UR | Secondaire | Hermit Purple | 0,4× ATK sur tous les ennemis ; critique −8 points pour tous les ennemis, 1 action ; DEF −8 % pour tous les ennemis, 1 action. | 51.60 % | +1.60 pp | ±2.64 pp | dans la marge |
| 6356 | Joseph Joestar | UR | Tertiaire | Joseph Joestar : Hermit Purple — Trouble-fête | 1,054× ATK ; critique −6 points pour la cible, 1 action. | 52.40 % | +2.40 pp | ±1.02 pp | dans la marge |
| 6356 | Joseph Joestar | UR | Ultime | Joseph Joestar — Déchaînement : Hermit Purple | 1,25× ATK ; critique −25 points pour la cible, 2 actions. | 50.30 % | +0.30 pp | ±0.34 pp | à renforcer |
| 7373 | Holo | SSR | Base | Frappe inspirée de Marchandage | DEF −3 % pour la cible, pour sa prochaine action | 50.00 % | +0.00 pp | ±0.00 pp | à renforcer |
| 7373 | Holo | SSR | Secondaire | Marchandage | 0,85× ATK ; DEF −15 % pour la cible, 1 action. | 47.60 % | -2.40 pp | ±1.09 pp | à renforcer |
| 7373 | Holo | SSR | Tertiaire | Holo : Marchandage — Brèche tactique | 1,054× ATK ; DEF −8 % pour la cible, 1 action. | 52.10 % | +2.10 pp | ±1.08 pp | dans la marge |
| 7373 | Holo | SSR | Ultime | Holo — Déchaînement : Marchandage | 1,45× ATK ; DEF −20 % pour la cible, 2 actions. | 50.60 % | +0.60 pp | ±0.55 pp | dans la marge |
| 8455 | Death the Kid | SSR | Base | Frappe inspirée de Death Cannon | ATK −3 % pour la cible, pour sa prochaine action | 50.50 % | +0.50 pp | ±0.44 pp | à renforcer |
| 8455 | Death the Kid | SSR | Secondaire | Death Cannon | 0,4× ATK sur tous les ennemis. | 47.60 % | -2.40 pp | ±2.75 pp | à renforcer |
| 8455 | Death the Kid | SSR | Tertiaire | Death the Kid : Death Cannon — Pression ciblée | 1,054× ATK ; ATK −8 % pour la cible, 1 action. | 51.50 % | +1.50 pp | ±0.89 pp | dans la marge |
| 8455 | Death the Kid | SSR | Ultime | Death the Kid — Déchaînement : Death Cannon | 1,3× ATK ; ATK −20 % pour la cible, 2 actions. | 50.00 % | +0.00 pp | ±0.00 pp | à renforcer |
| 10010 | Kiritsugu Emiya | SSR | Base | Frappe inspirée de Origine : Time Alter | critique +3 points pour le lanceur, pour sa prochaine action | 50.00 % | +0.00 pp | ±0.00 pp | à renforcer |
| 10010 | Kiritsugu Emiya | SSR | Secondaire | Origine : Time Alter | 1,237× ATK. | 54.30 % | +4.30 pp | ±1.41 pp | dans la marge |
| 10010 | Kiritsugu Emiya | SSR | Tertiaire | Kiritsugu Emiya : Origine : Time Alter — Visée précise | 1,054× ATK ; critique +6 points pour le lanceur, 1 action. | 51.80 % | +1.80 pp | ±0.95 pp | dans la marge |
| 10010 | Kiritsugu Emiya | SSR | Ultime | Kiritsugu Emiya — Déchaînement : Origine : Time Alter | 1,55× ATK ; critique +35 points pour le lanceur, 2 actions. | 50.40 % | +0.40 pp | ±0.39 pp | à renforcer |
| 10138 | Thorfinn Karlsefni | UR | Base | Frappe inspirée de Lame de Thorfinn | ignore 3 % de la DEF sur la prochaine attaque du lanceur | 50.70 % | +0.70 pp | ±0.52 pp | dans la marge |
| 10138 | Thorfinn Karlsefni | UR | Secondaire | Lame de Thorfinn | 0,92× ATK, ignore 15 % de la DEF. | 50.30 % | +0.30 pp | ±0.34 pp | à renforcer |
| 10138 | Thorfinn Karlsefni | UR | Tertiaire | Thorfinn Karlsefni : Lame de Thorfinn — Percée mesurée | 1,224× ATK, ignore 12 % de la DEF. | 61.60 % | +11.60 pp | ±2.19 pp | trop fort |
| 10138 | Thorfinn Karlsefni | UR | Ultime | Thorfinn Karlsefni — Déchaînement : Lame de Thorfinn | 1,65× ATK, ignore 40 % de la DEF. | 62.80 % | +12.80 pp | ±1.91 pp | trop fort |
| 10529 | Giorno Giovanna | SSR | Base | Frappe inspirée de Gold Experience | rend 2 % des PV max au lanceur | 50.10 % | +0.10 pp | ±0.34 pp | à renforcer |
| 10529 | Giorno Giovanna | SSR | Secondaire | Gold Experience | 0,4× ATK sur tous les ennemis ; soin sur la durée de 4 % des PV max pour l'équipe, 2 actions. | 53.10 % | +3.10 pp | ±2.52 pp | dans la marge |
| 10529 | Giorno Giovanna | SSR | Tertiaire | Giorno Giovanna : Gold Experience — Second souffle | 1,054× ATK ; soigne le lanceur de 5 % des PV max. | 51.70 % | +1.70 pp | ±0.89 pp | dans la marge |
| 10529 | Giorno Giovanna | SSR | Ultime | Giorno Giovanna — Déchaînement : Gold Experience | 0,4× ATK sur tous les ennemis ; soigne l'équipe de 30 % des PV max ; retire les malus de l'équipe. | 50.00 % | +0.00 pp | ±0.28 pp | à renforcer |
| 11222 | Jolyne Kuujou | SSR | Base | Frappe inspirée de Stone Free | poison : 0,5 % des PV max de la cible à sa prochaine action | 50.30 % | +0.30 pp | ±0.34 pp | à renforcer |
| 11222 | Jolyne Kuujou | SSR | Secondaire | Stone Free | 0,4× ATK sur tous les ennemis ; poison : 3 % des PV max par action pour tous les ennemis, 2 actions. | 58.70 % | +8.70 pp | ±2.67 pp | trop fort |
| 11222 | Jolyne Kuujou | SSR | Tertiaire | Jolyne Kuujou : Stone Free — Marque persistante | 1,054× ATK ; poison : 2 % des PV max par action pour la cible, 2 actions. | 52.40 % | +2.40 pp | ±0.98 pp | dans la marge |
| 11222 | Jolyne Kuujou | SSR | Ultime | Jolyne Kuujou — Déchaînement : Stone Free | 1,15× ATK ; poison : 8 % des PV max par action pour la cible, 3 actions. | 51.25 % | +1.25 pp | ±0.68 pp | dans la marge |
| 11772 | Gyro Zeppeli | SSR | Base | Frappe inspirée de Steel Ball | critique +3 points pour le lanceur, pour sa prochaine action | 50.70 % | +0.70 pp | ±0.65 pp | dans la marge |
| 11772 | Gyro Zeppeli | SSR | Secondaire | Steel Ball | 1,237× ATK. | 58.00 % | +8.00 pp | ±1.91 pp | trop fort |
| 11772 | Gyro Zeppeli | SSR | Tertiaire | Gyro Zeppeli : Steel Ball — Visée précise | 1,054× ATK ; critique +6 points pour le lanceur, 1 action. | 53.20 % | +3.20 pp | ±1.39 pp | dans la marge |
| 11772 | Gyro Zeppeli | SSR | Ultime | Gyro Zeppeli — Déchaînement : Steel Ball | 1,55× ATK ; critique +35 points pour le lanceur, 2 actions. | 57.00 % | +7.00 pp | ±1.55 pp | dans la marge |
| 12055 | Yoshikage Kira | SSR | Base | Frappe inspirée de Killer Queen | poison : 0,5 % des PV max de la cible à sa prochaine action | 50.30 % | +0.30 pp | ±0.34 pp | à renforcer |
| 12055 | Yoshikage Kira | SSR | Secondaire | Killer Queen | 0,96× ATK ; poison : 3 % des PV max par action pour la cible, 2 actions. | 50.30 % | +0.30 pp | ±0.76 pp | dans la marge |
| 12055 | Yoshikage Kira | SSR | Tertiaire | Yoshikage Kira : Killer Queen — Marque persistante | 1,054× ATK ; poison : 2 % des PV max par action pour la cible, 2 actions. | 52.30 % | +2.30 pp | ±1.07 pp | dans la marge |
| 12055 | Yoshikage Kira | SSR | Ultime | Yoshikage Kira — Déchaînement : Killer Queen | 1,15× ATK ; poison : 8 % des PV max par action pour la cible, 3 actions. | 52.10 % | +2.10 pp | ±0.88 pp | dans la marge |
| 12064 | Taiga Aisaka | SSR | Base | Frappe inspirée de Tigre de poche | ATK +3 % pour le lanceur, pour sa prochaine action | 50.50 % | +0.50 pp | ±0.44 pp | à renforcer |
| 12064 | Taiga Aisaka | SSR | Secondaire | Tigre de poche | 0,92× ATK ; ATK +12 % pour le lanceur, 1 action. | 49.20 % | -0.80 pp | ±1.47 pp | à renforcer |
| 12064 | Taiga Aisaka | SSR | Tertiaire | Taiga Aisaka : Tigre de poche — Élan bref | 1,054× ATK ; ATK +8 % pour le lanceur, 1 action. | 53.10 % | +3.10 pp | ±1.26 pp | dans la marge |
| 12064 | Taiga Aisaka | SSR | Ultime | Taiga Aisaka — Déchaînement : Tigre de poche | 1,35× ATK ; ATK +20 % pour le lanceur, 2 actions. | 51.50 % | +1.50 pp | ±1.01 pp | dans la marge |
| 12659 | Rohan Kishibe | SSR | Base | Frappe inspirée de Heaven's Door | ATK −3 % pour la cible, pour sa prochaine action | 50.60 % | +0.60 pp | ±0.55 pp | dans la marge |
| 12659 | Rohan Kishibe | SSR | Secondaire | Heaven's Door | 0,98× ATK ; ATK −12 % pour la cible, 1 action. | 51.10 % | +1.10 pp | ±0.70 pp | dans la marge |
| 12659 | Rohan Kishibe | SSR | Tertiaire | Rohan Kishibe : Heaven's Door — Pression ciblée | 1,054× ATK ; ATK −8 % pour la cible, 1 action. | 52.00 % | +2.00 pp | ±0.98 pp | dans la marge |
| 12659 | Rohan Kishibe | SSR | Ultime | Rohan Kishibe — Déchaînement : Heaven's Door | 1,3× ATK ; ATK −20 % pour la cible, 2 actions. | 50.30 % | +0.30 pp | ±0.34 pp | à renforcer |
| 13020 | Askeladd | UR | Base | Frappe inspirée de Roi de la guerre | ATK −3 % pour la cible, pour sa prochaine action | 51.30 % | +1.30 pp | ±0.75 pp | dans la marge |
| 13020 | Askeladd | UR | Secondaire | Roi de la guerre | 0,98× ATK ; ATK −12 % pour la cible, 1 action. | 51.30 % | +1.30 pp | ±1.01 pp | dans la marge |
| 13020 | Askeladd | UR | Tertiaire | Askeladd : Roi de la guerre — Pression ciblée | 1,054× ATK ; ATK −8 % pour la cible, 1 action. | 52.70 % | +2.70 pp | ±1.17 pp | dans la marge |
| 13020 | Askeladd | UR | Ultime | Askeladd — Déchaînement : Roi de la guerre | 1,3× ATK ; ATK −20 % pour la cible, 2 actions. | 50.90 % | +0.90 pp | ±0.58 pp | dans la marge |
| 13045 | Bruno Bucciarati | SSR | Base | Frappe inspirée de Sticky Fingers | ATK −3 % pour la cible, pour sa prochaine action | 50.40 % | +0.40 pp | ±0.39 pp | à renforcer |
| 13045 | Bruno Bucciarati | SSR | Secondaire | Sticky Fingers | 1,06× ATK ; silence sur la cible (sort de base seulement), 1 action; sans effet sur les boss. | 44.90 % | -5.10 pp | ±2.92 pp | à renforcer |
| 13045 | Bruno Bucciarati | SSR | Tertiaire | Bruno Bucciarati : Sticky Fingers — Pression ciblée | 1,054× ATK ; ATK −8 % pour la cible, 1 action. | 52.30 % | +2.30 pp | ±0.96 pp | dans la marge |
| 13045 | Bruno Bucciarati | SSR | Ultime | Bruno Bucciarati — Déchaînement : Sticky Fingers | 1,3× ATK ; ATK −20 % pour la cible, 2 actions. | 50.10 % | +0.10 pp | ±0.20 pp | à renforcer |
| 13085 | Jousuke Higashikata | SSR | Base | Frappe inspirée de Crazy Diamond | rend 2 % des PV max au lanceur | 50.80 % | +0.80 pp | ±0.55 pp | dans la marge |
| 13085 | Jousuke Higashikata | SSR | Secondaire | Crazy Diamond | 0,4× ATK sur tous les ennemis ; soigne l'équipe de 9 % des PV max ; retire les malus de l'équipe. | 49.70 % | -0.30 pp | ±2.46 pp | dans la marge |
| 13085 | Jousuke Higashikata | SSR | Tertiaire | Jousuke Higashikata : Crazy Diamond — Second souffle | 1,054× ATK ; soigne le lanceur de 5 % des PV max. | 52.20 % | +2.20 pp | ±1.02 pp | dans la marge |
| 13085 | Jousuke Higashikata | SSR | Ultime | Jousuke Higashikata — Déchaînement : Crazy Diamond | 0,4× ATK sur tous les ennemis ; soigne l'équipe de 30 % des PV max ; retire les malus de l'équipe. | 52.60 % | +2.60 pp | ±1.05 pp | dans la marge |
| 13580 | Ash Lynx | SSR | Base | Frappe inspirée de Coup au but | critique +3 points pour le lanceur, pour sa prochaine action | 50.70 % | +0.70 pp | ±0.52 pp | dans la marge |
| 13580 | Ash Lynx | SSR | Secondaire | Coup au but | 1,237× ATK. | 58.40 % | +8.40 pp | ±1.75 pp | trop fort |
| 13580 | Ash Lynx | SSR | Tertiaire | Ash Lynx : Coup au but — Visée précise | 1,054× ATK ; critique +6 points pour le lanceur, 1 action. | 52.30 % | +2.30 pp | ±1.00 pp | dans la marge |
| 13580 | Ash Lynx | SSR | Ultime | Ash Lynx — Déchaînement : Coup au but | 1,55× ATK ; critique +35 points pour le lanceur, 2 actions. | 55.10 % | +5.10 pp | ±1.33 pp | dans la marge |
| 13767 | Law Trafalgar | SSR | Base | Coupe de Kikoku | ignore 3 % de la DEF sur la prochaine attaque du lanceur | 51.20 % | +1.20 pp | ±0.67 pp | dans la marge |
| 13767 | Law Trafalgar | SSR | Secondaire | Shambles | 1,06× ATK, traverse les boucliers ; DEF −12 % pour la cible, 1 action. | 54.00 % | +4.00 pp | ±1.72 pp | dans la marge |
| 13767 | Law Trafalgar | SSR | Tertiaire | Law Trafalgar : Coupe de Kikoku — Percée mesurée | 1,224× ATK, ignore 12 % de la DEF. | 58.40 % | +8.40 pp | ±2.02 pp | trop fort |
| 13767 | Law Trafalgar | SSR | Ultime | Law Trafalgar — Déchaînement : Coupe de Kikoku | 1,65× ATK, ignore 40 % de la DEF. | 65.10 % | +15.10 pp | ±2.03 pp | trop fort |
| 19492 | Johnny Joestar | SSR | Base | Frappe inspirée de Tusk | ATK −3 % pour la cible, pour sa prochaine action | 50.80 % | +0.80 pp | ±0.62 pp | dans la marge |
| 19492 | Johnny Joestar | SSR | Secondaire | Tusk | 1,0779999999999998× ATK. | 52.60 % | +2.60 pp | ±1.12 pp | dans la marge |
| 19492 | Johnny Joestar | SSR | Tertiaire | Johnny Joestar : Tusk — Pression ciblée | 1,054× ATK ; ATK −8 % pour la cible, 1 action. | 52.50 % | +2.50 pp | ±1.11 pp | dans la marge |
| 19492 | Johnny Joestar | SSR | Ultime | Johnny Joestar — Déchaînement : Tusk | 1,3× ATK ; ATK −20 % pour la cible, 2 actions. | 50.40 % | +0.40 pp | ±0.39 pp | à renforcer |
| 21044 | Rei Kiriyama | SSR | Base | Frappe inspirée de Partie de shogi | DEF −3 % pour la cible, pour sa prochaine action | 50.40 % | +0.40 pp | ±0.48 pp | à renforcer |
| 21044 | Rei Kiriyama | SSR | Secondaire | Partie de shogi | 0,85× ATK ; DEF −15 % pour la cible, 1 action. | 48.30 % | -1.70 pp | ±1.01 pp | à renforcer |
| 21044 | Rei Kiriyama | SSR | Tertiaire | Rei Kiriyama : Partie de shogi — Brèche tactique | 1,054× ATK ; DEF −8 % pour la cible, 1 action. | 52.20 % | +2.20 pp | ±0.98 pp | dans la marge |
| 21044 | Rei Kiriyama | SSR | Ultime | Rei Kiriyama — Déchaînement : Partie de shogi | 1,45× ATK ; DEF −20 % pour la cible, 2 actions. | 50.10 % | +0.10 pp | ±0.20 pp | à renforcer |
| 22036 | Koyomi Araragi | SSR | Base | Frappe inspirée de Régénération | rend 2 % des PV max au lanceur | 50.80 % | +0.80 pp | ±0.68 pp | dans la marge |
| 22036 | Koyomi Araragi | SSR | Secondaire | Régénération | 0,4× ATK sur tous les ennemis ; soin sur la durée de 4 % des PV max pour l'équipe, 2 actions. | 42.30 % | -7.70 pp | ±2.84 pp | à renforcer |
| 22036 | Koyomi Araragi | SSR | Tertiaire | Koyomi Araragi : Régénération — Second souffle | 1,054× ATK ; soigne le lanceur de 5 % des PV max. | 52.80 % | +2.80 pp | ±1.15 pp | dans la marge |
| 22036 | Koyomi Araragi | SSR | Ultime | Koyomi Araragi — Déchaînement : Régénération | 0,4× ATK sur tous les ennemis ; soigne l'équipe de 30 % des PV max ; retire les malus de l'équipe. | 57.50 % | +7.50 pp | ±1.84 pp | dans la marge |
| 22037 | Hitagi Senjougahara | SSR | Base | Frappe inspirée de Agrafes | DEF −3 % pour la cible, pour sa prochaine action | 51.00 % | +1.00 pp | ±0.61 pp | dans la marge |
| 22037 | Hitagi Senjougahara | SSR | Secondaire | Agrafes | 0,85× ATK ; DEF −15 % pour la cible, 1 action. | 46.80 % | -3.20 pp | ±1.14 pp | à renforcer |
| 22037 | Hitagi Senjougahara | SSR | Tertiaire | Hitagi Senjougahara : Agrafes — Brèche tactique | 1,054× ATK ; DEF −8 % pour la cible, 1 action. | 53.40 % | +3.40 pp | ±1.38 pp | dans la marge |
| 22037 | Hitagi Senjougahara | SSR | Ultime | Hitagi Senjougahara — Déchaînement : Agrafes | 1,45× ATK ; DEF −20 % pour la cible, 2 actions. | 59.40 % | +9.40 pp | ±1.71 pp | trop fort |
| 22055 | Tsubasa Hanekawa | SSR | Base | Frappe inspirée de Sawarineko | bouclier de 2 % des PV max pour le lanceur | 52.00 % | +2.00 pp | ±0.86 pp | dans la marge |
| 22055 | Tsubasa Hanekawa | SSR | Secondaire | Sawarineko | 0,4× ATK sur tous les ennemis ; immunité aux malus pour l'équipe, 1 action ; bouclier de 2 % des PV max pour l'équipe. | 48.50 % | -1.50 pp | ±2.72 pp | dans la marge |
| 22055 | Tsubasa Hanekawa | SSR | Tertiaire | Tsubasa Hanekawa : Sawarineko — Garde protectrice | 1,054× ATK ; bouclier de 6 % des PV max pour le lanceur. | 56.30 % | +6.30 pp | ±1.72 pp | dans la marge |
| 22055 | Tsubasa Hanekawa | SSR | Ultime | Tsubasa Hanekawa — Déchaînement : Sawarineko | 0,5× ATK sur tous les ennemis ; bouclier de 20 % des PV max pour l'équipe. | 52.80 % | +2.80 pp | ±1.12 pp | dans la marge |
| 23277 | Meruem | SSR | Base | Frappe inspirée de Garde royale | rend 2 % des dégâts infligés en PV | 50.30 % | +0.30 pp | ±0.34 pp | à renforcer |
| 23277 | Meruem | SSR | Secondaire | Garde royale | 1,024× ATK, rend 24 % des dégâts en PV. | 51.50 % | +1.50 pp | ±0.80 pp | dans la marge |
| 23277 | Meruem | SSR | Tertiaire | Meruem : Garde royale — Siphon léger | 1,1560000000000001× ATK, rend 15 % des dégâts en PV. | 54.70 % | +4.70 pp | ±1.42 pp | dans la marge |
| 23277 | Meruem | SSR | Ultime | Meruem — Déchaînement : Garde royale | 1,55× ATK, rend 65 % des dégâts en PV. | 60.60 % | +10.60 pp | ±1.79 pp | trop fort |
| 23602 | Shinobu Oshino | SSR | Base | Frappe inspirée de Vampire | rend 2 % des dégâts infligés en PV | 50.70 % | +0.70 pp | ±0.52 pp | dans la marge |
| 23602 | Shinobu Oshino | SSR | Secondaire | Vampire | 1,024× ATK, rend 24 % des dégâts en PV. | 51.70 % | +1.70 pp | ±0.84 pp | dans la marge |
| 23602 | Shinobu Oshino | SSR | Tertiaire | Shinobu Oshino : Vampire — Siphon léger | 1,1560000000000001× ATK, rend 15 % des dégâts en PV. | 56.60 % | +6.60 pp | ±1.70 pp | dans la marge |
| 23602 | Shinobu Oshino | SSR | Ultime | Shinobu Oshino — Déchaînement : Vampire | 1,55× ATK, rend 65 % des dégâts en PV. | 69.20 % | +19.20 pp | ±2.13 pp | trop fort |
| 34470 | Kurisu Makise | UR | Base | Frappe inspirée de Contre-argument | ATK −3 % pour la cible, pour sa prochaine action | 51.70 % | +1.70 pp | ±0.84 pp | dans la marge |
| 34470 | Kurisu Makise | UR | Secondaire | Contre-argument | 0,98× ATK ; ATK −12 % pour la cible, 1 action. | 53.30 % | +3.30 pp | ±1.16 pp | dans la marge |
| 34470 | Kurisu Makise | UR | Tertiaire | Kurisu Makise : Contre-argument — Pression ciblée | 1,054× ATK ; ATK −8 % pour la cible, 1 action. | 53.30 % | +3.30 pp | ±1.22 pp | dans la marge |
| 34470 | Kurisu Makise | UR | Ultime | Kurisu Makise — Déchaînement : Contre-argument | 1,3× ATK ; ATK −20 % pour la cible, 2 actions. | 56.50 % | +6.50 pp | ±1.48 pp | dans la marge |
| 35252 | Rintarou Okabe | UR | Base | Gadget lancé | DEF +3 % pour le lanceur, pour sa prochaine action | 50.50 % | +0.50 pp | ±0.44 pp | à renforcer |
| 35252 | Rintarou Okabe | UR | Secondaire | Time Leap | réanime un allié mort avec 15 % de ses PV max (une fois par combat). | 51.70 % | +1.70 pp | ±2.08 pp | dans la marge |
| 35252 | Rintarou Okabe | UR | Tertiaire | Rintarou Okabe : Gadget lancé — Garde resserrée | 1,054× ATK ; DEF +8 % pour le lanceur, 1 action. | 53.10 % | +3.10 pp | ±1.16 pp | dans la marge |
| 35252 | Rintarou Okabe | UR | Ultime | Time Leap | soin sur la durée de 8 % des PV max pour l'équipe, 3 actions ; retire les malus de l'équipe. | 41.20 % | -8.80 pp | ±1.67 pp | à renforcer |
| 36765 | Kazuto Kirigaya | SSR | Base | Frappe inspirée de Dual Blades | ATK +3 % pour le lanceur, pour sa prochaine action | 51.40 % | +1.40 pp | ±0.78 pp | dans la marge |
| 36765 | Kazuto Kirigaya | SSR | Secondaire | Dual Blades | 0,92× ATK ; ATK +12 % pour le lanceur, 1 action. | 51.20 % | +1.20 pp | ±1.54 pp | dans la marge |
| 36765 | Kazuto Kirigaya | SSR | Tertiaire | Kazuto Kirigaya : Dual Blades — Élan bref | 1,054× ATK ; ATK +8 % pour le lanceur, 1 action. | 55.30 % | +5.30 pp | ±1.51 pp | dans la marge |
| 36765 | Kazuto Kirigaya | SSR | Ultime | Kazuto Kirigaya — Déchaînement : Dual Blades | 1,35× ATK ; ATK +20 % pour le lanceur, 2 actions. | 53.30 % | +3.30 pp | ±1.09 pp | dans la marge |
| 36828 | Asuna Yuuki | SSR | Base | Frappe inspirée de Starburst Stream | ATK −3 % pour la cible, pour sa prochaine action | 51.00 % | +1.00 pp | ±0.83 pp | dans la marge |
| 36828 | Asuna Yuuki | SSR | Secondaire | Starburst Stream | 1,0779999999999998× ATK. | 52.40 % | +2.40 pp | ±1.22 pp | dans la marge |
| 36828 | Asuna Yuuki | SSR | Tertiaire | Asuna Yuuki : Starburst Stream — Pression ciblée | 1,054× ATK ; ATK −8 % pour la cible, 1 action. | 53.30 % | +3.30 pp | ±1.19 pp | dans la marge |
| 36828 | Asuna Yuuki | SSR | Ultime | Asuna Yuuki — Déchaînement : Starburst Stream | 1,3× ATK ; ATK −20 % pour la cible, 2 actions. | 54.00 % | +4.00 pp | ±1.19 pp | dans la marge |
| 38005 | Homura Akemi | SSR | Base | Frappe inspirée de Arrêt du temps | esquive +3 points pour le lanceur, jusqu'à sa prochaine action | 51.10 % | +1.10 pp | ±1.58 pp | dans la marge |
| 38005 | Homura Akemi | SSR | Secondaire | Arrêt du temps | 0,4× ATK sur tous les ennemis ; esquive +5 % pour l'équipe, 1 action. | 45.90 % | -4.10 pp | ±2.85 pp | à renforcer |
| 38005 | Homura Akemi | SSR | Tertiaire | Homura Akemi : Arrêt du temps — Pas de côté | 1,054× ATK ; esquive +6 % pour le lanceur, 1 action. | 50.50 % | +0.50 pp | ±1.29 pp | dans la marge |
| 38005 | Homura Akemi | SSR | Ultime | Homura Akemi — Déchaînement : Arrêt du temps | 1,25× ATK ; esquive +30 % pour le lanceur, 2 actions. | 61.20 % | +11.20 pp | ±1.91 pp | trop fort |
| 40881 | Mikasa Ackerman | UR | Base | Frappe inspirée de Écharpe rouge | esquive +3 points pour le lanceur, jusqu'à sa prochaine action | 51.40 % | +1.40 pp | ±2.51 pp | dans la marge |
| 40881 | Mikasa Ackerman | UR | Secondaire | Écharpe rouge | 0,68× ATK ; esquive +18 % pour le lanceur, 1 action. | 40.30 % | -9.70 pp | ±2.94 pp | à renforcer |
| 40881 | Mikasa Ackerman | UR | Tertiaire | Mikasa Ackerman : Écharpe rouge — Pas de côté | 1,054× ATK ; esquive +6 % pour le lanceur, 1 action. | 51.10 % | +1.10 pp | ±2.75 pp | dans la marge |
| 40881 | Mikasa Ackerman | UR | Ultime | Mikasa Ackerman — Déchaînement : Écharpe rouge | 1,25× ATK ; esquive +30 % pour le lanceur, 2 actions. | 59.70 % | +9.70 pp | ±1.82 pp | trop fort |
| 40882 | Eren Yeager | UR | Base | Frappe inspirée de Titan Assaillant | ATK +3 % pour le lanceur, pour sa prochaine action | 53.50 % | +3.50 pp | ±1.19 pp | dans la marge |
| 40882 | Eren Yeager | UR | Secondaire | Titan Assaillant | 0,94× ATK ; ATK +12 % pour le lanceur, 1 action. | 53.30 % | +3.30 pp | ±1.72 pp | dans la marge |
| 40882 | Eren Yeager | UR | Tertiaire | Eren Yeager : Titan Assaillant — Élan bref | 1,054× ATK ; ATK +8 % pour le lanceur, 1 action. | 55.80 % | +5.80 pp | ±1.56 pp | dans la marge |
| 40882 | Eren Yeager | UR | Ultime | Eren Yeager — Déchaînement : Titan Assaillant | 1,35× ATK ; ATK +20 % pour le lanceur, 2 actions. | 61.20 % | +11.20 pp | ±1.83 pp | trop fort |
| 45627 | Levi | UR | Base | Frappe inspirée de Tourbillon de lames | ignore 3 % de la DEF sur la prochaine attaque du lanceur | 51.90 % | +1.90 pp | ±0.84 pp | dans la marge |
| 45627 | Levi | UR | Secondaire | Tourbillon de lames | 0,92× ATK, ignore 15 % de la DEF. | 50.00 % | +0.00 pp | ±0.92 pp | à renforcer |
| 45627 | Levi | UR | Tertiaire | Levi : Tourbillon de lames — Percée mesurée | 1,224× ATK, ignore 12 % de la DEF. | 63.50 % | +13.50 pp | ±2.12 pp | trop fort |
| 45627 | Levi | UR | Ultime | Levi — Déchaînement : Tourbillon de lames | 1,65× ATK, ignore 40 % de la DEF. | 72.90 % | +22.90 pp | ±2.19 pp | trop fort |
| 45887 | Sasha Blouse | SSR | Base | Frappe inspirée de Tir d'arc | critique +3 points pour le lanceur, pour sa prochaine action | 50.60 % | +0.60 pp | ±0.62 pp | dans la marge |
| 45887 | Sasha Blouse | SSR | Secondaire | Tir d'arc | 1,237× ATK. | 55.00 % | +5.00 pp | ±1.61 pp | dans la marge |
| 45887 | Sasha Blouse | SSR | Tertiaire | Sasha Blouse : Tir d'arc — Visée précise | 1,054× ATK ; critique +6 points pour le lanceur, 1 action. | 52.00 % | +2.00 pp | ±1.02 pp | dans la marge |
| 45887 | Sasha Blouse | SSR | Ultime | Sasha Blouse — Déchaînement : Tir d'arc | 1,55× ATK ; critique +35 points pour le lanceur, 2 actions. | 53.30 % | +3.30 pp | ±1.12 pp | dans la marge |
| 46484 | Reiner Braun | SSR | Base | Frappe inspirée de Titan Cuirassé | DEF +3 % pour le lanceur, pour sa prochaine action | 50.80 % | +0.80 pp | ±0.62 pp | dans la marge |
| 46484 | Reiner Braun | SSR | Secondaire | Titan Cuirassé | 0,4× ATK sur tous les ennemis ; DEF +8 % pour l'équipe, 2 actions. | 57.40 % | +7.40 pp | ±2.75 pp | dans la marge |
| 46484 | Reiner Braun | SSR | Tertiaire | Reiner Braun : Titan Cuirassé — Garde resserrée | 1,054× ATK ; DEF +8 % pour le lanceur, 1 action. | 54.70 % | +4.70 pp | ±1.48 pp | dans la marge |
| 46484 | Reiner Braun | SSR | Ultime | Reiner Braun — Déchaînement : Titan Cuirassé | 0,45× ATK sur tous les ennemis ; DEF +20 % pour l'équipe, 2 actions. | 49.30 % | -0.70 pp | ±1.02 pp | à renforcer |
| 46494 | Armin Arlert | SSR | Base | Frappe inspirée de Titan Colossal | ignore 3 % de la DEF sur la prochaine attaque du lanceur | 51.60 % | +1.60 pp | ±0.77 pp | dans la marge |
| 46494 | Armin Arlert | SSR | Secondaire | Titan Colossal | 1,0899999999999999× ATK, traverse les boucliers. | 54.40 % | +4.40 pp | ±1.36 pp | dans la marge |
| 46494 | Armin Arlert | SSR | Tertiaire | Armin Arlert : Titan Colossal — Percée mesurée | 1,224× ATK, ignore 12 % de la DEF. | 61.80 % | +11.80 pp | ±2.26 pp | trop fort |
| 46494 | Armin Arlert | SSR | Ultime | Armin Arlert — Déchaînement : Titan Colossal | 1,65× ATK, ignore 40 % de la DEF. | 65.30 % | +15.30 pp | ±2.06 pp | trop fort |
| 46496 | Erwin Smith | SSR | Base | Frappe inspirée de Charge suicide | ATK +3 % pour le lanceur, pour sa prochaine action | 51.50 % | +1.50 pp | ±0.80 pp | dans la marge |
| 46496 | Erwin Smith | SSR | Secondaire | Charge suicide | 0,4× ATK sur tous les ennemis ; ATK +7 % pour l'équipe, 1 action. | 51.10 % | +1.10 pp | ±2.61 pp | dans la marge |
| 46496 | Erwin Smith | SSR | Tertiaire | Erwin Smith : Charge suicide — Élan bref | 1,054× ATK ; ATK +8 % pour le lanceur, 1 action. | 53.50 % | +3.50 pp | ±1.37 pp | dans la marge |
| 46496 | Erwin Smith | SSR | Ultime | Erwin Smith — Déchaînement : Charge suicide | 1,35× ATK ; ATK +20 % pour le lanceur, 2 actions. | 56.20 % | +6.20 pp | ±1.47 pp | dans la marge |
| 55131 | Houtarou Oreki | SSR | Base | Frappe inspirée de Déduction économe | DEF −3 % pour la cible, pour sa prochaine action | 50.40 % | +0.40 pp | ±0.39 pp | à renforcer |
| 55131 | Houtarou Oreki | SSR | Secondaire | Déduction économe | 0,85× ATK ; DEF −15 % pour la cible, 1 action. | 49.20 % | -0.80 pp | ±0.83 pp | à renforcer |
| 55131 | Houtarou Oreki | SSR | Tertiaire | Houtarou Oreki : Déduction économe — Brèche tactique | 1,054× ATK ; DEF −8 % pour la cible, 1 action. | 51.10 % | +1.10 pp | ±1.01 pp | dans la marge |
| 55131 | Houtarou Oreki | SSR | Ultime | Houtarou Oreki — Déchaînement : Déduction économe | 1,45× ATK ; DEF −20 % pour la cible, 2 actions. | 51.10 % | +1.10 pp | ±0.80 pp | dans la marge |
| 63351 | Akame | SSR | Base | Frappe inspirée de Murasame | ignore 3 % de la DEF sur la prochaine attaque du lanceur | 50.60 % | +0.60 pp | ±0.48 pp | dans la marge |
| 63351 | Akame | SSR | Secondaire | Murasame | 0,94× ATK, ignore 15 % de la DEF. | 50.50 % | +0.50 pp | ±0.52 pp | dans la marge |
| 63351 | Akame | SSR | Tertiaire | Akame : Murasame — Percée mesurée | 1,224× ATK, ignore 12 % de la DEF. | 59.20 % | +9.20 pp | ±1.83 pp | trop fort |
| 63351 | Akame | SSR | Ultime | Akame — Déchaînement : Murasame | 1,65× ATK, ignore 40 % de la DEF. | 51.50 % | +1.50 pp | ±0.75 pp | dans la marge |
| 64769 | Shouyou Hinata | SSR | Base | Frappe inspirée de Attaque éclair | esquive +3 points pour le lanceur, jusqu'à sa prochaine action | 50.90 % | +0.90 pp | ±1.12 pp | dans la marge |
| 64769 | Shouyou Hinata | SSR | Secondaire | Attaque éclair | 0,66× ATK ; esquive +18 % pour le lanceur, 1 action. | 35.40 % | -14.60 pp | ±2.23 pp | à renforcer |
| 64769 | Shouyou Hinata | SSR | Tertiaire | Shouyou Hinata : Attaque éclair — Pas de côté | 1,054× ATK ; esquive +6 % pour le lanceur, 1 action. | 51.80 % | +1.80 pp | ±1.10 pp | dans la marge |
| 64769 | Shouyou Hinata | SSR | Ultime | Shouyou Hinata — Déchaînement : Attaque éclair | 1,25× ATK ; esquive +30 % pour le lanceur, 2 actions. | 59.50 % | +9.50 pp | ±1.97 pp | trop fort |
| 64771 | Tobio Kageyama | SSR | Base | Frappe inspirée de Passe parfaite | critique +3 points pour le lanceur, pour sa prochaine action | 50.80 % | +0.80 pp | ±0.55 pp | dans la marge |
| 64771 | Tobio Kageyama | SSR | Secondaire | Passe parfaite | 0,56× ATK ; critique +8 points pour l'équipe, 1 action. | 33.40 % | -16.60 pp | ±2.17 pp | à renforcer |
| 64771 | Tobio Kageyama | SSR | Tertiaire | Tobio Kageyama : Passe parfaite — Visée précise | 1,054× ATK ; critique +6 points pour le lanceur, 1 action. | 51.50 % | +1.50 pp | ±1.19 pp | dans la marge |
| 64771 | Tobio Kageyama | SSR | Ultime | Tobio Kageyama — Déchaînement : Passe parfaite | 1,55× ATK ; critique +35 points pour le lanceur, 2 actions. | 58.70 % | +8.70 pp | ±1.66 pp | trop fort |
| 65239 | Esdeath | SSR | Base | Frappe inspirée de Mahyo | ATK −3 % pour la cible, pour sa prochaine action | 50.30 % | +0.30 pp | ±0.34 pp | à renforcer |
| 65239 | Esdeath | SSR | Secondaire | Mahyo | 0,4× ATK sur tous les ennemis ; silence sur tous les ennemis (sort de base seulement), 1 action; sans effet sur les boss. | 49.20 % | -0.80 pp | ±2.47 pp | dans la marge |
| 65239 | Esdeath | SSR | Tertiaire | Esdeath : Mahyo — Pression ciblée | 1,054× ATK ; ATK −8 % pour la cible, 1 action. | 52.30 % | +2.30 pp | ±0.96 pp | dans la marge |
| 65239 | Esdeath | SSR | Ultime | Esdeath — Déchaînement : Mahyo | 1,3× ATK ; ATK −20 % pour la cible, 2 actions. | 50.20 % | +0.20 pp | ±0.28 pp | à renforcer |
| 65643 | Koro-sensei | SSR | Base | Frappe inspirée de Pieuvre jaune | bouclier de 2 % des PV max pour le lanceur | 52.80 % | +2.80 pp | ±1.01 pp | dans la marge |
| 65643 | Koro-sensei | SSR | Secondaire | Pieuvre jaune | 0,4× ATK sur tous les ennemis ; immunité aux malus pour l'équipe, 1 action ; bouclier de 2 % des PV max pour l'équipe. | 50.60 % | +0.60 pp | ±2.86 pp | dans la marge |
| 65643 | Koro-sensei | SSR | Tertiaire | Koro-sensei : Pieuvre jaune — Garde protectrice | 1,054× ATK ; bouclier de 6 % des PV max pour le lanceur. | 54.50 % | +4.50 pp | ±1.43 pp | dans la marge |
| 65643 | Koro-sensei | SSR | Ultime | Koro-sensei — Déchaînement : Pieuvre jaune | 0,5× ATK sur tous les ennemis ; bouclier de 20 % des PV max pour l'équipe. | 56.10 % | +6.10 pp | ±1.56 pp | dans la marge |
| 65645 | Nagisa Shiota | SSR | Base | Frappe inspirée de Coup de claquement | ignore 3 % de la DEF sur la prochaine attaque du lanceur | 50.20 % | +0.20 pp | ±0.39 pp | à renforcer |
| 65645 | Nagisa Shiota | SSR | Secondaire | Coup de claquement | 1,0899999999999999× ATK, traverse les boucliers. | 51.70 % | +1.70 pp | ±0.97 pp | dans la marge |
| 65645 | Nagisa Shiota | SSR | Tertiaire | Nagisa Shiota : Coup de claquement — Percée mesurée | 1,224× ATK, ignore 12 % de la DEF. | 57.10 % | +7.10 pp | ±1.68 pp | dans la marge |
| 65645 | Nagisa Shiota | SSR | Ultime | Nagisa Shiota — Déchaînement : Coup de claquement | 1,65× ATK, ignore 40 % de la DEF. | 50.30 % | +0.30 pp | ±0.34 pp | à renforcer |
| 65865 | Rikka Takanashi | SSR | Base | Frappe inspirée de Œil du tyran | esquive +3 points pour le lanceur, jusqu'à sa prochaine action | 52.65 % | +2.65 pp | ±2.24 pp | dans la marge |
| 65865 | Rikka Takanashi | SSR | Secondaire | Œil du tyran | 0,4× ATK sur tous les ennemis ; esquive +5 % pour l'équipe, 1 action. | 50.10 % | +0.10 pp | ±2.88 pp | dans la marge |
| 65865 | Rikka Takanashi | SSR | Tertiaire | Rikka Takanashi : Œil du tyran — Pas de côté | 1,054× ATK ; esquive +6 % pour le lanceur, 1 action. | 54.40 % | +4.40 pp | ±2.27 pp | dans la marge |
| 65865 | Rikka Takanashi | SSR | Ultime | Rikka Takanashi — Déchaînement : Œil du tyran | 1,25× ATK ; esquive +30 % pour le lanceur, 2 actions. | 52.00 % | +2.00 pp | ±1.06 pp | dans la marge |
| 66171 | Kyouko Hori | SSR | Base | Frappe inspirée de Cœur ouvert | rend 2 % des PV max au lanceur | 52.80 % | +2.80 pp | ±1.01 pp | dans la marge |
| 66171 | Kyouko Hori | SSR | Secondaire | Cœur ouvert | 0,4× ATK sur tous les ennemis ; soigne l'équipe de 9 % des PV max ; retire les malus de l'équipe. | 44.00 % | -6.00 pp | ±2.72 pp | à renforcer |
| 66171 | Kyouko Hori | SSR | Tertiaire | Kyouko Hori : Cœur ouvert — Second souffle | 1,054× ATK ; soigne le lanceur de 5 % des PV max. | 53.90 % | +3.90 pp | ±1.36 pp | dans la marge |
| 66171 | Kyouko Hori | SSR | Ultime | Kyouko Hori — Déchaînement : Cœur ouvert | 0,4× ATK sur tous les ennemis ; soigne l'équipe de 30 % des PV max ; retire les malus de l'équipe. | 58.40 % | +8.40 pp | ±1.82 pp | trop fort |
| 66173 | Izumi Miyamura | SSR | Base | Frappe inspirée de Vrai moi | rend 0,5 % des PV max au lanceur | 51.70 % | +1.70 pp | ±0.89 pp | dans la marge |
| 66173 | Izumi Miyamura | SSR | Secondaire | Vrai moi | 0,4× ATK sur tous les ennemis ; soin sur la durée de 4 % des PV max pour l'équipe, 2 actions. | 41.60 % | -8.40 pp | ±2.79 pp | à renforcer |
| 66173 | Izumi Miyamura | SSR | Tertiaire | Izumi Miyamura : Vrai moi — Second souffle | 1,054× ATK ; soigne le lanceur de 5 % des PV max. | 53.40 % | +3.40 pp | ±1.35 pp | dans la marge |
| 66173 | Izumi Miyamura | SSR | Ultime | Izumi Miyamura — Déchaînement : Vrai moi | 0,4× ATK sur tous les ennemis ; soigne l'équipe de 30 % des PV max ; retire les malus de l'équipe. | 63.40 % | +13.40 pp | ±2.15 pp | trop fort |
| 67065 | Hachiman Hikigaya | SSR | Base | Frappe inspirée de Jugement du solitaire | DEF −3 % pour la cible, pour sa prochaine action | 51.60 % | +1.60 pp | ±0.77 pp | dans la marge |
| 67065 | Hachiman Hikigaya | SSR | Secondaire | Jugement du solitaire | 0,85× ATK ; DEF −15 % pour la cible, 1 action. | 45.00 % | -5.00 pp | ±1.56 pp | à renforcer |
| 67065 | Hachiman Hikigaya | SSR | Tertiaire | Hachiman Hikigaya : Jugement du solitaire — Brèche tactique | 1,054× ATK ; DEF −8 % pour la cible, 1 action. | 53.00 % | +3.00 pp | ±1.57 pp | dans la marge |
| 67065 | Hachiman Hikigaya | SSR | Ultime | Hachiman Hikigaya — Déchaînement : Jugement du solitaire | 1,45× ATK ; DEF −20 % pour la cible, 2 actions. | 58.50 % | +8.50 pp | ±1.87 pp | trop fort |
| 67067 | Yukino Yukinoshita | SSR | Base | Frappe inspirée de Glace silencieuse | ATK −3 % pour la cible, pour sa prochaine action | 51.70 % | +1.70 pp | ±0.93 pp | dans la marge |
| 67067 | Yukino Yukinoshita | SSR | Secondaire | Glace silencieuse | 1,06× ATK ; silence sur la cible (sort de base seulement), 1 action; sans effet sur les boss. | 48.00 % | -2.00 pp | ±3.00 pp | à renforcer |
| 67067 | Yukino Yukinoshita | SSR | Tertiaire | Yukino Yukinoshita : Glace silencieuse — Pression ciblée | 1,054× ATK ; ATK −8 % pour la cible, 1 action. | 53.50 % | +3.50 pp | ±1.53 pp | dans la marge |
| 67067 | Yukino Yukinoshita | SSR | Ultime | Yukino Yukinoshita — Déchaînement : Glace silencieuse | 1,3× ATK ; ATK −20 % pour la cible, 2 actions. | 53.50 % | +3.50 pp | ±1.69 pp | dans la marge |
| 67327 | Yuu Nishinoya | SSR | Base | Réception de Rolling Thunder | bouclier de 0,1 % des PV max pour le lanceur | 50.40 % | +0.40 pp | ±0.39 pp | à renforcer |
| 67327 | Yuu Nishinoya | SSR | Secondaire | Rolling Thunder | 0,4× ATK sur tous les ennemis ; immunité aux malus pour l'équipe, 1 action ; bouclier de 2 % des PV max pour l'équipe. | 53.00 % | +3.00 pp | ±2.71 pp | dans la marge |
| 67327 | Yuu Nishinoya | SSR | Tertiaire | Yuu Nishinoya : Réception de Rolling Thunder — Garde protectrice | 1,054× ATK ; bouclier de 6 % des PV max pour le lanceur. | 55.00 % | +5.00 pp | ±1.72 pp | dans la marge |
| 67327 | Yuu Nishinoya | SSR | Ultime | Yuu Nishinoya — Déchaînement : Réception de Rolling Thunder | 0,5× ATK sur tous les ennemis ; bouclier de 20 % des PV max pour l'équipe. | 69.30 % | +19.30 pp | ±2.14 pp | trop fort |
| 67329 | Kei Tsukishima | SSR | Base | Frappe inspirée de Bloc impitoyable | DEF −3 % pour la cible, pour sa prochaine action | 50.60 % | +0.60 pp | ±0.55 pp | dans la marge |
| 67329 | Kei Tsukishima | SSR | Secondaire | Bloc impitoyable | 0,85× ATK ; DEF −15 % pour la cible, 1 action. | 49.10 % | -0.90 pp | ±1.12 pp | à renforcer |
| 67329 | Kei Tsukishima | SSR | Tertiaire | Kei Tsukishima : Bloc impitoyable — Brèche tactique | 1,054× ATK ; DEF −8 % pour la cible, 1 action. | 52.90 % | +2.90 pp | ±1.10 pp | dans la marge |
| 67329 | Kei Tsukishima | SSR | Ultime | Kei Tsukishima — Déchaînement : Bloc impitoyable | 1,45× ATK ; DEF −20 % pour la cible, 2 actions. | 52.10 % | +2.10 pp | ±0.92 pp | dans la marge |
| 69411 | Kaori Miyazono | SSR | Base | Frappe inspirée de Violon d'avril | rend 2 % des PV max au lanceur | 52.40 % | +2.40 pp | ±1.02 pp | dans la marge |
| 69411 | Kaori Miyazono | SSR | Secondaire | Violon d'avril | 0,4× ATK sur tous les ennemis ; soin sur la durée de 4 % des PV max pour l'équipe, 2 actions. | 46.30 % | -3.70 pp | ±2.72 pp | à renforcer |
| 69411 | Kaori Miyazono | SSR | Tertiaire | Kaori Miyazono : Violon d'avril — Second souffle | 1,054× ATK ; soigne le lanceur de 5 % des PV max. | 51.90 % | +1.90 pp | ±1.11 pp | dans la marge |
| 69411 | Kaori Miyazono | SSR | Ultime | Kaori Miyazono — Déchaînement : Violon d'avril | 0,4× ATK sur tous les ennemis ; soigne l'équipe de 30 % des PV max ; retire les malus de l'équipe. | 56.00 % | +6.00 pp | ±1.63 pp | dans la marge |
| 70069 | Kurumi Tokisaki | SSR | Base | Frappe inspirée de Zafkiel | ignore 3 % de la DEF sur la prochaine attaque du lanceur | 50.80 % | +0.80 pp | ±0.62 pp | dans la marge |
| 70069 | Kurumi Tokisaki | SSR | Secondaire | Zafkiel | 1,0899999999999999× ATK, traverse les boucliers. | 51.10 % | +1.10 pp | ±1.25 pp | dans la marge |
| 70069 | Kurumi Tokisaki | SSR | Tertiaire | Kurumi Tokisaki : Zafkiel — Percée mesurée | 1,224× ATK, ignore 12 % de la DEF. | 58.90 % | +8.90 pp | ±2.01 pp | trop fort |
| 70069 | Kurumi Tokisaki | SSR | Ultime | Kurumi Tokisaki — Déchaînement : Zafkiel | 1,65× ATK, ignore 40 % de la DEF. | 53.80 % | +3.80 pp | ±1.35 pp | dans la marge |
| 71121 | Hange Zoe | SSR | Base | Frappe inspirée de Lance-éclair | ATK −3 % pour la cible, pour sa prochaine action | 52.00 % | +2.00 pp | ±0.90 pp | dans la marge |
| 71121 | Hange Zoe | SSR | Secondaire | Lance-éclair | 0,4× ATK sur tous les ennemis. | 46.60 % | -3.40 pp | ±2.69 pp | à renforcer |
| 71121 | Hange Zoe | SSR | Tertiaire | Hange Zoe : Lance-éclair — Pression ciblée | 1,054× ATK ; ATK −8 % pour la cible, 1 action. | 54.10 % | +4.10 pp | ±1.52 pp | dans la marge |
| 71121 | Hange Zoe | SSR | Ultime | Hange Zoe — Déchaînement : Lance-éclair | 1,3× ATK ; ATK −20 % pour la cible, 2 actions. | 61.60 % | +11.60 pp | ±1.89 pp | trop fort |
| 71267 | Kenma Kozume | SSR | Base | Frappe inspirée de Lecture du jeu | ATK −3 % pour la cible, pour sa prochaine action | 51.30 % | +1.30 pp | ±0.75 pp | dans la marge |
| 71267 | Kenma Kozume | SSR | Secondaire | Lecture du jeu | 0,98× ATK ; ATK −12 % pour la cible, 1 action. | 51.20 % | +1.20 pp | ±1.10 pp | dans la marge |
| 71267 | Kenma Kozume | SSR | Tertiaire | Kenma Kozume : Lecture du jeu — Pression ciblée | 1,054× ATK ; ATK −8 % pour la cible, 1 action. | 53.50 % | +3.50 pp | ±1.25 pp | dans la marge |
| 71267 | Kenma Kozume | SSR | Ultime | Kenma Kozume — Déchaînement : Lecture du jeu | 1,3× ATK ; ATK −20 % pour la cible, 2 actions. | 56.60 % | +6.60 pp | ±1.51 pp | dans la marge |
| 71269 | Tetsurou Kuroo | SSR | Base | Frappe inspirée de Mur de Nekoma | ATK −3 % pour la cible, pour sa prochaine action | 50.90 % | +0.90 pp | ±0.58 pp | dans la marge |
| 71269 | Tetsurou Kuroo | SSR | Secondaire | Mur de Nekoma | 1,06× ATK ; silence sur la cible (sort de base seulement), 1 action; sans effet sur les boss. | 44.80 % | -5.20 pp | ±2.86 pp | à renforcer |
| 71269 | Tetsurou Kuroo | SSR | Tertiaire | Tetsurou Kuroo : Mur de Nekoma — Pression ciblée | 1,054× ATK ; ATK −8 % pour la cible, 1 action. | 52.10 % | +2.10 pp | ±1.00 pp | dans la marge |
| 71269 | Tetsurou Kuroo | SSR | Ultime | Tetsurou Kuroo — Déchaînement : Mur de Nekoma | 1,3× ATK ; ATK −20 % pour la cible, 2 actions. | 50.10 % | +0.10 pp | ±0.20 pp | à renforcer |
| 71611 | Tooru Oikawa | SSR | Base | Frappe inspirée de Service dévastateur | critique +3 points pour le lanceur, pour sa prochaine action | 50.60 % | +0.60 pp | ±0.48 pp | dans la marge |
| 71611 | Tooru Oikawa | SSR | Secondaire | Service dévastateur | 1,237× ATK. | 55.90 % | +5.90 pp | ±1.62 pp | dans la marge |
| 71611 | Tooru Oikawa | SSR | Tertiaire | Tooru Oikawa : Service dévastateur — Visée précise | 1,054× ATK ; critique +6 points pour le lanceur, 1 action. | 52.90 % | +2.90 pp | ±1.10 pp | dans la marge |
| 71611 | Tooru Oikawa | SSR | Ultime | Tooru Oikawa — Déchaînement : Service dévastateur | 1,55× ATK ; critique +35 points pour le lanceur, 2 actions. | 55.20 % | +5.20 pp | ±1.42 pp | dans la marge |
| 71933 | Karma Akabane | SSR | Base | Frappe inspirée de Lame d'assassin | critique +3 points pour le lanceur, pour sa prochaine action | 50.60 % | +0.60 pp | ±0.48 pp | dans la marge |
| 71933 | Karma Akabane | SSR | Secondaire | Lame d'assassin | 1,237× ATK. | 57.20 % | +7.20 pp | ±1.75 pp | dans la marge |
| 71933 | Karma Akabane | SSR | Tertiaire | Karma Akabane : Lame d'assassin — Visée précise | 1,054× ATK ; critique +6 points pour le lanceur, 1 action. | 52.20 % | +2.20 pp | ±1.13 pp | dans la marge |
| 71933 | Karma Akabane | SSR | Ultime | Karma Akabane — Déchaînement : Lame d'assassin | 1,55× ATK ; critique +35 points pour le lanceur, 2 actions. | 57.50 % | +7.50 pp | ±1.64 pp | dans la marge |
| 73935 | Saitama | SSR | Base | Frappe inspirée de Coup sérieux | critique +3 points pour le lanceur, pour sa prochaine action | 51.30 % | +1.30 pp | ±0.70 pp | dans la marge |
| 73935 | Saitama | SSR | Secondaire | Coup sérieux | 1,237× ATK. | 59.20 % | +9.20 pp | ±1.74 pp | trop fort |
| 73935 | Saitama | SSR | Tertiaire | Saitama : Coup sérieux — Visée précise | 1,054× ATK ; critique +6 points pour le lanceur, 1 action. | 51.40 % | +1.40 pp | ±1.20 pp | dans la marge |
| 73935 | Saitama | SSR | Ultime | Saitama — Déchaînement : Coup sérieux | 1,55× ATK ; critique +35 points pour le lanceur, 2 actions. | 63.00 % | +13.00 pp | ±2.02 pp | trop fort |
| 75216 | Souma Yukihira | SSR | Base | Frappe inspirée de Plat divin | rend 2 % des PV max au lanceur | 50.50 % | +0.50 pp | ±0.44 pp | à renforcer |
| 75216 | Souma Yukihira | SSR | Secondaire | Plat divin | 0,4× ATK sur tous les ennemis ; soin sur la durée de 4 % des PV max pour l'équipe, 2 actions. | 49.40 % | -0.60 pp | ±2.76 pp | dans la marge |
| 75216 | Souma Yukihira | SSR | Tertiaire | Souma Yukihira : Plat divin — Second souffle | 1,054× ATK ; soigne le lanceur de 5 % des PV max. | 52.60 % | +2.60 pp | ±1.09 pp | dans la marge |
| 75216 | Souma Yukihira | SSR | Ultime | Souma Yukihira — Déchaînement : Plat divin | 0,4× ATK sur tous les ennemis ; soigne l'équipe de 30 % des PV max ; retire les malus de l'équipe. | 50.10 % | +0.10 pp | ±0.59 pp | à renforcer |
| 77605 | Ban | SSR | Base | Frappe inspirée de Vol de vie | rend 2 % des dégâts infligés en PV | 50.20 % | +0.20 pp | ±0.28 pp | à renforcer |
| 77605 | Ban | SSR | Secondaire | Vol de vie | 1,024× ATK, rend 24 % des dégâts en PV. | 51.80 % | +1.80 pp | ±0.91 pp | dans la marge |
| 77605 | Ban | SSR | Tertiaire | Ban : Vol de vie — Siphon léger | 1,1560000000000001× ATK, rend 15 % des dégâts en PV. | 55.00 % | +5.00 pp | ±1.43 pp | dans la marge |
| 77605 | Ban | SSR | Ultime | Ban — Déchaînement : Vol de vie | 1,55× ATK, rend 65 % des dégâts en PV. | 53.60 % | +3.60 pp | ±1.13 pp | dans la marge |
| 80243 | Shouko Nishimiya | SSR | Base | Frappe inspirée de Langue des signes | rend 2 % des PV max au lanceur | 54.00 % | +4.00 pp | ±1.19 pp | dans la marge |
| 80243 | Shouko Nishimiya | SSR | Secondaire | Langue des signes | 0,4× ATK sur tous les ennemis ; soigne l'équipe de 9 % des PV max ; retire les malus de l'équipe. | 48.40 % | -1.60 pp | ±2.63 pp | dans la marge |
| 80243 | Shouko Nishimiya | SSR | Tertiaire | Shouko Nishimiya : Langue des signes — Second souffle | 1,054× ATK ; soigne le lanceur de 5 % des PV max. | 52.10 % | +2.10 pp | ±1.15 pp | dans la marge |
| 80243 | Shouko Nishimiya | SSR | Ultime | Shouko Nishimiya — Déchaînement : Langue des signes | 0,4× ATK sur tous les ennemis ; soigne l'équipe de 30 % des PV max ; retire les malus de l'équipe. | 61.60 % | +11.60 pp | ±2.10 pp | trop fort |
| 80491 | Shouya Ishida | SSR | Base | Frappe inspirée de Rédemption | DEF +3 % pour le lanceur, pour sa prochaine action | 50.60 % | +0.60 pp | ±0.62 pp | dans la marge |
| 80491 | Shouya Ishida | SSR | Secondaire | Rédemption | 0,4× ATK sur tous les ennemis ; DEF +8 % pour l'équipe, 2 actions. | 42.30 % | -7.70 pp | ±2.81 pp | à renforcer |
| 80491 | Shouya Ishida | SSR | Tertiaire | Shouya Ishida : Rédemption — Garde resserrée | 1,054× ATK ; DEF +8 % pour le lanceur, 1 action. | 53.00 % | +3.00 pp | ±1.33 pp | dans la marge |
| 80491 | Shouya Ishida | SSR | Ultime | Shouya Ishida — Déchaînement : Rédemption | 0,45× ATK sur tous les ennemis ; DEF +20 % pour l'équipe, 2 actions. | 44.80 % | -5.20 pp | ±1.76 pp | à renforcer |
| 81929 | Tatsumaki | SSR | Base | Frappe inspirée de Tempête psychique | ATK −3 % pour la cible, pour sa prochaine action | 51.70 % | +1.70 pp | ±0.80 pp | dans la marge |
| 81929 | Tatsumaki | SSR | Secondaire | Tempête psychique | 0,4× ATK sur tous les ennemis. | 47.10 % | -2.90 pp | ±2.73 pp | à renforcer |
| 81929 | Tatsumaki | SSR | Tertiaire | Tatsumaki : Tempête psychique — Pression ciblée | 1,054× ATK ; ATK −8 % pour la cible, 1 action. | 54.00 % | +4.00 pp | ±1.28 pp | dans la marge |
| 81929 | Tatsumaki | SSR | Ultime | Tatsumaki — Déchaînement : Tempête psychique | 1,3× ATK ; ATK −20 % pour la cible, 2 actions. | 54.00 % | +4.00 pp | ±1.22 pp | dans la marge |
| 83797 | Ryuuko Matoi | SSR | Base | Frappe inspirée de Senketsu | ignore 3 % de la DEF sur la prochaine attaque du lanceur | 50.40 % | +0.40 pp | ±0.48 pp | à renforcer |
| 83797 | Ryuuko Matoi | SSR | Secondaire | Senketsu | 0,94× ATK, ignore 15 % de la DEF. | 50.80 % | +0.80 pp | ±0.62 pp | dans la marge |
| 83797 | Ryuuko Matoi | SSR | Tertiaire | Ryuuko Matoi : Senketsu — Percée mesurée | 1,224× ATK, ignore 12 % de la DEF. | 59.60 % | +9.60 pp | ±1.84 pp | trop fort |
| 83797 | Ryuuko Matoi | SSR | Ultime | Ryuuko Matoi — Déchaînement : Senketsu | 1,65× ATK, ignore 40 % de la DEF. | 53.20 % | +3.20 pp | ±1.11 pp | dans la marge |
| 84677 | Yato | SSR | Base | Frappe inspirée de Régalia | ATK +3 % pour le lanceur, pour sa prochaine action | 52.10 % | +2.10 pp | ±0.92 pp | dans la marge |
| 84677 | Yato | SSR | Secondaire | Régalia | 0,92× ATK ; ATK +12 % pour le lanceur, 1 action. | 48.30 % | -1.70 pp | ±1.62 pp | à renforcer |
| 84677 | Yato | SSR | Tertiaire | Yato : Régalia — Élan bref | 1,054× ATK ; ATK +8 % pour le lanceur, 1 action. | 52.90 % | +2.90 pp | ±1.63 pp | dans la marge |
| 84677 | Yato | SSR | Ultime | Yato — Déchaînement : Régalia | 1,35× ATK ; ATK +20 % pour le lanceur, 2 actions. | 59.60 % | +9.60 pp | ±1.73 pp | trop fort |
| 87275 | Ken Kaneki | UR | Base | Frappe inspirée de Kagune de Kakuja | poison : 0,5 % des PV max de la cible à sa prochaine action | 50.40 % | +0.40 pp | ±0.48 pp | à renforcer |
| 87275 | Ken Kaneki | UR | Secondaire | Kagune de Kakuja | 0,4× ATK sur tous les ennemis ; poison : 3 % des PV max par action pour tous les ennemis, 2 actions. | 54.20 % | +4.20 pp | ±2.65 pp | dans la marge |
| 87275 | Ken Kaneki | UR | Tertiaire | Ken Kaneki : Kagune de Kakuja — Marque persistante | 1,054× ATK ; poison : 2 % des PV max par action pour la cible, 2 actions. | 54.25 % | +4.25 pp | ±1.27 pp | dans la marge |
| 87275 | Ken Kaneki | UR | Ultime | Ken Kaneki — Déchaînement : Kagune de Kakuja | 1,15× ATK ; poison : 8 % des PV max par action pour la cible, 3 actions. | 54.95 % | +4.95 pp | ±1.32 pp | dans la marge |
| 87277 | Touka Kirishima | SSR | Base | Frappe inspirée de Kagune d'Ukaku | esquive +3 points pour le lanceur, jusqu'à sa prochaine action | 50.50 % | +0.50 pp | ±1.77 pp | dans la marge |
| 87277 | Touka Kirishima | SSR | Secondaire | Kagune d'Ukaku | 0,66× ATK ; esquive +18 % pour le lanceur, 1 action. | 44.30 % | -5.70 pp | ±2.55 pp | à renforcer |
| 87277 | Touka Kirishima | SSR | Tertiaire | Touka Kirishima : Kagune d'Ukaku — Pas de côté | 1,054× ATK ; esquive +6 % pour le lanceur, 1 action. | 53.50 % | +3.50 pp | ±1.62 pp | dans la marge |
| 87277 | Touka Kirishima | SSR | Ultime | Touka Kirishima — Déchaînement : Kagune d'Ukaku | 1,25× ATK ; esquive +30 % pour le lanceur, 2 actions. | 52.00 % | +2.00 pp | ±0.90 pp | dans la marge |
| 88348 | Rudeus Greyrat | SSR | Base | Frappe inspirée de Magie sans incantation | ATK −3 % pour la cible, pour sa prochaine action | 51.20 % | +1.20 pp | ±0.67 pp | dans la marge |
| 88348 | Rudeus Greyrat | SSR | Secondaire | Magie sans incantation | 1,0779999999999998× ATK. | 51.80 % | +1.80 pp | ±1.06 pp | dans la marge |
| 88348 | Rudeus Greyrat | SSR | Tertiaire | Rudeus Greyrat : Magie sans incantation — Pression ciblée | 1,054× ATK ; ATK −8 % pour la cible, 1 action. | 52.70 % | +2.70 pp | ±1.41 pp | dans la marge |
| 88348 | Rudeus Greyrat | SSR | Ultime | Rudeus Greyrat — Déchaînement : Magie sans incantation | 1,3× ATK ; ATK −20 % pour la cible, 2 actions. | 52.60 % | +2.60 pp | ±1.01 pp | dans la marge |
| 88349 | Eris Boreas Greyrat | SSR | Base | Frappe inspirée de Colère d'Eris | ATK +3 % pour le lanceur, pour sa prochaine action | 50.60 % | +0.60 pp | ±0.48 pp | dans la marge |
| 88349 | Eris Boreas Greyrat | SSR | Secondaire | Colère d'Eris | 0,92× ATK ; ATK +12 % pour le lanceur, 1 action. | 50.80 % | +0.80 pp | ±1.44 pp | dans la marge |
| 88349 | Eris Boreas Greyrat | SSR | Tertiaire | Eris Boreas Greyrat : Colère d'Eris — Élan bref | 1,054× ATK ; ATK +8 % pour le lanceur, 1 action. | 53.30 % | +3.30 pp | ±1.12 pp | dans la marge |
| 88349 | Eris Boreas Greyrat | SSR | Ultime | Eris Boreas Greyrat — Déchaînement : Colère d'Eris | 1,35× ATK ; ATK +20 % pour le lanceur, 2 actions. | 50.60 % | +0.60 pp | ±0.48 pp | dans la marge |
| 88350 | Roxy Migurdia | SSR | Base | Frappe inspirée de Barrière de Roxy | bouclier de 0,5 % des PV max pour le lanceur | 50.60 % | +0.60 pp | ±0.83 pp | dans la marge |
| 88350 | Roxy Migurdia | SSR | Secondaire | Barrière de Roxy | 0,4× ATK sur tous les ennemis ; bouclier de 3 % des PV max pour l'équipe. | 60.20 % | +10.20 pp | ±2.77 pp | trop fort |
| 88350 | Roxy Migurdia | SSR | Tertiaire | Roxy Migurdia : Barrière de Roxy — Garde protectrice | 1,054× ATK ; bouclier de 6 % des PV max pour le lanceur. | 55.20 % | +5.20 pp | ±1.80 pp | dans la marge |
| 88350 | Roxy Migurdia | SSR | Ultime | Roxy Migurdia — Déchaînement : Barrière de Roxy | 0,5× ATK sur tous les ennemis ; bouclier de 20 % des PV max pour l'équipe. | 62.70 % | +12.70 pp | ±2.03 pp | trop fort |
| 88412 | Juuzou Suzuya | SSR | Base | Frappe inspirée de Lame de Jason | poison : 0,5 % des PV max de la cible à sa prochaine action | 50.50 % | +0.50 pp | ±0.44 pp | à renforcer |
| 88412 | Juuzou Suzuya | SSR | Secondaire | Lame de Jason | 0,96× ATK ; poison : 3 % des PV max par action pour la cible, 2 actions. | 52.00 % | +2.00 pp | ±1.13 pp | dans la marge |
| 88412 | Juuzou Suzuya | SSR | Tertiaire | Juuzou Suzuya : Lame de Jason — Marque persistante | 1,054× ATK ; poison : 2 % des PV max par action pour la cible, 2 actions. | 53.20 % | +3.20 pp | ±1.18 pp | dans la marge |
| 88412 | Juuzou Suzuya | SSR | Ultime | Juuzou Suzuya — Déchaînement : Lame de Jason | 1,15× ATK ; poison : 8 % des PV max par action pour la cible, 3 actions. | 51.10 % | +1.10 pp | ±0.64 pp | dans la marge |
| 88572 | Emilia | UR | Base | Éclat de glace | DEF −3 % pour la cible, pour sa prochaine action | 51.50 % | +1.50 pp | ±0.80 pp | dans la marge |
| 88572 | Emilia | UR | Secondaire | Hyoga | 0,4× ATK sur tous les ennemis ; silence sur tous les ennemis (sort de base seulement), 1 action; sans effet sur les boss. | 45.30 % | -4.70 pp | ±2.67 pp | à renforcer |
| 88572 | Emilia | UR | Tertiaire | Emilia : Éclat de glace — Brèche tactique | 1,054× ATK ; DEF −8 % pour la cible, 1 action. | 55.20 % | +5.20 pp | ±1.62 pp | dans la marge |
| 88572 | Emilia | UR | Ultime | Puck — Exécution glaciale | 1,9× ATK, ignore 30 % de la DEF, traverse les boucliers. | 70.40 % | +20.40 pp | ±2.16 pp | trop fort |
| 88573 | Subaru Natsuki | SSR | Base | Coup de barre | DEF +3 % pour le lanceur, pour sa prochaine action | 50.60 % | +0.60 pp | ±0.48 pp | dans la marge |
| 88573 | Subaru Natsuki | SSR | Secondaire | Retour par la mort | réanime un allié mort avec 15 % de ses PV max (une fois par combat). | 52.30 % | +2.30 pp | ±2.35 pp | dans la marge |
| 88573 | Subaru Natsuki | SSR | Tertiaire | Subaru Natsuki : Coup de barre — Garde resserrée | 1,054× ATK ; DEF +8 % pour le lanceur, 1 action. | 51.00 % | +1.00 pp | ±1.14 pp | dans la marge |
| 88573 | Subaru Natsuki | SSR | Ultime | Retour par la mort | soigne le lanceur de 50 % des PV max ; bouclier de 15 % des PV max pour le lanceur. | 46.30 % | -3.70 pp | ±2.08 pp | à renforcer |
| 88575 | Rem | UR | Base | Coup de fléau | critique +3 points pour le lanceur, pour sa prochaine action | 50.20 % | +0.20 pp | ±0.28 pp | à renforcer |
| 88575 | Rem | UR | Secondaire | Morning Star | 0,4× ATK sur tous les ennemis ; soin sur la durée de 4 % des PV max pour l'équipe, 2 actions. | 46.10 % | -3.90 pp | ±2.50 pp | à renforcer |
| 88575 | Rem | UR | Tertiaire | Rem : Coup de fléau — Visée précise | 1,054× ATK ; critique +6 points pour le lanceur, 1 action. | 51.30 % | +1.30 pp | ±0.70 pp | dans la marge |
| 88575 | Rem | UR | Ultime | Rem — Déchaînement : Coup de fléau | 1,55× ATK ; critique +35 points pour le lanceur, 2 actions. | 51.60 % | +1.60 pp | ±0.77 pp | dans la marge |
| 88889 | Raphtalia | SSR | Base | Frappe inspirée de Transformation de raphtalia | esquive +3 points pour le lanceur, jusqu'à sa prochaine action | 54.50 % | +4.50 pp | ±2.28 pp | dans la marge |
| 88889 | Raphtalia | SSR | Secondaire | Transformation de raphtalia | 0,66× ATK ; esquive +18 % pour le lanceur, 1 action. | 56.30 % | +6.30 pp | ±2.97 pp | dans la marge |
| 88889 | Raphtalia | SSR | Tertiaire | Raphtalia : Transformation de raphtalia — Pas de côté | 1,054× ATK ; esquive +6 % pour le lanceur, 1 action. | 55.90 % | +5.90 pp | ±2.25 pp | dans la marge |
| 88889 | Raphtalia | SSR | Ultime | Raphtalia — Déchaînement : Transformation de raphtalia | 1,25× ATK ; esquive +30 % pour le lanceur, 2 actions. | 50.00 % | +0.00 pp | ±0.39 pp | à renforcer |
| 88892 | Katsuki Bakugou | UR | Base | Frappe inspirée de Howitzer Impact | ATK −3 % pour la cible, pour sa prochaine action | 50.70 % | +0.70 pp | ±0.59 pp | dans la marge |
| 88892 | Katsuki Bakugou | UR | Secondaire | Howitzer Impact | 0,4× ATK sur tous les ennemis. | 47.10 % | -2.90 pp | ±2.60 pp | à renforcer |
| 88892 | Katsuki Bakugou | UR | Tertiaire | Katsuki Bakugou : Howitzer Impact — Pression ciblée | 1,054× ATK ; ATK −8 % pour la cible, 1 action. | 52.70 % | +2.70 pp | ±0.99 pp | dans la marge |
| 88892 | Katsuki Bakugou | UR | Ultime | Katsuki Bakugou — Déchaînement : Howitzer Impact | 1,3× ATK ; ATK −20 % pour la cible, 2 actions. | 50.60 % | +0.60 pp | ±0.48 pp | dans la marge |
| 88937 | Koutarou Bokuto | SSR | Base | Frappe inspirée de Frappe de hibou | ATK +3 % pour le lanceur, pour sa prochaine action | 50.60 % | +0.60 pp | ±0.55 pp | dans la marge |
| 88937 | Koutarou Bokuto | SSR | Secondaire | Frappe de hibou | 0,92× ATK ; ATK +12 % pour le lanceur, 1 action. | 49.90 % | -0.10 pp | ±1.19 pp | dans la marge |
| 88937 | Koutarou Bokuto | SSR | Tertiaire | Koutarou Bokuto : Frappe de hibou — Élan bref | 1,054× ATK ; ATK +8 % pour le lanceur, 1 action. | 51.60 % | +1.60 pp | ±0.91 pp | dans la marge |
| 88937 | Koutarou Bokuto | SSR | Ultime | Koutarou Bokuto — Déchaînement : Frappe de hibou | 1,35× ATK ; ATK +20 % pour le lanceur, 2 actions. | 50.50 % | +0.50 pp | ±0.44 pp | à renforcer |
| 89028 | Izuku Midoriya | SSR | Base | Delaware Smash léger | ATK +3 % pour le lanceur, pour sa prochaine action | 51.50 % | +1.50 pp | ±0.75 pp | dans la marge |
| 89028 | Izuku Midoriya | SSR | Secondaire | One For All | 0,92× ATK ; ATK +12 % pour le lanceur, 1 action. | 51.30 % | +1.30 pp | ±1.72 pp | dans la marge |
| 89028 | Izuku Midoriya | SSR | Tertiaire | Izuku Midoriya : Delaware Smash léger — Élan bref | 1,054× ATK ; ATK +8 % pour le lanceur, 1 action. | 54.10 % | +4.10 pp | ±1.61 pp | dans la marge |
| 89028 | Izuku Midoriya | SSR | Ultime | Detroit Smash — Successeur | 1,75× ATK, ignore 30 % de la DEF ; ATK +20 % pour le lanceur, 2 actions. | 68.20 % | +18.20 pp | ±2.11 pp | trop fort |
| 89198 | Osamu Dazai | UR | Base | Frappe inspirée de Pas de la déchéance | ATK −3 % pour la cible, pour sa prochaine action | 50.50 % | +0.50 pp | ±0.44 pp | à renforcer |
| 89198 | Osamu Dazai | UR | Secondaire | Pas de la déchéance | 1,1× ATK ; silence sur la cible (sort de base seulement), 1 action; sans effet sur les boss. | 39.20 % | -10.80 pp | ±2.89 pp | à renforcer |
| 89198 | Osamu Dazai | UR | Tertiaire | Osamu Dazai : Pas de la déchéance — Pression ciblée | 1,054× ATK ; ATK −8 % pour la cible, 1 action. | 53.10 % | +3.10 pp | ±1.09 pp | dans la marge |
| 89198 | Osamu Dazai | UR | Ultime | Osamu Dazai — Déchaînement : Pas de la déchéance | 1,3× ATK ; ATK −20 % pour la cible, 2 actions. | 50.50 % | +0.50 pp | ±0.44 pp | à renforcer |
| 89201 | Ranpo Edogawa | SSR | Base | Frappe inspirée de Ultra-déduction | DEF −3 % pour la cible, pour sa prochaine action | 50.50 % | +0.50 pp | ±0.52 pp | dans la marge |
| 89201 | Ranpo Edogawa | SSR | Secondaire | Ultra-déduction | 0,85× ATK ; DEF −15 % pour la cible, 1 action. | 48.20 % | -1.80 pp | ±1.06 pp | à renforcer |
| 89201 | Ranpo Edogawa | SSR | Tertiaire | Ranpo Edogawa : Ultra-déduction — Brèche tactique | 1,054× ATK ; DEF −8 % pour la cible, 1 action. | 51.90 % | +1.90 pp | ±1.04 pp | dans la marge |
| 89201 | Ranpo Edogawa | SSR | Ultime | Ranpo Edogawa — Déchaînement : Ultra-déduction | 1,45× ATK ; DEF −20 % pour la cible, 2 actions. | 51.00 % | +1.00 pp | ±0.61 pp | dans la marge |
| 89220 | Shouto Todoroki | UR | Base | Éclat de glace et de feu | ATK −3 % pour la cible, pour sa prochaine action | 51.60 % | +1.60 pp | ±0.77 pp | dans la marge |
| 89220 | Shouto Todoroki | UR | Secondaire | Fire and Ice | 1,0779999999999998× ATK, traverse les boucliers. | 51.00 % | +1.00 pp | ±1.03 pp | dans la marge |
| 89220 | Shouto Todoroki | UR | Tertiaire | Shouto Todoroki : Éclat de glace et de feu — Pression ciblée | 1,054× ATK ; ATK −8 % pour la cible, 1 action. | 53.30 % | +3.30 pp | ±1.19 pp | dans la marge |
| 89220 | Shouto Todoroki | UR | Ultime | Glace et feu — Phosphor | 0,42× ATK sur tous les ennemis ; silence sur tous les ennemis (sort de base seulement), 1 action; sans effet sur les boss ; ATK −15 % pour tous les ennemis, 2 actions. | 49.70 % | -0.30 pp | ±0.76 pp | à renforcer |
| 89224 | Toshinori Yagi | SSR | Base | Poing du One For All | ATK +3 % pour le lanceur, pour sa prochaine action | 50.20 % | +0.20 pp | ±0.28 pp | à renforcer |
| 89224 | Toshinori Yagi | SSR | Secondaire | Symbole de la paix | 0,4× ATK sur tous les ennemis ; ATK +7 % pour l'équipe, 1 action. | 55.70 % | +5.70 pp | ±2.49 pp | dans la marge |
| 89224 | Toshinori Yagi | SSR | Tertiaire | Toshinori Yagi : Poing du One For All — Élan bref | 1,054× ATK ; ATK +8 % pour le lanceur, 1 action. | 52.30 % | +2.30 pp | ±1.04 pp | dans la marge |
| 89224 | Toshinori Yagi | SSR | Ultime | One For All — United States of Smash | soigne l'équipe de 50 % des PV max ; ATK +20 % pour l'équipe, 2 actions. | 50.30 % | +0.30 pp | ±0.52 pp | à renforcer |
| 89225 | Shouta Aizawa | SSR | Base | Frappe inspirée de Effacement | ATK −3 % pour la cible, pour sa prochaine action | 51.80 % | +1.80 pp | ±0.82 pp | dans la marge |
| 89225 | Shouta Aizawa | SSR | Secondaire | Effacement | 1,06× ATK ; silence sur la cible (sort de base seulement), 1 action; sans effet sur les boss. | 52.50 % | +2.50 pp | ±2.76 pp | dans la marge |
| 89225 | Shouta Aizawa | SSR | Tertiaire | Shouta Aizawa : Effacement — Pression ciblée | 1,054× ATK ; ATK −8 % pour la cible, 1 action. | 52.70 % | +2.70 pp | ±1.10 pp | dans la marge |
| 89225 | Shouta Aizawa | SSR | Ultime | Shouta Aizawa — Déchaînement : Effacement | 1,3× ATK ; ATK −20 % pour la cible, 2 actions. | 53.70 % | +3.70 pp | ±1.21 pp | dans la marge |
| 89243 | Eijirou Kirishima | SSR | Base | Frappe inspirée de Durcissement | DEF +3 % pour le lanceur, pour sa prochaine action | 51.90 % | +1.90 pp | ±0.97 pp | dans la marge |
| 89243 | Eijirou Kirishima | SSR | Secondaire | Durcissement | 0,4× ATK sur tous les ennemis ; DEF +8 % pour l'équipe, 2 actions. | 51.60 % | +1.60 pp | ±2.66 pp | dans la marge |
| 89243 | Eijirou Kirishima | SSR | Tertiaire | Eijirou Kirishima : Durcissement — Garde resserrée | 1,054× ATK ; DEF +8 % pour le lanceur, 1 action. | 57.20 % | +7.20 pp | ±1.64 pp | dans la marge |
| 89243 | Eijirou Kirishima | SSR | Ultime | Eijirou Kirishima — Déchaînement : Durcissement | 0,45× ATK sur tous les ennemis ; DEF +20 % pour l'équipe, 2 actions. | 50.00 % | +0.00 pp | ±0.00 pp | à renforcer |
| 89334 | Arataka Reigen | UR | Base | Frappe inspirée de Hypnose | ATK −3 % pour la cible, pour sa prochaine action | 51.00 % | +1.00 pp | ±0.67 pp | dans la marge |
| 89334 | Arataka Reigen | UR | Secondaire | Hypnose | 1,1× ATK ; silence sur la cible (sort de base seulement), 1 action; sans effet sur les boss. | 52.90 % | +2.90 pp | ±2.97 pp | dans la marge |
| 89334 | Arataka Reigen | UR | Tertiaire | Arataka Reigen : Hypnose — Pression ciblée | 1,054× ATK ; ATK −8 % pour la cible, 1 action. | 53.80 % | +3.80 pp | ±1.32 pp | dans la marge |
| 89334 | Arataka Reigen | UR | Ultime | Arataka Reigen — Déchaînement : Hypnose | 1,3× ATK ; ATK −20 % pour la cible, 2 actions. | 56.30 % | +6.30 pp | ±1.46 pp | dans la marge |
| 89361 | Megumin | UR | Base | Frappe inspirée de Explosion | ATK −3 % pour la cible, pour sa prochaine action | 50.30 % | +0.30 pp | ±0.52 pp | à renforcer |
| 89361 | Megumin | UR | Secondaire | Explosion | 0,4× ATK sur tous les ennemis. | 50.00 % | +0.00 pp | ±2.73 pp | dans la marge |
| 89361 | Megumin | UR | Tertiaire | Megumin : Explosion — Pression ciblée | 1,054× ATK ; ATK −8 % pour la cible, 1 action. | 52.30 % | +2.30 pp | ±1.18 pp | dans la marge |
| 89361 | Megumin | UR | Ultime | Megumin — Déchaînement : Explosion | 1,3× ATK ; ATK −20 % pour la cible, 2 actions. | 50.70 % | +0.70 pp | ±0.52 pp | dans la marge |
| 89362 | Aqua | SSR | Base | Frappe inspirée de Purification | rend 2 % des PV max au lanceur | 51.50 % | +1.50 pp | ±0.80 pp | dans la marge |
| 89362 | Aqua | SSR | Secondaire | Purification | 0,4× ATK sur tous les ennemis ; soigne l'équipe de 9 % des PV max ; retire les malus de l'équipe. | 55.30 % | +5.30 pp | ±2.77 pp | dans la marge |
| 89362 | Aqua | SSR | Tertiaire | Aqua : Purification — Second souffle | 1,054× ATK ; soigne le lanceur de 5 % des PV max. | 52.60 % | +2.60 pp | ±1.12 pp | dans la marge |
| 89362 | Aqua | SSR | Ultime | Aqua — Déchaînement : Purification | 0,4× ATK sur tous les ennemis ; soigne l'équipe de 30 % des PV max ; retire les malus de l'équipe. | 52.10 % | +2.10 pp | ±1.11 pp | dans la marge |
| 89364 | Kazuma Satou | SSR | Base | Frappe inspirée de Vol de talent | ATK −3 % pour la cible, pour sa prochaine action | 51.30 % | +1.30 pp | ±0.75 pp | dans la marge |
| 89364 | Kazuma Satou | SSR | Secondaire | Vol de talent | 1,0779999999999998× ATK. | 53.00 % | +3.00 pp | ±1.21 pp | dans la marge |
| 89364 | Kazuma Satou | SSR | Tertiaire | Kazuma Satou : Vol de talent — Pression ciblée | 1,054× ATK ; ATK −8 % pour la cible, 1 action. | 55.20 % | +5.20 pp | ±1.45 pp | dans la marge |
| 89364 | Kazuma Satou | SSR | Ultime | Kazuma Satou — Déchaînement : Vol de talent | 1,3× ATK ; ATK −20 % pour la cible, 2 actions. | 53.50 % | +3.50 pp | ±1.12 pp | dans la marge |
| 89616 | Shigeo Kageyama | UR | Base | Frappe inspirée de 100 % | ATK +3 % pour le lanceur, pour sa prochaine action | 51.40 % | +1.40 pp | ±0.78 pp | dans la marge |
| 89616 | Shigeo Kageyama | UR | Secondaire | 100 % | 0,94× ATK ; ATK +12 % pour le lanceur, 1 action. | 50.10 % | +0.10 pp | ±1.46 pp | dans la marge |
| 89616 | Shigeo Kageyama | UR | Tertiaire | Shigeo Kageyama : 100 % — Élan bref | 1,054× ATK ; ATK +8 % pour le lanceur, 1 action. | 54.50 % | +4.50 pp | ±1.43 pp | dans la marge |
| 89616 | Shigeo Kageyama | UR | Ultime | Shigeo Kageyama — Déchaînement : 100 % | 1,35× ATK ; ATK +20 % pour le lanceur, 2 actions. | 53.90 % | +3.90 pp | ±1.18 pp | dans la marge |
| 89853 | Chuuya Nakahara | SSR | Base | Frappe inspirée de Corruption | ignore 3 % de la DEF sur la prochaine attaque du lanceur | 49.90 % | -0.10 pp | ±0.20 pp | à renforcer |
| 89853 | Chuuya Nakahara | SSR | Secondaire | Corruption | 1,0899999999999999× ATK, traverse les boucliers. | 51.30 % | +1.30 pp | ±0.97 pp | dans la marge |
| 89853 | Chuuya Nakahara | SSR | Tertiaire | Chuuya Nakahara : Corruption — Percée mesurée | 1,224× ATK, ignore 12 % de la DEF. | 57.50 % | +7.50 pp | ±1.64 pp | dans la marge |
| 89853 | Chuuya Nakahara | SSR | Ultime | Chuuya Nakahara — Déchaînement : Corruption | 1,65× ATK, ignore 40 % de la DEF. | 50.50 % | +0.50 pp | ±0.44 pp | à renforcer |
| 90107 | Kusuo Saiki | SSR | Base | Frappe inspirée de Télépathie | critique −3 points pour la cible, pour sa prochaine action | 51.10 % | +1.10 pp | ±0.75 pp | dans la marge |
| 90107 | Kusuo Saiki | SSR | Secondaire | Télépathie | 0,4× ATK sur tous les ennemis ; critique −8 points pour tous les ennemis, 1 action ; DEF −8 % pour tous les ennemis, 1 action. | 40.30 % | -9.70 pp | ±2.88 pp | à renforcer |
| 90107 | Kusuo Saiki | SSR | Tertiaire | Kusuo Saiki : Télépathie — Trouble-fête | 1,054× ATK ; critique −6 points pour la cible, 1 action. | 52.30 % | +2.30 pp | ±1.39 pp | dans la marge |
| 90107 | Kusuo Saiki | SSR | Ultime | Kusuo Saiki — Déchaînement : Télépathie | 1,25× ATK ; critique −25 points pour la cible, 2 actions. | 56.60 % | +6.60 pp | ±1.94 pp | dans la marge |
| 90169 | Violet Evergarden | UR | Base | Frappe inspirée de Poupée de souvenirs | rend 2 % des PV max au lanceur | 51.60 % | +1.60 pp | ±0.82 pp | dans la marge |
| 90169 | Violet Evergarden | UR | Secondaire | Poupée de souvenirs | 0,4× ATK sur tous les ennemis ; soin sur la durée de 4 % des PV max pour l'équipe, 2 actions. | 51.40 % | +1.40 pp | ±2.72 pp | dans la marge |
| 90169 | Violet Evergarden | UR | Tertiaire | Violet Evergarden : Poupée de souvenirs — Second souffle | 1,054× ATK ; soigne le lanceur de 5 % des PV max. | 52.10 % | +2.10 pp | ±1.08 pp | dans la marge |
| 90169 | Violet Evergarden | UR | Ultime | Violet Evergarden — Déchaînement : Poupée de souvenirs | 0,4× ATK sur tous les ennemis ; soigne l'équipe de 30 % des PV max ; retire les malus de l'équipe. | 54.30 % | +4.30 pp | ±1.29 pp | dans la marge |
| 120649 | Kaguya Shinomiya | UR | Base | Frappe inspirée de Guerre de l'amour | ATK −3 % pour la cible, pour sa prochaine action | 51.90 % | +1.90 pp | ±0.84 pp | dans la marge |
| 120649 | Kaguya Shinomiya | UR | Secondaire | Guerre de l'amour | 1,1× ATK ; silence sur la cible (sort de base seulement), 1 action; sans effet sur les boss. | 47.60 % | -2.40 pp | ±3.02 pp | à renforcer |
| 120649 | Kaguya Shinomiya | UR | Tertiaire | Kaguya Shinomiya : Guerre de l'amour — Pression ciblée | 1,054× ATK ; ATK −8 % pour la cible, 1 action. | 53.70 % | +3.70 pp | ±1.47 pp | dans la marge |
| 120649 | Kaguya Shinomiya | UR | Ultime | Kaguya Shinomiya — Déchaînement : Guerre de l'amour | 1,3× ATK ; ATK −20 % pour la cible, 2 actions. | 54.50 % | +4.50 pp | ±1.37 pp | dans la marge |
| 121052 | Tanya Degurechaff | SSR | Base | Frappe inspirée de Magie des mots | ignore 3 % de la DEF sur la prochaine attaque du lanceur | 49.90 % | -0.10 pp | ±0.20 pp | à renforcer |
| 121052 | Tanya Degurechaff | SSR | Secondaire | Magie des mots | 1,0899999999999999× ATK, traverse les boucliers. | 49.90 % | -0.10 pp | ±0.81 pp | à renforcer |
| 121052 | Tanya Degurechaff | SSR | Tertiaire | Tanya Degurechaff : Magie des mots — Percée mesurée | 1,224× ATK, ignore 12 % de la DEF. | 54.30 % | +4.30 pp | ±1.49 pp | dans la marge |
| 121052 | Tanya Degurechaff | SSR | Ultime | Tanya Degurechaff — Déchaînement : Magie des mots | 1,65× ATK, ignore 40 % de la DEF. | 50.00 % | +0.00 pp | ±0.00 pp | à renforcer |
| 121101 | Miyuki Shirogane | SSR | Base | Frappe inspirée de Président du conseil | critique +3 points pour le lanceur, pour sa prochaine action | 50.80 % | +0.80 pp | ±0.55 pp | dans la marge |
| 121101 | Miyuki Shirogane | SSR | Secondaire | Président du conseil | 0,56× ATK ; critique +8 points pour l'équipe, 1 action. | 36.60 % | -13.40 pp | ±2.48 pp | à renforcer |
| 121101 | Miyuki Shirogane | SSR | Tertiaire | Miyuki Shirogane : Président du conseil — Visée précise | 1,054× ATK ; critique +6 points pour le lanceur, 1 action. | 51.40 % | +1.40 pp | ±1.14 pp | dans la marge |
| 121101 | Miyuki Shirogane | SSR | Ultime | Miyuki Shirogane — Déchaînement : Président du conseil | 1,55× ATK ; critique +35 points pour le lanceur, 2 actions. | 54.80 % | +4.80 pp | ±1.59 pp | dans la marge |
| 121102 | Yuu Ishigami | SSR | Base | Frappe inspirée de Cri du cœur | DEF −3 % pour la cible, pour sa prochaine action | 51.50 % | +1.50 pp | ±0.85 pp | dans la marge |
| 121102 | Yuu Ishigami | SSR | Secondaire | Cri du cœur | 0,85× ATK ; DEF −15 % pour la cible, 1 action. | 43.10 % | -6.90 pp | ±1.92 pp | à renforcer |
| 121102 | Yuu Ishigami | SSR | Tertiaire | Yuu Ishigami : Cri du cœur — Brèche tactique | 1,054× ATK ; DEF −8 % pour la cible, 1 action. | 54.00 % | +4.00 pp | ±1.53 pp | dans la marge |
| 121102 | Yuu Ishigami | SSR | Ultime | Yuu Ishigami — Déchaînement : Cri du cœur | 1,45× ATK ; DEF −20 % pour la cible, 2 actions. | 60.70 % | +10.70 pp | ±2.08 pp | trop fort |
| 121103 | Chika Fujiwara | UR | Base | Frappe inspirée de Chika Dance | ATK +3 % pour le lanceur, pour sa prochaine action | 50.30 % | +0.30 pp | ±0.34 pp | à renforcer |
| 121103 | Chika Fujiwara | UR | Secondaire | Chika Dance | 0,4× ATK sur tous les ennemis ; ATK +7 % pour l'équipe, 1 action. | 47.00 % | -3.00 pp | ±2.34 pp | à renforcer |
| 121103 | Chika Fujiwara | UR | Tertiaire | Chika Fujiwara : Chika Dance — Élan bref | 1,054× ATK ; ATK +8 % pour le lanceur, 1 action. | 52.40 % | +2.40 pp | ±1.09 pp | dans la marge |
| 121103 | Chika Fujiwara | UR | Ultime | Chika Fujiwara — Déchaînement : Chika Dance | 1,35× ATK ; ATK +20 % pour le lanceur, 2 actions. | 50.80 % | +0.80 pp | ±0.68 pp | dans la marge |
| 121104 | Ai Hayasaka | SSR | Base | Frappe inspirée de Ninja du conseil | esquive +3 points pour le lanceur, jusqu'à sa prochaine action | 50.90 % | +0.90 pp | ±1.97 pp | dans la marge |
| 121104 | Ai Hayasaka | SSR | Secondaire | Ninja du conseil | 0,66× ATK ; esquive +18 % pour le lanceur, 1 action. | 35.90 % | -14.10 pp | ±2.54 pp | à renforcer |
| 121104 | Ai Hayasaka | SSR | Tertiaire | Ai Hayasaka : Ninja du conseil — Pas de côté | 1,054× ATK ; esquive +6 % pour le lanceur, 1 action. | 51.00 % | +1.00 pp | ±1.84 pp | dans la marge |
| 121104 | Ai Hayasaka | SSR | Ultime | Ai Hayasaka — Déchaînement : Ninja du conseil | 1,25× ATK ; esquive +30 % pour le lanceur, 2 actions. | 60.60 % | +10.60 pp | ±2.18 pp | trop fort |
| 121700 | Norman | SSR | Base | Frappe inspirée de Cerveau de la ferme | bouclier de 2 % des PV max pour le lanceur | 51.20 % | +1.20 pp | ±0.73 pp | dans la marge |
| 121700 | Norman | SSR | Secondaire | Cerveau de la ferme | 0,4× ATK sur tous les ennemis ; immunité aux malus pour l'équipe, 1 action ; bouclier de 2 % des PV max pour l'équipe. | 54.60 % | +4.60 pp | ±2.59 pp | dans la marge |
| 121700 | Norman | SSR | Tertiaire | Norman : Cerveau de la ferme — Garde protectrice | 1,054× ATK ; bouclier de 6 % des PV max pour le lanceur. | 53.10 % | +3.10 pp | ±1.19 pp | dans la marge |
| 121700 | Norman | SSR | Ultime | Norman — Déchaînement : Cerveau de la ferme | 0,5× ATK sur tous les ennemis ; bouclier de 20 % des PV max pour l'équipe. | 50.20 % | +0.20 pp | ±0.28 pp | à renforcer |
| 121724 | Ray | SSR | Base | Frappe inspirée de Plan d'évasion | ATK −3 % pour la cible, pour sa prochaine action | 51.30 % | +1.30 pp | ±0.70 pp | dans la marge |
| 121724 | Ray | SSR | Secondaire | Plan d'évasion | 0,98× ATK ; ATK −12 % pour la cible, 1 action. | 51.30 % | +1.30 pp | ±0.97 pp | dans la marge |
| 121724 | Ray | SSR | Tertiaire | Ray : Plan d'évasion — Pression ciblée | 1,054× ATK ; ATK −8 % pour la cible, 1 action. | 53.20 % | +3.20 pp | ±1.07 pp | dans la marge |
| 121724 | Ray | SSR | Ultime | Ray — Déchaînement : Plan d'évasion | 1,3× ATK ; ATK −20 % pour la cible, 2 actions. | 55.00 % | +5.00 pp | ±1.35 pp | dans la marge |
| 121889 | Yumeko Jabami | SSR | Base | Frappe inspirée de Pari fou | critique −3 points pour la cible, pour sa prochaine action | 50.80 % | +0.80 pp | ±0.55 pp | dans la marge |
| 121889 | Yumeko Jabami | SSR | Secondaire | Pari fou | 0,4× ATK sur tous les ennemis ; critique −8 points pour tous les ennemis, 1 action ; DEF −8 % pour tous les ennemis, 1 action. | 50.10 % | +0.10 pp | ±2.75 pp | dans la marge |
| 121889 | Yumeko Jabami | SSR | Tertiaire | Yumeko Jabami : Pari fou — Trouble-fête | 1,054× ATK ; critique −6 points pour la cible, 1 action. | 51.80 % | +1.80 pp | ±0.86 pp | dans la marge |
| 121889 | Yumeko Jabami | SSR | Ultime | Yumeko Jabami — Déchaînement : Pari fou | 1,25× ATK ; critique −25 points pour la cible, 2 actions. | 52.30 % | +2.30 pp | ±1.00 pp | dans la marge |
| 121956 | Shouko Komi | SSR | Base | Frappe inspirée de Communication par carnet | esquive +3 points pour le lanceur, jusqu'à sa prochaine action | 52.60 % | +2.60 pp | ±2.08 pp | dans la marge |
| 121956 | Shouko Komi | SSR | Secondaire | Communication par carnet | 0,4× ATK sur tous les ennemis ; esquive +5 % pour l'équipe, 1 action. | 51.50 % | +1.50 pp | ±2.98 pp | dans la marge |
| 121956 | Shouko Komi | SSR | Tertiaire | Shouko Komi : Communication par carnet — Pas de côté | 1,054× ATK ; esquive +6 % pour le lanceur, 1 action. | 53.60 % | +3.60 pp | ±2.11 pp | dans la marge |
| 121956 | Shouko Komi | SSR | Ultime | Shouko Komi — Déchaînement : Communication par carnet | 1,25× ATK ; esquive +30 % pour le lanceur, 2 actions. | 53.30 % | +3.30 pp | ±1.19 pp | dans la marge |
| 123212 | Kiyotaka Ayanokouji | SSR | Base | Frappe inspirée de Manipulation | ATK −3 % pour la cible, pour sa prochaine action | 50.70 % | +0.70 pp | ±0.59 pp | dans la marge |
| 123212 | Kiyotaka Ayanokouji | SSR | Secondaire | Manipulation | 0,98× ATK ; ATK −12 % pour la cible, 1 action. | 50.20 % | +0.20 pp | ±1.33 pp | dans la marge |
| 123212 | Kiyotaka Ayanokouji | SSR | Tertiaire | Kiyotaka Ayanokouji : Manipulation — Pression ciblée | 1,054× ATK ; ATK −8 % pour la cible, 1 action. | 54.40 % | +4.40 pp | ±1.47 pp | dans la marge |
| 123212 | Kiyotaka Ayanokouji | SSR | Ultime | Kiyotaka Ayanokouji — Déchaînement : Manipulation | 1,3× ATK ; ATK −20 % pour la cible, 2 actions. | 57.20 % | +7.20 pp | ±1.57 pp | dans la marge |
| 123285 | Asta | SSR | Base | Frappe inspirée de Anti-magie | ATK −3 % pour la cible, pour sa prochaine action | 50.80 % | +0.80 pp | ±0.55 pp | dans la marge |
| 123285 | Asta | SSR | Secondaire | Anti-magie | 1,0779999999999998× ATK. | 53.00 % | +3.00 pp | ±1.21 pp | dans la marge |
| 123285 | Asta | SSR | Tertiaire | Asta : Anti-magie — Pression ciblée | 1,054× ATK ; ATK −8 % pour la cible, 1 action. | 54.40 % | +4.40 pp | ±1.39 pp | dans la marge |
| 123285 | Asta | SSR | Ultime | Asta — Déchaînement : Anti-magie | 1,3× ATK ; ATK −20 % pour la cible, 2 actions. | 53.30 % | +3.30 pp | ±1.16 pp | dans la marge |
| 123385 | Phosphophyllite | SSR | Base | Frappe inspirée de Éclats de lustre | bouclier de 2 % des PV max pour le lanceur | 53.10 % | +3.10 pp | ±1.16 pp | dans la marge |
| 123385 | Phosphophyllite | SSR | Secondaire | Éclats de lustre | 0,4× ATK sur tous les ennemis ; bouclier de 3 % des PV max pour l'équipe. | 59.40 % | +9.40 pp | ±2.91 pp | trop fort |
| 123385 | Phosphophyllite | SSR | Tertiaire | Phosphophyllite : Éclats de lustre — Garde protectrice | 1,054× ATK ; bouclier de 6 % des PV max pour le lanceur. | 57.90 % | +7.90 pp | ±1.95 pp | dans la marge |
| 123385 | Phosphophyllite | SSR | Ultime | Phosphophyllite — Déchaînement : Éclats de lustre | 0,5× ATK sur tous les ennemis ; bouclier de 20 % des PV max pour l'équipe. | 58.40 % | +8.40 pp | ±1.69 pp | trop fort |
| 123962 | Rimuru Tempest | SSR | Base | Frappe inspirée de Dévoreur | poison : 0,5 % des PV max de la cible à sa prochaine action | 51.25 % | +1.25 pp | ±0.73 pp | dans la marge |
| 123962 | Rimuru Tempest | SSR | Secondaire | Dévoreur | 0,4× ATK sur tous les ennemis ; poison : 3 % des PV max par action pour tous les ennemis, 2 actions. | 46.90 % | -3.10 pp | ±2.80 pp | à renforcer |
| 123962 | Rimuru Tempest | SSR | Tertiaire | Rimuru Tempest : Dévoreur — Marque persistante | 1,054× ATK ; poison : 2 % des PV max par action pour la cible, 2 actions. | 51.75 % | +1.75 pp | ±1.40 pp | dans la marge |
| 123962 | Rimuru Tempest | SSR | Ultime | Rimuru Tempest — Déchaînement : Dévoreur | 1,15× ATK ; poison : 8 % des PV max par action pour la cible, 3 actions. | 53.95 % | +3.95 pp | ±1.30 pp | dans la marge |
| 124142 | Senkuu Ishigami | SSR | Base | Frappe inspirée de Science du monde | rend 2 % des PV max au lanceur | 54.40 % | +4.40 pp | ±1.33 pp | dans la marge |
| 124142 | Senkuu Ishigami | SSR | Secondaire | Science du monde | 0,4× ATK sur tous les ennemis ; soin sur la durée de 4 % des PV max pour l'équipe, 2 actions. | 60.30 % | +10.30 pp | ±2.76 pp | trop fort |
| 124142 | Senkuu Ishigami | SSR | Tertiaire | Senkuu Ishigami : Science du monde — Second souffle | 1,054× ATK ; soigne le lanceur de 5 % des PV max. | 53.20 % | +3.20 pp | ±1.27 pp | dans la marge |
| 124142 | Senkuu Ishigami | SSR | Ultime | Senkuu Ishigami — Déchaînement : Science du monde | 0,4× ATK sur tous les ennemis ; soigne l'équipe de 30 % des PV max ; retire les malus de l'équipe. | 69.80 % | +19.80 pp | ±2.20 pp | trop fort |
| 124381 | Zero Two | SSR | Base | Frappe inspirée de Piloter le Strelizia | rend 2 % des dégâts infligés en PV | 51.10 % | +1.10 pp | ±0.70 pp | dans la marge |
| 124381 | Zero Two | SSR | Secondaire | Piloter le Strelizia | 1,024× ATK, rend 24 % des dégâts en PV. | 52.90 % | +2.90 pp | ±1.10 pp | dans la marge |
| 124381 | Zero Two | SSR | Tertiaire | Zero Two : Piloter le Strelizia — Siphon léger | 1,1560000000000001× ATK, rend 15 % des dégâts en PV. | 54.70 % | +4.70 pp | ±1.69 pp | dans la marge |
| 124381 | Zero Two | SSR | Ultime | Zero Two — Déchaînement : Piloter le Strelizia | 1,55× ATK, rend 65 % des dégâts en PV. | 68.30 % | +18.30 pp | ±2.11 pp | trop fort |
| 124382 | Ichigo | UR | Base | Frappe inspirée de Triade | rend 2 % des PV max au lanceur | 51.10 % | +1.10 pp | ±0.64 pp | dans la marge |
| 124382 | Ichigo | UR | Secondaire | Triade | 0,4× ATK sur tous les ennemis ; soigne l'équipe de 9 % des PV max ; retire les malus de l'équipe. | 46.80 % | -3.20 pp | ±2.15 pp | à renforcer |
| 124382 | Ichigo | UR | Tertiaire | Ichigo : Triade — Second souffle | 1,054× ATK ; soigne le lanceur de 5 % des PV max. | 55.80 % | +5.80 pp | ±1.56 pp | dans la marge |
| 124382 | Ichigo | UR | Ultime | Ichigo — Déchaînement : Triade | 0,4× ATK sur tous les ennemis ; soigne l'équipe de 30 % des PV max ; retire les malus de l'équipe. | 50.60 % | +0.60 pp | ±0.48 pp | dans la marge |
| 124440 | Yami Sukehiro | SSR | Base | Frappe inspirée de Zankantou | ignore 3 % de la DEF sur la prochaine attaque du lanceur | 51.10 % | +1.10 pp | ±0.64 pp | dans la marge |
| 124440 | Yami Sukehiro | SSR | Secondaire | Zankantou | 0,94× ATK, ignore 15 % de la DEF. | 49.10 % | -0.90 pp | ±0.94 pp | à renforcer |
| 124440 | Yami Sukehiro | SSR | Tertiaire | Yami Sukehiro : Zankantou — Percée mesurée | 1,224× ATK, ignore 12 % de la DEF. | 59.00 % | +9.00 pp | ±1.82 pp | trop fort |
| 124440 | Yami Sukehiro | SSR | Ultime | Yami Sukehiro — Déchaînement : Zankantou | 1,65× ATK, ignore 40 % de la DEF. | 64.90 % | +14.90 pp | ±2.01 pp | trop fort |
| 125168 | Legoshi | SSR | Base | Frappe inspirée de Instinct de loup | rend 2 % des dégâts infligés en PV | 50.10 % | +0.10 pp | ±0.34 pp | à renforcer |
| 125168 | Legoshi | SSR | Secondaire | Instinct de loup | 1,024× ATK, rend 24 % des dégâts en PV. | 51.80 % | +1.80 pp | ±1.10 pp | dans la marge |
| 125168 | Legoshi | SSR | Tertiaire | Legoshi : Instinct de loup — Siphon léger | 1,1560000000000001× ATK, rend 15 % des dégâts en PV. | 53.00 % | +3.00 pp | ±1.27 pp | dans la marge |
| 125168 | Legoshi | SSR | Ultime | Legoshi — Déchaînement : Instinct de loup | 1,55× ATK, rend 65 % des dégâts en PV. | 50.00 % | +0.00 pp | ±0.00 pp | à renforcer |
| 125659 | Gabi Braun | SSR | Base | Frappe inspirée de Titan Mâchoire | ATK −3 % pour la cible, pour sa prochaine action | 51.10 % | +1.10 pp | ±0.64 pp | dans la marge |
| 125659 | Gabi Braun | SSR | Secondaire | Titan Mâchoire | 1,0779999999999998× ATK. | 52.50 % | +2.50 pp | ±1.07 pp | dans la marge |
| 125659 | Gabi Braun | SSR | Tertiaire | Gabi Braun : Titan Mâchoire — Pression ciblée | 1,054× ATK ; ATK −8 % pour la cible, 1 action. | 53.60 % | +3.60 pp | ±1.20 pp | dans la marge |
| 125659 | Gabi Braun | SSR | Ultime | Gabi Braun — Déchaînement : Titan Mâchoire | 1,3× ATK ; ATK −20 % pour la cible, 2 actions. | 54.30 % | +4.30 pp | ±1.23 pp | dans la marge |
| 125886 | Miko Iino | SSR | Base | Frappe inspirée de Règlement intérieur | ATK −3 % pour la cible, pour sa prochaine action | 53.70 % | +3.70 pp | ±1.24 pp | dans la marge |
| 125886 | Miko Iino | SSR | Secondaire | Règlement intérieur | 0,98× ATK ; ATK −12 % pour la cible, 1 action. | 51.00 % | +1.00 pp | ±1.59 pp | dans la marge |
| 125886 | Miko Iino | SSR | Tertiaire | Miko Iino : Règlement intérieur — Pression ciblée | 1,054× ATK ; ATK −8 % pour la cible, 1 action. | 52.90 % | +2.90 pp | ±1.59 pp | dans la marge |
| 125886 | Miko Iino | SSR | Ultime | Miko Iino — Déchaînement : Règlement intérieur | 1,3× ATK ; ATK −20 % pour la cible, 2 actions. | 64.10 % | +14.10 pp | ±2.11 pp | trop fort |
| 126071 | Tanjirou Kamado | UR | Base | Frappe inspirée de Respiration de l'eau | ATK +3 % pour le lanceur, pour sa prochaine action | 50.70 % | +0.70 pp | ±0.70 pp | dans la marge |
| 126071 | Tanjirou Kamado | UR | Secondaire | Respiration de l'eau | 0,94× ATK ; ATK +12 % pour le lanceur, 1 action. | 49.30 % | -0.70 pp | ±1.29 pp | à renforcer |
| 126071 | Tanjirou Kamado | UR | Tertiaire | Tanjirou Kamado : Respiration de l'eau — Élan bref | 1,054× ATK ; ATK +8 % pour le lanceur, 1 action. | 53.10 % | +3.10 pp | ±1.09 pp | dans la marge |
| 126071 | Tanjirou Kamado | UR | Ultime | Tanjirou Kamado — Déchaînement : Respiration de l'eau | 1,35× ATK ; ATK +20 % pour le lanceur, 2 actions. | 52.40 % | +2.40 pp | ±0.94 pp | dans la marge |
| 126372 | Nino Nakano | SSR | Base | Frappe inspirée de Cuisine piquante | DEF −3 % pour la cible, pour sa prochaine action | 51.40 % | +1.40 pp | ±0.82 pp | dans la marge |
| 126372 | Nino Nakano | SSR | Secondaire | Cuisine piquante | 0,85× ATK ; DEF −15 % pour la cible, 1 action. | 45.00 % | -5.00 pp | ±1.63 pp | à renforcer |
| 126372 | Nino Nakano | SSR | Tertiaire | Nino Nakano : Cuisine piquante — Brèche tactique | 1,054× ATK ; DEF −8 % pour la cible, 1 action. | 52.80 % | +2.80 pp | ±1.42 pp | dans la marge |
| 126372 | Nino Nakano | SSR | Ultime | Nino Nakano — Déchaînement : Cuisine piquante | 1,45× ATK ; DEF −20 % pour la cible, 2 actions. | 56.40 % | +6.40 pp | ±1.75 pp | dans la marge |
| 126373 | Miku Nakano | SSR | Base | Frappe inspirée de Fleur de tendresse | rend 2 % des PV max au lanceur | 53.10 % | +3.10 pp | ±1.06 pp | dans la marge |
| 126373 | Miku Nakano | SSR | Secondaire | Fleur de tendresse | 0,4× ATK sur tous les ennemis ; soigne l'équipe de 9 % des PV max ; retire les malus de l'équipe. | 42.10 % | -7.90 pp | ±2.78 pp | à renforcer |
| 126373 | Miku Nakano | SSR | Tertiaire | Miku Nakano : Fleur de tendresse — Second souffle | 1,054× ATK ; soigne le lanceur de 5 % des PV max. | 52.10 % | +2.10 pp | ±1.27 pp | dans la marge |
| 126373 | Miku Nakano | SSR | Ultime | Miku Nakano — Déchaînement : Fleur de tendresse | 0,4× ATK sur tous les ennemis ; soigne l'équipe de 30 % des PV max ; retire les malus de l'équipe. | 57.00 % | +7.00 pp | ±1.86 pp | dans la marge |
| 126375 | Itsuki Nakano | UR | Base | Frappe inspirée de Cinq frères et sœurs | critique +3 points pour le lanceur, pour sa prochaine action | 50.10 % | +0.10 pp | ±0.20 pp | à renforcer |
| 126375 | Itsuki Nakano | UR | Secondaire | Cinq frères et sœurs | 0,56× ATK ; critique +8 points pour l'équipe, 1 action. | 36.10 % | -13.90 pp | ±2.29 pp | à renforcer |
| 126375 | Itsuki Nakano | UR | Tertiaire | Itsuki Nakano : Cinq frères et sœurs — Visée précise | 1,054× ATK ; critique +6 points pour le lanceur, 1 action. | 50.90 % | +0.90 pp | ±0.70 pp | dans la marge |
| 126375 | Itsuki Nakano | UR | Ultime | Itsuki Nakano — Déchaînement : Cinq frères et sœurs | 1,55× ATK ; critique +35 points pour le lanceur, 2 actions. | 50.50 % | +0.50 pp | ±0.52 pp | dans la marge |
| 126635 | Megumi Fushiguro | UR | Base | Coup de Nue | bouclier de 0,5 % des PV max pour le lanceur | 50.90 % | +0.90 pp | ±0.58 pp | dans la marge |
| 126635 | Megumi Fushiguro | UR | Secondaire | Mahoraga | 0,4× ATK sur tous les ennemis ; DEF +8 % pour l'équipe, 2 actions ; immunité aux malus pour l'équipe, 1 action. | 53.50 % | +3.50 pp | ±2.56 pp | dans la marge |
| 126635 | Megumi Fushiguro | UR | Tertiaire | Megumi Fushiguro : Coup de Nue — Garde protectrice | 1,054× ATK ; bouclier de 6 % des PV max pour le lanceur. | 57.90 % | +7.90 pp | ±1.78 pp | trop fort |
| 126635 | Megumi Fushiguro | UR | Ultime | Megumi Fushiguro — Déchaînement : Coup de Nue | 0,5× ATK sur tous les ennemis ; bouclier de 20 % des PV max pour l'équipe. | 54.80 % | +4.80 pp | ±1.29 pp | dans la marge |
| 126824 | Maomao | UR | Base | Frappe inspirée de Analyse de poisons | DEF −3 % pour la cible, pour sa prochaine action | 51.00 % | +1.00 pp | ±0.73 pp | dans la marge |
| 126824 | Maomao | UR | Secondaire | Analyse de poisons | 0,72× ATK ; DEF −15 % pour la cible, 1 action. | 42.90 % | -7.10 pp | ±1.60 pp | à renforcer |
| 126824 | Maomao | UR | Tertiaire | Maomao : Analyse de poisons — Brèche tactique | 1,054× ATK ; DEF −8 % pour la cible, 1 action. | 54.80 % | +4.80 pp | ±1.35 pp | dans la marge |
| 126824 | Maomao | UR | Ultime | Maomao — Déchaînement : Analyse de poisons | 1,45× ATK ; DEF −20 % pour la cible, 2 actions. | 57.20 % | +7.20 pp | ±1.54 pp | dans la marge |
| 127212 | Yuuji Itadori | UR | Base | Coup divergeant | critique +3 points pour le lanceur, pour sa prochaine action | 50.50 % | +0.50 pp | ±0.44 pp | à renforcer |
| 127212 | Yuuji Itadori | UR | Secondaire | Black Flash | 1,237× ATK. | 57.80 % | +7.80 pp | ±1.71 pp | trop fort |
| 127212 | Yuuji Itadori | UR | Tertiaire | Yuuji Itadori : Coup divergeant — Visée précise | 1,054× ATK ; critique +6 points pour le lanceur, 1 action. | 51.50 % | +1.50 pp | ±1.08 pp | dans la marge |
| 127212 | Yuuji Itadori | UR | Ultime | Yuuji Itadori — Déchaînement : Coup divergeant | 1,55× ATK ; critique +35 points pour le lanceur, 2 actions. | 58.90 % | +8.90 pp | ±1.68 pp | trop fort |
| 127221 | Sakuta Azusagawa | SSR | Base | Frappe inspirée de Syndrome de l'adolescence | rend 2 % des PV max au lanceur | 52.10 % | +2.10 pp | ±0.88 pp | dans la marge |
| 127221 | Sakuta Azusagawa | SSR | Secondaire | Syndrome de l'adolescence | 0,4× ATK sur tous les ennemis ; soin sur la durée de 4 % des PV max pour l'équipe, 2 actions. | 44.30 % | -5.70 pp | ±2.86 pp | à renforcer |
| 127221 | Sakuta Azusagawa | SSR | Tertiaire | Sakuta Azusagawa : Syndrome de l'adolescence — Second souffle | 1,054× ATK ; soigne le lanceur de 5 % des PV max. | 53.20 % | +3.20 pp | ±1.18 pp | dans la marge |
| 127221 | Sakuta Azusagawa | SSR | Ultime | Sakuta Azusagawa — Déchaînement : Syndrome de l'adolescence | 0,4× ATK sur tous les ennemis ; soigne l'équipe de 30 % des PV max ; retire les malus de l'équipe. | 56.10 % | +6.10 pp | ±1.71 pp | dans la marge |
| 127222 | Mai Sakurajima | UR | Base | Frappe inspirée de Charme de lapine | esquive +3 points pour le lanceur, jusqu'à sa prochaine action | 52.40 % | +2.40 pp | ±1.95 pp | dans la marge |
| 127222 | Mai Sakurajima | UR | Secondaire | Charme de lapine | 0,4× ATK sur tous les ennemis ; esquive +5 % pour l'équipe, 1 action. | 47.50 % | -2.50 pp | ±2.85 pp | à renforcer |
| 127222 | Mai Sakurajima | UR | Tertiaire | Mai Sakurajima : Charme de lapine — Pas de côté | 1,054× ATK ; esquive +6 % pour le lanceur, 1 action. | 53.80 % | +3.80 pp | ±1.83 pp | dans la marge |
| 127222 | Mai Sakurajima | UR | Ultime | Mai Sakurajima — Déchaînement : Charme de lapine | 1,25× ATK ; esquive +30 % pour le lanceur, 2 actions. | 56.70 % | +6.70 pp | ±1.59 pp | dans la marge |
| 127518 | Nezuko Kamado | SSR | Base | Frappe inspirée de Forme de démon | rend 0,5 % des PV max au lanceur | 50.70 % | +0.70 pp | ±0.52 pp | dans la marge |
| 127518 | Nezuko Kamado | SSR | Secondaire | Forme de démon | 0,4× ATK sur tous les ennemis ; soin sur la durée de 4 % des PV max pour l'équipe, 2 actions. | 43.70 % | -6.30 pp | ±2.77 pp | à renforcer |
| 127518 | Nezuko Kamado | SSR | Tertiaire | Nezuko Kamado : Forme de démon — Second souffle | 1,054× ATK ; soigne le lanceur de 5 % des PV max. | 50.80 % | +0.80 pp | ±1.41 pp | dans la marge |
| 127518 | Nezuko Kamado | SSR | Ultime | Nezuko Kamado — Déchaînement : Forme de démon | 0,4× ATK sur tous les ennemis ; soigne l'équipe de 30 % des PV max ; retire les malus de l'équipe. | 59.30 % | +9.30 pp | ±1.92 pp | trop fort |
| 127691 | Satoru Gojou | UR | Base | Impulsion d'Infini | bouclier de 0,08 % des PV max pour le lanceur | 50.30 % | +0.30 pp | ±0.34 pp | à renforcer |
| 127691 | Satoru Gojou | UR | Secondaire | Pourpre | 0,45599999999999996× ATK sur tous les ennemis, traverse les boucliers. | 39.10 % | -10.90 pp | ±2.97 pp | à renforcer |
| 127691 | Satoru Gojou | UR | Tertiaire | Satoru Gojou : Impulsion d'Infini — Garde protectrice | 1,054× ATK ; bouclier de 6 % des PV max pour le lanceur. | 54.50 % | +4.50 pp | ±1.53 pp | dans la marge |
| 127691 | Satoru Gojou | UR | Ultime | Pourpre | 0,72× ATK sur tous les ennemis, traverse les boucliers. | 42.40 % | -7.60 pp | ±1.80 pp | à renforcer |
| 128106 | Chizuru Ichinose | SSR | Base | Frappe inspirée de Sourire parfait | rend 2 % des PV max au lanceur | 50.80 % | +0.80 pp | ±0.62 pp | dans la marge |
| 128106 | Chizuru Ichinose | SSR | Secondaire | Sourire parfait | 0,4× ATK sur tous les ennemis ; soin sur la durée de 4 % des PV max pour l'équipe, 2 actions. | 50.60 % | +0.60 pp | ±2.76 pp | dans la marge |
| 128106 | Chizuru Ichinose | SSR | Tertiaire | Chizuru Ichinose : Sourire parfait — Second souffle | 1,054× ATK ; soigne le lanceur de 5 % des PV max. | 52.80 % | +2.80 pp | ±1.01 pp | dans la marge |
| 128106 | Chizuru Ichinose | SSR | Ultime | Chizuru Ichinose — Déchaînement : Sourire parfait | 0,4× ATK sur tous les ennemis ; soigne l'équipe de 30 % des PV max ; retire les malus de l'équipe. | 50.30 % | +0.30 pp | ±0.52 pp | à renforcer |
| 128651 | Hanako | SSR | Base | Frappe inspirée de Sceau des légendes | ATK −3 % pour la cible, pour sa prochaine action | 50.20 % | +0.20 pp | ±0.39 pp | à renforcer |
| 128651 | Hanako | SSR | Secondaire | Sceau des légendes | 1,06× ATK ; silence sur la cible (sort de base seulement), 1 action; sans effet sur les boss. | 55.70 % | +5.70 pp | ±2.85 pp | dans la marge |
| 128651 | Hanako | SSR | Tertiaire | Hanako : Sceau des légendes — Pression ciblée | 1,054× ATK ; ATK −8 % pour la cible, 1 action. | 53.20 % | +3.20 pp | ±1.24 pp | dans la marge |
| 128651 | Hanako | SSR | Ultime | Hanako — Déchaînement : Sceau des légendes | 1,3× ATK ; ATK −20 % pour la cible, 2 actions. | 52.40 % | +2.40 pp | ±0.94 pp | dans la marge |
| 129130 | Inosuke Hashibira | SSR | Base | Frappe inspirée de Respiration de la bête | ATK +3 % pour le lanceur, pour sa prochaine action | 51.90 % | +1.90 pp | ±0.97 pp | dans la marge |
| 129130 | Inosuke Hashibira | SSR | Secondaire | Respiration de la bête | 0,92× ATK ; ATK +12 % pour le lanceur, 1 action. | 50.70 % | +0.70 pp | ±1.74 pp | dans la marge |
| 129130 | Inosuke Hashibira | SSR | Tertiaire | Inosuke Hashibira : Respiration de la bête — Élan bref | 1,054× ATK ; ATK +8 % pour le lanceur, 1 action. | 52.90 % | +2.90 pp | ±1.61 pp | dans la marge |
| 129130 | Inosuke Hashibira | SSR | Ultime | Inosuke Hashibira — Déchaînement : Respiration de la bête | 1,35× ATK ; ATK +20 % pour le lanceur, 2 actions. | 61.10 % | +11.10 pp | ±1.86 pp | trop fort |
| 129131 | Zenitsu Agatsuma | SSR | Base | Frappe inspirée de Respiration de la foudre | ignore 3 % de la DEF sur la prochaine attaque du lanceur | 50.70 % | +0.70 pp | ±0.59 pp | dans la marge |
| 129131 | Zenitsu Agatsuma | SSR | Secondaire | Respiration de la foudre | 1,0899999999999999× ATK, traverse les boucliers. | 54.20 % | +4.20 pp | ±1.25 pp | dans la marge |
| 129131 | Zenitsu Agatsuma | SSR | Tertiaire | Zenitsu Agatsuma : Respiration de la foudre — Percée mesurée | 1,224× ATK, ignore 12 % de la DEF. | 63.10 % | +13.10 pp | ±2.05 pp | trop fort |
| 129131 | Zenitsu Agatsuma | SSR | Ultime | Zenitsu Agatsuma — Déchaînement : Respiration de la foudre | 1,65× ATK, ignore 40 % de la DEF. | 65.20 % | +15.20 pp | ±2.04 pp | trop fort |
| 129133 | Kyoujurou Rengoku | SSR | Base | Frappe inspirée de Flamme éternelle | ATK +3 % pour le lanceur, pour sa prochaine action | 51.80 % | +1.80 pp | ±0.86 pp | dans la marge |
| 129133 | Kyoujurou Rengoku | SSR | Secondaire | Flamme éternelle | 0,4× ATK sur tous les ennemis ; ATK +7 % pour l'équipe, 1 action. | 48.30 % | -1.70 pp | ±2.47 pp | à renforcer |
| 129133 | Kyoujurou Rengoku | SSR | Tertiaire | Kyoujurou Rengoku : Flamme éternelle — Élan bref | 1,054× ATK ; ATK +8 % pour le lanceur, 1 action. | 53.20 % | +3.20 pp | ±1.44 pp | dans la marge |
| 129133 | Kyoujurou Rengoku | SSR | Ultime | Kyoujurou Rengoku — Déchaînement : Flamme éternelle | 1,35× ATK ; ATK +20 % pour le lanceur, 2 actions. | 57.10 % | +7.10 pp | ±1.56 pp | dans la marge |
| 129571 | Yuuta Okkotsu | SSR | Base | Coupe de katana avec Rika | rend 2 % des PV max au lanceur | 51.80 % | +1.80 pp | ±0.82 pp | dans la marge |
| 129571 | Yuuta Okkotsu | SSR | Secondaire | Rika | réanime un allié mort avec 15 % de ses PV max (une fois par combat). | 60.40 % | +10.40 pp | ±2.52 pp | trop fort |
| 129571 | Yuuta Okkotsu | SSR | Tertiaire | Yuuta Okkotsu : Coupe de katana avec Rika — Second souffle | 1,054× ATK ; soigne le lanceur de 5 % des PV max. | 50.80 % | +0.80 pp | ±1.11 pp | dans la marge |
| 129571 | Yuuta Okkotsu | SSR | Ultime | Yuuta Okkotsu — Déchaînement : Coupe de katana avec Rika | 0,4× ATK sur tous les ennemis ; soigne l'équipe de 30 % des PV max ; retire les malus de l'équipe. | 58.70 % | +8.70 pp | ±1.73 pp | trop fort |
| 129928 | Jin-U Seong | SSR | Base | Frappe inspirée de Armée d'ombres | ATK −3 % pour la cible, pour sa prochaine action | 52.00 % | +2.00 pp | ±0.86 pp | dans la marge |
| 129928 | Jin-U Seong | SSR | Secondaire | Armée d'ombres | 1,0779999999999998× ATK. | 53.70 % | +3.70 pp | ±1.28 pp | dans la marge |
| 129928 | Jin-U Seong | SSR | Tertiaire | Jin-U Seong : Armée d'ombres — Pression ciblée | 1,054× ATK ; ATK −8 % pour la cible, 1 action. | 53.60 % | +3.60 pp | ±1.46 pp | dans la marge |
| 129928 | Jin-U Seong | SSR | Ultime | Jin-U Seong — Déchaînement : Armée d'ombres | 1,3× ATK ; ATK −20 % pour la cible, 2 actions. | 59.10 % | +9.10 pp | ±1.72 pp | trop fort |
| 130050 | Giyuu Tomioka | SSR | Base | Frappe inspirée de Onzième forme | ATK −3 % pour la cible, pour sa prochaine action | 52.20 % | +2.20 pp | ±0.98 pp | dans la marge |
| 130050 | Giyuu Tomioka | SSR | Secondaire | Onzième forme | 1,0779999999999998× ATK. | 52.80 % | +2.80 pp | ±1.08 pp | dans la marge |
| 130050 | Giyuu Tomioka | SSR | Tertiaire | Giyuu Tomioka : Onzième forme — Pression ciblée | 1,054× ATK ; ATK −8 % pour la cible, 1 action. | 52.60 % | +2.60 pp | ±1.42 pp | dans la marge |
| 130050 | Giyuu Tomioka | SSR | Ultime | Giyuu Tomioka — Déchaînement : Onzième forme | 1,3× ATK ; ATK −20 % pour la cible, 2 actions. | 59.70 % | +9.70 pp | ±1.82 pp | trop fort |
| 130102 | Denji | UR | Base | Entaille de tronçonneuse | rend 2 % des dégâts infligés en PV | 50.20 % | +0.20 pp | ±0.28 pp | à renforcer |
| 130102 | Denji | UR | Secondaire | Démon tronçonneuse | 0,92× ATK ; poison : 3 % des PV max par action pour la cible, 2 actions. | 49.90 % | -0.10 pp | ±0.86 pp | à renforcer |
| 130102 | Denji | UR | Tertiaire | Denji : Entaille de tronçonneuse — Siphon léger | 1,1560000000000001× ATK, rend 15 % des dégâts en PV. | 57.00 % | +7.00 pp | ±1.57 pp | dans la marge |
| 130102 | Denji | UR | Ultime | Forme tronçonneuse | 1,35× ATK, rend 70 % des dégâts en PV ; ATK +20 % pour le lanceur, 2 actions. | 59.10 % | +9.10 pp | ±1.69 pp | trop fort |
| 130848 | Benimaru Shinmon | SSR | Base | Frappe inspirée de Feu orange | ATK −3 % pour la cible, pour sa prochaine action | 50.90 % | +0.90 pp | ±0.58 pp | dans la marge |
| 130848 | Benimaru Shinmon | SSR | Secondaire | Feu orange | 0,4× ATK sur tous les ennemis. | 48.60 % | -1.40 pp | ±2.59 pp | dans la marge |
| 130848 | Benimaru Shinmon | SSR | Tertiaire | Benimaru Shinmon : Feu orange — Pression ciblée | 1,054× ATK ; ATK −8 % pour la cible, 1 action. | 52.30 % | +2.30 pp | ±1.00 pp | dans la marge |
| 130848 | Benimaru Shinmon | SSR | Ultime | Benimaru Shinmon — Déchaînement : Feu orange | 1,3× ATK ; ATK −20 % pour la cible, 2 actions. | 49.70 % | -0.30 pp | ±0.34 pp | à renforcer |
| 133676 | Marin Kitagawa | UR | Base | Frappe inspirée de Cosplay parfait | esquive +3 points pour le lanceur, jusqu'à sa prochaine action | 53.30 % | +3.30 pp | ±2.36 pp | dans la marge |
| 133676 | Marin Kitagawa | UR | Secondaire | Cosplay parfait | 0,68× ATK ; esquive +18 % pour le lanceur, 1 action. | 47.80 % | -2.20 pp | ±2.70 pp | à renforcer |
| 133676 | Marin Kitagawa | UR | Tertiaire | Marin Kitagawa : Cosplay parfait — Pas de côté | 1,054× ATK ; esquive +6 % pour le lanceur, 1 action. | 56.30 % | +6.30 pp | ±2.43 pp | dans la marge |
| 133676 | Marin Kitagawa | UR | Ultime | Marin Kitagawa — Déchaînement : Cosplay parfait | 1,25× ATK ; esquive +30 % pour le lanceur, 2 actions. | 51.80 % | +1.80 pp | ±0.86 pp | dans la marge |
| 133699 | Suguru Getou | SSR | Base | Frappe de fléau | poison : 0,5 % des PV max de la cible à sa prochaine action | 50.50 % | +0.50 pp | ±0.44 pp | à renforcer |
| 133699 | Suguru Getou | SSR | Secondaire | Manipulation de malédiction | 0,4× ATK sur tous les ennemis ; poison : 3 % des PV max par action pour tous les ennemis, 2 actions. | 56.10 % | +6.10 pp | ±2.87 pp | dans la marge |
| 133699 | Suguru Getou | SSR | Tertiaire | Suguru Getou : Frappe de fléau — Marque persistante | 1,054× ATK ; poison : 2 % des PV max par action pour la cible, 2 actions. | 52.50 % | +2.50 pp | ±1.00 pp | dans la marge |
| 133699 | Suguru Getou | SSR | Ultime | Suguru Getou — Déchaînement : Frappe de fléau | 1,15× ATK ; poison : 8 % des PV max par action pour la cible, 3 actions. | 52.00 % | +2.00 pp | ±0.86 pp | dans la marge |
| 133700 | Nobara Kugisaki | SSR | Base | Clou résonnant | ATK −3 % pour la cible, pour sa prochaine action | 51.60 % | +1.60 pp | ±0.91 pp | dans la marge |
| 133700 | Nobara Kugisaki | SSR | Secondaire | Résonance | 0,96× ATK ; poison : 3 % des PV max par action pour la cible, 2 actions ; ATK −9 % pour la cible, 1 action. | 53.00 % | +3.00 pp | ±1.36 pp | dans la marge |
| 133700 | Nobara Kugisaki | SSR | Tertiaire | Nobara Kugisaki : Clou résonnant — Pression ciblée | 1,054× ATK ; ATK −8 % pour la cible, 1 action. | 52.80 % | +2.80 pp | ±1.50 pp | dans la marge |
| 133700 | Nobara Kugisaki | SSR | Ultime | Nobara Kugisaki — Déchaînement : Clou résonnant | 1,3× ATK ; ATK −20 % pour la cible, 2 actions. | 57.80 % | +7.80 pp | ±1.69 pp | trop fort |
| 133701 | Sukuna | SSR | Base | Démantèlement léger | ignore 3 % de la DEF sur la prochaine attaque du lanceur | 50.80 % | +0.80 pp | ±0.62 pp | dans la marge |
| 133701 | Sukuna | SSR | Secondaire | Démantèlement | 0,4× ATK sur tous les ennemis, rend 18 % des dégâts en PV. | 38.70 % | -11.30 pp | ±2.74 pp | à renforcer |
| 133701 | Sukuna | SSR | Tertiaire | Sukuna : Démantèlement léger — Percée mesurée | 1,224× ATK, ignore 12 % de la DEF. | 60.10 % | +10.10 pp | ±1.85 pp | trop fort |
| 133701 | Sukuna | SSR | Ultime | Extension du Sanctuaire | 0,42× ATK sur tous les ennemis ; poison : 6 % des PV max par action pour tous les ennemis, 2 actions. | 48.45 % | -1.55 pp | ±1.78 pp | à renforcer |
| 133704 | Kento Nanami | SSR | Base | Frappe du ratio | critique +3 points pour le lanceur, pour sa prochaine action | 51.90 % | +1.90 pp | ±0.88 pp | dans la marge |
| 133704 | Kento Nanami | SSR | Secondaire | Ratio 7:3 | 0,96× ATK ; DEF −15 % pour la cible, 1 action. | 51.90 % | +1.90 pp | ±1.28 pp | dans la marge |
| 133704 | Kento Nanami | SSR | Tertiaire | Kento Nanami : Frappe du ratio — Visée précise | 1,054× ATK ; critique +6 points pour le lanceur, 1 action. | 51.70 % | +1.70 pp | ±1.31 pp | dans la marge |
| 133704 | Kento Nanami | SSR | Ultime | Kento Nanami — Déchaînement : Frappe du ratio | 1,55× ATK ; critique +35 points pour le lanceur, 2 actions. | 66.90 % | +16.90 pp | ±2.08 pp | trop fort |
| 134167 | Maki Zenin | SSR | Base | Balayage à la lance | ignore 3 % de la DEF sur la prochaine attaque du lanceur | 52.20 % | +2.20 pp | ±0.98 pp | dans la marge |
| 134167 | Maki Zenin | SSR | Secondaire | Lance du rêve | 0,8× ATK ; esquive +18 % pour le lanceur, 1 action. | 43.60 % | -6.40 pp | ±2.07 pp | à renforcer |
| 134167 | Maki Zenin | SSR | Tertiaire | Maki Zenin : Balayage à la lance — Percée mesurée | 1,224× ATK, ignore 12 % de la DEF. | 57.50 % | +7.50 pp | ±1.80 pp | dans la marge |
| 134167 | Maki Zenin | SSR | Ultime | Maki Zenin — Déchaînement : Balayage à la lance | 1,65× ATK, ignore 40 % de la DEF. | 69.80 % | +19.80 pp | ±2.15 pp | trop fort |
| 136070 | Shinobu Kochou | SSR | Base | Frappe inspirée de Papillon vénéneux | poison : 0,5 % des PV max de la cible à sa prochaine action | 50.80 % | +0.80 pp | ±0.60 pp | dans la marge |
| 136070 | Shinobu Kochou | SSR | Secondaire | Papillon vénéneux | 0,96× ATK ; poison : 3 % des PV max par action pour la cible, 2 actions. | 51.10 % | +1.10 pp | ±1.01 pp | dans la marge |
| 136070 | Shinobu Kochou | SSR | Tertiaire | Shinobu Kochou : Papillon vénéneux — Marque persistante | 1,054× ATK ; poison : 2 % des PV max par action pour la cible, 2 actions. | 51.60 % | +1.60 pp | ±1.10 pp | dans la marge |
| 136070 | Shinobu Kochou | SSR | Ultime | Shinobu Kochou — Déchaînement : Papillon vénéneux | 1,15× ATK ; poison : 8 % des PV max par action pour la cible, 3 actions. | 55.30 % | +5.30 pp | ±1.36 pp | dans la marge |
| 136071 | Tengen Uzui | SSR | Base | Frappe inspirée de Éclat sonore | ATK −3 % pour la cible, pour sa prochaine action | 50.30 % | +0.30 pp | ±0.34 pp | à renforcer |
| 136071 | Tengen Uzui | SSR | Secondaire | Éclat sonore | 0,4× ATK sur tous les ennemis. | 43.30 % | -6.70 pp | ±2.73 pp | à renforcer |
| 136071 | Tengen Uzui | SSR | Tertiaire | Tengen Uzui : Éclat sonore — Pression ciblée | 1,054× ATK ; ATK −8 % pour la cible, 1 action. | 52.40 % | +2.40 pp | ±1.09 pp | dans la marge |
| 136071 | Tengen Uzui | SSR | Ultime | Tengen Uzui — Déchaînement : Éclat sonore | 1,3× ATK ; ATK −20 % pour la cible, 2 actions. | 52.20 % | +2.20 pp | ±0.94 pp | dans la marge |
| 136072 | Mitsuri Kanroji | SSR | Base | Frappe inspirée de Respiration de l'amour | rend 2 % des PV max au lanceur | 50.90 % | +0.90 pp | ±0.58 pp | dans la marge |
| 136072 | Mitsuri Kanroji | SSR | Secondaire | Respiration de l'amour | 0,4× ATK sur tous les ennemis ; soigne l'équipe de 9 % des PV max ; retire les malus de l'équipe. | 51.20 % | +1.20 pp | ±2.60 pp | dans la marge |
| 136072 | Mitsuri Kanroji | SSR | Tertiaire | Mitsuri Kanroji : Respiration de l'amour — Second souffle | 1,054× ATK ; soigne le lanceur de 5 % des PV max. | 52.70 % | +2.70 pp | ±0.99 pp | dans la marge |
| 136072 | Mitsuri Kanroji | SSR | Ultime | Mitsuri Kanroji — Déchaînement : Respiration de l'amour | 0,4× ATK sur tous les ennemis ; soigne l'équipe de 30 % des PV max ; retire les malus de l'équipe. | 50.30 % | +0.30 pp | ±0.34 pp | à renforcer |
| 136837 | Cid Kagenou | SSR | Base | Frappe inspirée de Éclat d'ombre | ignore 3 % de la DEF sur la prochaine attaque du lanceur | 50.10 % | +0.10 pp | ±0.20 pp | à renforcer |
| 136837 | Cid Kagenou | SSR | Secondaire | Éclat d'ombre | 1,0899999999999999× ATK, traverse les boucliers. | 51.20 % | +1.20 pp | ±0.91 pp | dans la marge |
| 136837 | Cid Kagenou | SSR | Tertiaire | Cid Kagenou : Éclat d'ombre — Percée mesurée | 1,224× ATK, ignore 12 % de la DEF. | 56.80 % | +6.80 pp | ±1.60 pp | dans la marge |
| 136837 | Cid Kagenou | SSR | Ultime | Cid Kagenou — Déchaînement : Éclat d'ombre | 1,65× ATK, ignore 40 % de la DEF. | 50.80 % | +0.80 pp | ±0.55 pp | dans la marge |
| 137079 | Power | UR | Base | Frappe inspirée de Sang de Power | rend 2 % des dégâts infligés en PV | 50.30 % | +0.30 pp | ±0.34 pp | à renforcer |
| 137079 | Power | UR | Secondaire | Sang de Power | 1,012× ATK, rend 24 % des dégâts en PV. | 50.80 % | +0.80 pp | ±0.55 pp | dans la marge |
| 137079 | Power | UR | Tertiaire | Power : Sang de Power — Siphon léger | 1,1560000000000001× ATK, rend 15 % des dégâts en PV. | 55.50 % | +5.50 pp | ±1.37 pp | dans la marge |
| 137079 | Power | UR | Ultime | Power — Déchaînement : Sang de Power | 1,55× ATK, rend 65 % des dégâts en PV. | 58.20 % | +8.20 pp | ±1.62 pp | trop fort |
| 137080 | Makima | UR | Base | Tir contrôlé | ATK −3 % pour la cible, pour sa prochaine action | 51.10 % | +1.10 pp | ±0.64 pp | dans la marge |
| 137080 | Makima | UR | Secondaire | Contrôle total | 1,1× ATK ; silence sur la cible (sort de base seulement), 1 action; sans effet sur les boss. | 42.20 % | -7.80 pp | ±2.77 pp | à renforcer |
| 137080 | Makima | UR | Tertiaire | Makima : Tir contrôlé — Pression ciblée | 1,054× ATK ; ATK −8 % pour la cible, 1 action. | 52.50 % | +2.50 pp | ±1.21 pp | dans la marge |
| 137080 | Makima | UR | Ultime | Contrôle absolu | 1,2× ATK ; silence sur la cible (sort de base seulement), 2 actions; sans effet sur les boss ; ATK −20 % pour la cible, 2 actions. | 53.60 % | +3.60 pp | ±1.49 pp | dans la marge |
| 137081 | Aki Hayakawa | SSR | Base | Frappe inspirée de Démon du renard | ATK −3 % pour la cible, pour sa prochaine action | 51.30 % | +1.30 pp | ±0.75 pp | dans la marge |
| 137081 | Aki Hayakawa | SSR | Secondaire | Démon du renard | 1,06× ATK ; silence sur la cible (sort de base seulement), 1 action; sans effet sur les boss. | 47.40 % | -2.60 pp | ±2.95 pp | à renforcer |
| 137081 | Aki Hayakawa | SSR | Tertiaire | Aki Hayakawa : Démon du renard — Pression ciblée | 1,054× ATK ; ATK −8 % pour la cible, 1 action. | 54.10 % | +4.10 pp | ±1.41 pp | dans la marge |
| 137081 | Aki Hayakawa | SSR | Ultime | Aki Hayakawa — Déchaînement : Démon du renard | 1,3× ATK ; ATK −20 % pour la cible, 2 actions. | 56.80 % | +6.80 pp | ±1.50 pp | dans la marge |
| 137975 | Aoi Toudou | SSR | Base | Coup suivi d'une feinte | ATK +3 % pour le lanceur, pour sa prochaine action | 51.00 % | +1.00 pp | ±0.67 pp | dans la marge |
| 137975 | Aoi Toudou | SSR | Secondaire | Boogie Woogie | 1,012× ATK ; critique +8 points pour l'équipe, 1 action. | 53.50 % | +3.50 pp | ±1.34 pp | dans la marge |
| 137975 | Aoi Toudou | SSR | Tertiaire | Aoi Toudou : Coup suivi d'une feinte — Élan bref | 1,054× ATK ; ATK +8 % pour le lanceur, 1 action. | 51.80 % | +1.80 pp | ±1.13 pp | dans la marge |
| 137975 | Aoi Toudou | SSR | Ultime | Aoi Toudou — Déchaînement : Coup suivi d'une feinte | 1,35× ATK ; ATK +20 % pour le lanceur, 2 actions. | 51.50 % | +1.50 pp | ±0.75 pp | dans la marge |
| 138100 | Anya Forger | SSR | Base | Frappe inspirée de Télépathie d'Anya | esquive +3 points pour le lanceur, jusqu'à sa prochaine action | 51.20 % | +1.20 pp | ±1.20 pp | dans la marge |
| 138100 | Anya Forger | SSR | Secondaire | Télépathie d'Anya | 0,4× ATK sur tous les ennemis ; esquive +5 % pour l'équipe, 1 action. | 44.30 % | -5.70 pp | ±2.98 pp | à renforcer |
| 138100 | Anya Forger | SSR | Tertiaire | Anya Forger : Télépathie d'Anya — Pas de côté | 1,054× ATK ; esquive +6 % pour le lanceur, 1 action. | 52.70 % | +2.70 pp | ±1.14 pp | dans la marge |
| 138100 | Anya Forger | SSR | Ultime | Anya Forger — Déchaînement : Télépathie d'Anya | 1,25× ATK ; esquive +30 % pour le lanceur, 2 actions. | 61.10 % | +11.10 pp | ±1.89 pp | trop fort |
| 138101 | Loid Forger | SSR | Base | Frappe inspirée de Crépuscule | DEF −3 % pour la cible, pour sa prochaine action | 50.80 % | +0.80 pp | ±0.55 pp | dans la marge |
| 138101 | Loid Forger | SSR | Secondaire | Crépuscule | 0,85× ATK ; DEF −15 % pour la cible, 1 action. | 47.60 % | -2.40 pp | ±1.02 pp | à renforcer |
| 138101 | Loid Forger | SSR | Tertiaire | Loid Forger : Crépuscule — Brèche tactique | 1,054× ATK ; DEF −8 % pour la cible, 1 action. | 53.90 % | +3.90 pp | ±1.33 pp | dans la marge |
| 138101 | Loid Forger | SSR | Ultime | Loid Forger — Déchaînement : Crépuscule | 1,45× ATK ; DEF −20 % pour la cible, 2 actions. | 56.00 % | +6.00 pp | ±1.45 pp | dans la marge |
| 138102 | Yor Forger | SSR | Base | Frappe inspirée de Rose épineuse | critique +3 points pour le lanceur, pour sa prochaine action | 50.70 % | +0.70 pp | ±0.52 pp | dans la marge |
| 138102 | Yor Forger | SSR | Secondaire | Rose épineuse | 1,237× ATK. | 63.30 % | +13.30 pp | ±2.00 pp | trop fort |
| 138102 | Yor Forger | SSR | Tertiaire | Yor Forger : Rose épineuse — Visée précise | 1,054× ATK ; critique +6 points pour le lanceur, 1 action. | 53.40 % | +3.40 pp | ±1.20 pp | dans la marge |
| 138102 | Yor Forger | SSR | Ultime | Yor Forger — Déchaînement : Rose épineuse | 1,55× ATK ; critique +35 points pour le lanceur, 2 actions. | 61.10 % | +11.10 pp | ±1.82 pp | trop fort |
| 141060 | Shinei Nouzen | SSR | Base | Frappe inspirée de Faucheur | ignore 3 % de la DEF sur la prochaine attaque du lanceur | 50.70 % | +0.70 pp | ±0.59 pp | dans la marge |
| 141060 | Shinei Nouzen | SSR | Secondaire | Faucheur | 0,94× ATK, ignore 15 % de la DEF. | 50.40 % | +0.40 pp | ±0.48 pp | à renforcer |
| 141060 | Shinei Nouzen | SSR | Tertiaire | Shinei Nouzen : Faucheur — Percée mesurée | 1,224× ATK, ignore 12 % de la DEF. | 59.10 % | +9.10 pp | ±1.91 pp | trop fort |
| 141060 | Shinei Nouzen | SSR | Ultime | Shinei Nouzen — Déchaînement : Faucheur | 1,65× ATK, ignore 40 % de la DEF. | 53.90 % | +3.90 pp | ±1.21 pp | dans la marge |
| 141061 | Vladilena Milizé | SSR | Base | Frappe inspirée de Reine écarlate | critique +3 points pour le lanceur, pour sa prochaine action | 50.50 % | +0.50 pp | ±0.71 pp | dans la marge |
| 141061 | Vladilena Milizé | SSR | Secondaire | Reine écarlate | 0,56× ATK ; critique +8 points pour l'équipe, 1 action. | 38.70 % | -11.30 pp | ±2.45 pp | à renforcer |
| 141061 | Vladilena Milizé | SSR | Tertiaire | Vladilena Milizé : Reine écarlate — Visée précise | 1,054× ATK ; critique +6 points pour le lanceur, 1 action. | 52.40 % | +2.40 pp | ±1.25 pp | dans la marge |
| 141061 | Vladilena Milizé | SSR | Ultime | Vladilena Milizé — Déchaînement : Reine écarlate | 1,55× ATK ; critique +35 points pour le lanceur, 2 actions. | 58.40 % | +8.40 pp | ±1.69 pp | trop fort |
| 145341 | Manjirou Sano | SSR | Base | Frappe inspirée de Mikey invincible | ATK +3 % pour le lanceur, pour sa prochaine action | 51.30 % | +1.30 pp | ±0.70 pp | dans la marge |
| 145341 | Manjirou Sano | SSR | Secondaire | Mikey invincible | 0,92× ATK ; ATK +12 % pour le lanceur, 1 action. | 48.60 % | -1.40 pp | ±1.38 pp | à renforcer |
| 145341 | Manjirou Sano | SSR | Tertiaire | Manjirou Sano : Mikey invincible — Élan bref | 1,054× ATK ; ATK +8 % pour le lanceur, 1 action. | 53.60 % | +3.60 pp | ±1.23 pp | dans la marge |
| 145341 | Manjirou Sano | SSR | Ultime | Manjirou Sano — Déchaînement : Mikey invincible | 1,35× ATK ; ATK +20 % pour le lanceur, 2 actions. | 54.40 % | +4.40 pp | ±1.24 pp | dans la marge |
| 145344 | Chifuyu Matsuno | SSR | Base | Frappe inspirée de Cœur loyal | DEF +3 % pour le lanceur, pour sa prochaine action | 51.30 % | +1.30 pp | ±0.70 pp | dans la marge |
| 145344 | Chifuyu Matsuno | SSR | Secondaire | Cœur loyal | 0,4× ATK sur tous les ennemis ; DEF +8 % pour l'équipe, 2 actions. | 52.70 % | +2.70 pp | ±2.60 pp | dans la marge |
| 145344 | Chifuyu Matsuno | SSR | Tertiaire | Chifuyu Matsuno : Cœur loyal — Garde resserrée | 1,054× ATK ; DEF +8 % pour le lanceur, 1 action. | 54.10 % | +4.10 pp | ±1.20 pp | dans la marge |
| 145344 | Chifuyu Matsuno | SSR | Ultime | Chifuyu Matsuno — Déchaînement : Cœur loyal | 0,45× ATK sur tous les ennemis ; DEF +20 % pour l'équipe, 2 actions. | 49.70 % | -0.30 pp | ±0.44 pp | à renforcer |
| 145345 | Ken Ryuuguji | SSR | Base | Frappe inspirée de Dragon de Toman | ignore 3 % de la DEF sur la prochaine attaque du lanceur | 50.10 % | +0.10 pp | ±0.20 pp | à renforcer |
| 145345 | Ken Ryuuguji | SSR | Secondaire | Dragon de Toman | 0,94× ATK, ignore 15 % de la DEF. | 50.50 % | +0.50 pp | ±0.44 pp | à renforcer |
| 145345 | Ken Ryuuguji | SSR | Tertiaire | Ken Ryuuguji : Dragon de Toman — Percée mesurée | 1,224× ATK, ignore 12 % de la DEF. | 57.10 % | +7.10 pp | ±1.68 pp | dans la marge |
| 145345 | Ken Ryuuguji | SSR | Ultime | Ken Ryuuguji — Déchaînement : Dragon de Toman | 1,65× ATK, ignore 40 % de la DEF. | 50.90 % | +0.90 pp | ±0.58 pp | dans la marge |
| 148740 | Reze | SSR | Base | Frappe inspirée de Bombe d'amour | ATK −3 % pour la cible, pour sa prochaine action | 51.70 % | +1.70 pp | ±0.84 pp | dans la marge |
| 148740 | Reze | SSR | Secondaire | Bombe d'amour | 0,4× ATK sur tous les ennemis. | 42.90 % | -7.10 pp | ±2.74 pp | à renforcer |
| 148740 | Reze | SSR | Tertiaire | Reze : Bombe d'amour — Pression ciblée | 1,054× ATK ; ATK −8 % pour la cible, 1 action. | 53.20 % | +3.20 pp | ±1.18 pp | dans la marge |
| 148740 | Reze | SSR | Ultime | Reze — Déchaînement : Bombe d'amour | 1,3× ATK ; ATK −20 % pour la cible, 2 actions. | 53.20 % | +3.20 pp | ±1.07 pp | dans la marge |
| 154224 | Mami Nanami | SSR | Base | Frappe inspirée de Petite amie en location | esquive +3 points pour le lanceur, jusqu'à sa prochaine action | 52.25 % | +2.25 pp | ±2.20 pp | dans la marge |
| 154224 | Mami Nanami | SSR | Secondaire | Petite amie en location | 0,4× ATK sur tous les ennemis ; esquive +5 % pour l'équipe, 1 action. | 45.30 % | -4.70 pp | ±3.14 pp | à renforcer |
| 154224 | Mami Nanami | SSR | Tertiaire | Mami Nanami : Petite amie en location — Pas de côté | 1,054× ATK ; esquive +6 % pour le lanceur, 1 action. | 50.60 % | +0.60 pp | ±1.88 pp | dans la marge |
| 154224 | Mami Nanami | SSR | Ultime | Mami Nanami — Déchaînement : Petite amie en location | 1,25× ATK ; esquive +30 % pour le lanceur, 2 actions. | 59.60 % | +9.60 pp | ±2.13 pp | trop fort |
| 157115 | Toge Inumaki | SSR | Base | « Reculez » | ATK −3 % pour la cible, pour sa prochaine action | 51.80 % | +1.80 pp | ±0.91 pp | dans la marge |
| 157115 | Toge Inumaki | SSR | Secondaire | Mot-clé : « Arrêtez-vous » | 0,4× ATK sur tous les ennemis ; silence sur tous les ennemis (sort de base seulement), 1 action; sans effet sur les boss. | 46.30 % | -3.70 pp | ±2.63 pp | à renforcer |
| 157115 | Toge Inumaki | SSR | Tertiaire | Toge Inumaki : « Reculez » — Pression ciblée | 1,054× ATK ; ATK −8 % pour la cible, 1 action. | 52.60 % | +2.60 pp | ±1.28 pp | dans la marge |
| 157115 | Toge Inumaki | SSR | Ultime | Toge Inumaki — Déchaînement : « Reculez » | 1,3× ATK ; ATK −20 % pour la cible, 2 actions. | 56.30 % | +6.30 pp | ±1.48 pp | dans la marge |
| 162213 | Meguru Bachira | SSR | Base | Frappe inspirée de Dribble démoniaque | ATK +3 % pour le lanceur, pour sa prochaine action | 50.00 % | +0.00 pp | ±0.00 pp | à renforcer |
| 162213 | Meguru Bachira | SSR | Secondaire | Dribble démoniaque | 0,92× ATK ; ATK +12 % pour le lanceur, 1 action. | 47.70 % | -2.30 pp | ±1.04 pp | à renforcer |
| 162213 | Meguru Bachira | SSR | Tertiaire | Meguru Bachira : Dribble démoniaque — Élan bref | 1,054× ATK ; ATK +8 % pour le lanceur, 1 action. | 51.40 % | +1.40 pp | ±0.78 pp | dans la marge |
| 162213 | Meguru Bachira | SSR | Ultime | Meguru Bachira — Déchaînement : Dribble démoniaque | 1,35× ATK ; ATK +20 % pour le lanceur, 2 actions. | 50.00 % | +0.00 pp | ±0.00 pp | à renforcer |
| 162722 | Touji Fushiguro | SSR | Base | Pointe de lance inversée | ignore 3 % de la DEF sur la prochaine attaque du lanceur | 50.10 % | +0.10 pp | ±0.44 pp | à renforcer |
| 162722 | Touji Fushiguro | SSR | Secondaire | Lance inversée | 1,234× ATK, traverse les boucliers ; critique +15 points pour le lanceur, 1 action. | 55.00 % | +5.00 pp | ±1.53 pp | dans la marge |
| 162722 | Touji Fushiguro | SSR | Tertiaire | Touji Fushiguro : Pointe de lance inversée — Percée mesurée | 1,224× ATK, ignore 12 % de la DEF. | 54.90 % | +4.90 pp | ±1.60 pp | dans la marge |
| 162722 | Touji Fushiguro | SSR | Ultime | Touji Fushiguro — Déchaînement : Pointe de lance inversée | 1,65× ATK, ignore 40 % de la DEF. | 53.90 % | +3.90 pp | ±1.21 pp | dans la marge |
| 168774 | Nazuna Nanakusa | SSR | Base | Frappe inspirée de Morsure de nuit | rend 2 % des dégâts infligés en PV | 50.20 % | +0.20 pp | ±0.28 pp | à renforcer |
| 168774 | Nazuna Nanakusa | SSR | Secondaire | Morsure de nuit | 1,024× ATK, rend 24 % des dégâts en PV. | 52.70 % | +2.70 pp | ±1.10 pp | dans la marge |
| 168774 | Nazuna Nanakusa | SSR | Tertiaire | Nazuna Nanakusa : Morsure de nuit — Siphon léger | 1,1560000000000001× ATK, rend 15 % des dégâts en PV. | 55.00 % | +5.00 pp | ±1.53 pp | dans la marge |
| 168774 | Nazuna Nanakusa | SSR | Ultime | Nazuna Nanakusa — Déchaînement : Morsure de nuit | 1,55× ATK, rend 65 % des dégâts en PV. | 50.60 % | +0.60 pp | ±0.48 pp | dans la marge |
| 172759 | Ai Hoshino | SSR | Base | Frappe inspirée de Concert d'idole | ATK +3 % pour le lanceur, pour sa prochaine action | 50.10 % | +0.10 pp | ±0.20 pp | à renforcer |
| 172759 | Ai Hoshino | SSR | Secondaire | Concert d'idole | 0,4× ATK sur tous les ennemis ; ATK +7 % pour l'équipe, 1 action. | 54.70 % | +4.70 pp | ±2.46 pp | dans la marge |
| 172759 | Ai Hoshino | SSR | Tertiaire | Ai Hoshino : Concert d'idole — Élan bref | 1,054× ATK ; ATK +8 % pour le lanceur, 1 action. | 51.40 % | +1.40 pp | ±0.87 pp | dans la marge |
| 172759 | Ai Hoshino | SSR | Ultime | Ai Hoshino — Déchaînement : Concert d'idole | 1,35× ATK ; ATK +20 % pour le lanceur, 2 actions. | 49.90 % | -0.10 pp | ±0.20 pp | à renforcer |
| 174873 | Kurena Kukumila | SSR | Base | Frappe inspirée de Pilote d'élite | esquive +3 points pour le lanceur, jusqu'à sa prochaine action | 52.30 % | +2.30 pp | ±1.54 pp | dans la marge |
| 174873 | Kurena Kukumila | SSR | Secondaire | Pilote d'élite | 0,66× ATK ; esquive +18 % pour le lanceur, 1 action. | 38.60 % | -11.40 pp | ±2.32 pp | à renforcer |
| 174873 | Kurena Kukumila | SSR | Tertiaire | Kurena Kukumila : Pilote d'élite — Pas de côté | 1,054× ATK ; esquive +6 % pour le lanceur, 1 action. | 51.60 % | +1.60 pp | ±1.66 pp | dans la marge |
| 174873 | Kurena Kukumila | SSR | Ultime | Kurena Kukumila — Déchaînement : Pilote d'élite | 1,25× ATK ; esquive +30 % pour le lanceur, 2 actions. | 58.20 % | +8.20 pp | ±1.67 pp | trop fort |
| 176754 | Frieren | UR | Base | Zoltraak | ignore 3 % de la DEF sur la prochaine attaque du lanceur | 50.40 % | +0.40 pp | ±0.48 pp | à renforcer |
| 176754 | Frieren | UR | Secondaire | Sort de résurrection | réanime un allié mort avec 15 % de ses PV max (une fois par combat). | 37.50 % | -12.50 pp | ±2.42 pp | à renforcer |
| 176754 | Frieren | UR | Tertiaire | Frieren : Zoltraak — Percée mesurée | 1,224× ATK, ignore 12 % de la DEF. | 59.50 % | +9.50 pp | ±2.21 pp | trop fort |
| 176754 | Frieren | UR | Ultime | Zoltraak — Magie de destruction | 1× ATK sur tous les ennemis, traverse les boucliers. | 59.50 % | +9.50 pp | ±1.79 pp | trop fort |
| 183965 | Fern | SSR | Base | Frappe inspirée de Zoltraak | ignore 3 % de la DEF sur la prochaine attaque du lanceur | 50.80 % | +0.80 pp | ±0.55 pp | dans la marge |
| 183965 | Fern | SSR | Secondaire | Zoltraak | 0,94× ATK, ignore 15 % de la DEF. | 50.60 % | +0.60 pp | ±0.55 pp | dans la marge |
| 183965 | Fern | SSR | Tertiaire | Fern : Zoltraak — Percée mesurée | 1,224× ATK, ignore 12 % de la DEF. | 60.40 % | +10.40 pp | ±1.97 pp | trop fort |
| 183965 | Fern | SSR | Ultime | Fern — Déchaînement : Zoltraak | 1,65× ATK, ignore 40 % de la DEF. | 55.10 % | +5.10 pp | ±1.33 pp | dans la marge |
| 188783 | Kana Arima | SSR | Base | Frappe inspirée de Regard glacial | ATK −3 % pour la cible, pour sa prochaine action | 53.10 % | +3.10 pp | ±1.16 pp | dans la marge |
| 188783 | Kana Arima | SSR | Secondaire | Regard glacial | 0,98× ATK ; ATK −12 % pour la cible, 1 action. | 50.60 % | +0.60 pp | ±1.64 pp | dans la marge |
| 188783 | Kana Arima | SSR | Tertiaire | Kana Arima : Regard glacial — Pression ciblée | 1,054× ATK ; ATK −8 % pour la cible, 1 action. | 52.90 % | +2.90 pp | ±1.54 pp | dans la marge |
| 188783 | Kana Arima | SSR | Ultime | Kana Arima — Déchaînement : Regard glacial | 1,3× ATK ; ATK −20 % pour la cible, 2 actions. | 58.50 % | +8.50 pp | ±1.91 pp | trop fort |
| 218648 | Hina Chouno | SSR | Base | Frappe inspirée de Élan de badminton | ATK +3 % pour le lanceur, pour sa prochaine action | 50.20 % | +0.20 pp | ±0.39 pp | à renforcer |
| 218648 | Hina Chouno | SSR | Secondaire | Élan de badminton | 0,4× ATK sur tous les ennemis ; ATK +7 % pour l'équipe, 1 action. | 56.40 % | +6.40 pp | ±2.67 pp | dans la marge |
| 218648 | Hina Chouno | SSR | Tertiaire | Hina Chouno : Élan de badminton — Élan bref | 1,054× ATK ; ATK +8 % pour le lanceur, 1 action. | 51.60 % | +1.60 pp | ±0.77 pp | dans la marge |
| 218648 | Hina Chouno | SSR | Ultime | Hina Chouno — Déchaînement : Élan de badminton | 1,35× ATK ; ATK +20 % pour le lanceur, 2 actions. | 50.00 % | +0.00 pp | ±0.00 pp | à renforcer |
| 222594 | Momo Ayase | SSR | Base | Frappe inspirée de Pouvoir de Momo | ATK −3 % pour la cible, pour sa prochaine action | 50.50 % | +0.50 pp | ±0.52 pp | dans la marge |
| 222594 | Momo Ayase | SSR | Secondaire | Pouvoir de Momo | 0,4× ATK sur tous les ennemis. | 43.90 % | -6.10 pp | ±2.66 pp | à renforcer |
| 222594 | Momo Ayase | SSR | Tertiaire | Momo Ayase : Pouvoir de Momo — Pression ciblée | 1,054× ATK ; ATK −8 % pour la cible, 1 action. | 53.30 % | +3.30 pp | ±1.28 pp | dans la marge |
| 222594 | Momo Ayase | SSR | Ultime | Momo Ayase — Déchaînement : Pouvoir de Momo | 1,3× ATK ; ATK −20 % pour la cible, 2 actions. | 51.00 % | +1.00 pp | ±0.61 pp | dans la marge |
| 257562 | Hitori Gotou | SSR | Base | Frappe inspirée de Solo de guitare | ATK +3 % pour le lanceur, pour sa prochaine action | 51.60 % | +1.60 pp | ±1.07 pp | dans la marge |
| 257562 | Hitori Gotou | SSR | Secondaire | Solo de guitare | 0,4× ATK sur tous les ennemis ; ATK +7 % pour l'équipe, 1 action. | 45.90 % | -4.10 pp | ±2.92 pp | à renforcer |
| 257562 | Hitori Gotou | SSR | Tertiaire | Hitori Gotou : Solo de guitare — Élan bref | 1,054× ATK ; ATK +8 % pour le lanceur, 1 action. | 53.10 % | +3.10 pp | ±1.51 pp | dans la marge |
| 257562 | Hitori Gotou | SSR | Ultime | Hitori Gotou — Déchaînement : Solo de guitare | 1,35× ATK ; ATK +20 % pour le lanceur, 2 actions. | 59.20 % | +9.20 pp | ±2.01 pp | trop fort |
| 260329 | Chisato Nishikigi | SSR | Base | Frappe inspirée de Reflexes de Lycoris | esquive +3 points pour le lanceur, jusqu'à sa prochaine action | 50.50 % | +0.50 pp | ±2.26 pp | dans la marge |
| 260329 | Chisato Nishikigi | SSR | Secondaire | Reflexes de Lycoris | 0,66× ATK ; esquive +18 % pour le lanceur, 1 action. | 51.70 % | +1.70 pp | ±2.99 pp | dans la marge |
| 260329 | Chisato Nishikigi | SSR | Tertiaire | Chisato Nishikigi : Reflexes de Lycoris — Pas de côté | 1,054× ATK ; esquive +6 % pour le lanceur, 1 action. | 53.40 % | +3.40 pp | ±2.35 pp | dans la marge |
| 260329 | Chisato Nishikigi | SSR | Ultime | Chisato Nishikigi — Déchaînement : Reflexes de Lycoris | 1,25× ATK ; esquive +30 % pour le lanceur, 2 actions. | 51.50 % | +1.50 pp | ±0.93 pp | dans la marge |
| 261674 | Nijika Ijichi | SSR | Base | Frappe inspirée de Rythme de batterie | critique +3 points pour le lanceur, pour sa prochaine action | 50.10 % | +0.10 pp | ±0.20 pp | à renforcer |
| 261674 | Nijika Ijichi | SSR | Secondaire | Rythme de batterie | 0,56× ATK ; critique +8 points pour l'équipe, 1 action. | 38.50 % | -11.50 pp | ±2.19 pp | à renforcer |
| 261674 | Nijika Ijichi | SSR | Tertiaire | Nijika Ijichi : Rythme de batterie — Visée précise | 1,054× ATK ; critique +6 points pour le lanceur, 1 action. | 50.90 % | +0.90 pp | ±0.76 pp | dans la marge |
| 261674 | Nijika Ijichi | SSR | Ultime | Nijika Ijichi — Déchaînement : Rythme de batterie | 1,55× ATK ; critique +35 points pour le lanceur, 2 actions. | 50.10 % | +0.10 pp | ±0.44 pp | à renforcer |
| 284157 | Lucy | SSR | Base | Frappe inspirée de Netrunner | esquive +3 points pour le lanceur, jusqu'à sa prochaine action | 54.40 % | +4.40 pp | ±2.39 pp | dans la marge |
| 284157 | Lucy | SSR | Secondaire | Netrunner | 0,4× ATK sur tous les ennemis ; esquive +5 % pour l'équipe, 1 action. | 52.90 % | +2.90 pp | ±2.98 pp | dans la marge |
| 284157 | Lucy | SSR | Tertiaire | Lucy : Netrunner — Pas de côté | 1,054× ATK ; esquive +6 % pour le lanceur, 1 action. | 54.20 % | +4.20 pp | ±2.42 pp | dans la marge |
| 284157 | Lucy | SSR | Ultime | Lucy — Déchaînement : Netrunner | 1,25× ATK ; esquive +30 % pour le lanceur, 2 actions. | 53.60 % | +3.60 pp | ±1.20 pp | dans la marge |
