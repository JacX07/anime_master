# Anime Masters — Combat

[← Index des specs](README.md)

## Étape 4 quater — Combat 4 contre 4 (refonte des duels)

> **Statut : règles en cours d'équilibrage (discussion des 2026-10-29 au 2026-10-31).** Moteur pur codé dans `src/lib/battle.ts`, sans page ni base ; équilibrage mesuré par `npm run simulate:battle`. Remplacera le duel quiz 3 contre 3 de l'étape 4 (§1 à §3), qui reste en place tant que la refonte n'est pas codée. Les chiffres ci-dessous sont ceux du moteur au 2026-10-31. Moteur pas à pas avec journal d'événements (§9), vérifié par `npm run check:battle`.

### Objectif
Un vrai combat de cartes, où le type, la rareté et les synergies d'équipe comptent, jouable contre l'ordinateur (PvM) ou contre un autre joueur (PvP).

### Décisions validées
- **4 cartes contre 4.** Le quiz est abandonné (il pourra revenir plus tard comme bonus).
- Chaque carte a un **sort de base**, un **sort affilié** à son type (avec cooldown) et, pour les SSR et UR, un secondaire, un tertiaire et un ultime/passif fort personnalisés.
- Les **236 SSR/UR actifs** ont une fiche unique pour chacun de leurs quatre emplacements personnalisés ; l'implémentation et la simulation sont décrites au §4 bis et §4 ter.
- **Passif UR** : bonus pour les alliés du même anime (franchise), plafonné.
- La rareté ne doit pas tout décider : une bonne combinaison SSR + SR doit pouvoir battre UR + SR au hasard.
- **Pas de formation** (avant / arrière) : testée, elle n'apportait rien.
- **Modes** : tour par tour manuel ; automatique calculé en arrière-plan par le serveur (PvM) ; automatique synchrone, que l'on regarde se dérouler (PvM ou PvP).
- **PvP** : arène asynchrone contre l'équipe de défense d'un joueur absent, avec Elo. Le matchmaking en direct viendra peut-être plus tard.
- **Défense cachée** : en arène, l'équipe de défense n'est révélée qu'au début du combat (impossible de choisir le contre parfait).
- **Ordre de jeu** : l'équipe qui possède la carte avec la plus haute **Puissance** commence. Cela donne une utilité à la Puissance.

### 1. Stats de combat
- **PV** = 2,8 × (ATK + DEF) de la carte (stats de base de l'étape 1, §6). Ce facteur laisse plusieurs tours aux protections et aux soins avant les ultimes.
- **Dégâts** = ATK × % du sort × affinité × 2000 / (2000 + DEF de la cible). La DEF divise les dégâts par deux quand elle vaut 2000. Plancher : 10 % de l'ATK.
- **Critique** : 15 % de chance, dégâts ×1,5. **Variation** : ±10 % sur chaque coup.
- **Cible** : choisie par le joueur en mode manuel ; en automatique, l'ennemi vivant avec le moins de PV.
- Les bonus (passif UR, franchise) s'appliquent à l'ATK, à la DEF et aux PV.

### 2. Affinités
Cycle : 🔥 Combat → 🔮 Mystère → ✨ Magie → 💗 Cœur → 🧭 Aventure → 🔥 Combat. Chaque type inflige **×1,1** au suivant et **×0,95** au précédent (×1 sinon).

Les atouts et défauts de type de l'étape 1 (§5 ter), pensés pour le quiz, sont remplacés par les sorts affiliés ci-dessous.

### 3. Déroulement
1. L'équipe qui commence est celle qui a la carte de plus haute Puissance (égalité : le challenger, ou A).
2. Les cartes jouent en **alternance par position** : A1, B1, A2, B2, A3, B3, A4, B4, puis un nouveau tour. Une carte à 0 PV ne joue plus.
3. **Compensation** : l'équipe qui joue en second reçoit un bouclier de 15 % de ses PV max, qui disparaît à la fin du 1er tour.
4. Un bouclier absorbe les dégâts avant les PV.
5. **Fin** : une équipe sans carte vivante perd. Au bout de **30 tours**, l'équipe avec le plus haut pourcentage de PV restants gagne ; égalité parfaite : match nul.

### 4. Sorts
**Sort de base** : disponible à chaque action. Pour les cartes hors SSR/UR : 1× ATK sur la cible. Les SSR et UR ont une attaque de base personnalisée, définie au §4 ter.

**Sort affilié** (jeu « rôles ») : cooldown de 3 actions, premier lancer à la 2ᵉ action de la carte. **Les SSR et UR n'en ont pas** *(décidé le 2026-10-31)* : leurs quatre emplacements personnalisés (attaque de base, secondaire, tertiaire, ultime) le remplacent. Le cycle d'affinités entre types (×1,1 / ×0,95) reste valable pour tous ; seuls le sort de type et ses combos (exposition, vol de vie, soin de Cœur, élan d'Aventure) disparaissent pour eux.

| Type | Rôle | Effet |
|---|---|---|
| 🔥 Combat | Frappe | 1,5× ATK, ignore 40 % de la DEF ; ×1,7 sur une cible **exposée** (et l'exposition est consommée) |
| 🔮 Mystère | Ouverture | 0,8× ATK (1,2× si aucun allié Combat n'est en vie) ; la cible devient **exposée** (jusqu'au prochain sort de Combat sur elle) et **affaiblie** (ATK −20 %) pendant ses 2 prochaines actions |
| ✨ Magie | Vampire | 1,2× ATK ; soigne de 50 % des dégâts infligés le lanceur et chaque allié Cœur |
| 💗 Cœur | Soutien | Soigne de 30 % de ses PV max l'allié ciblé (en automatique : le plus blessé), puis donne à toute l'équipe un bouclier de 10 % de ses PV max ; un allié dont le bouclier restant couvre au moins 10 % de ses PV max inflige +15 % |
| 🧭 Aventure | Zone | 0,6× ATK sur tous les ennemis ; toute l'équipe gagne l'**élan** (ATK +10 %) pendant 2 actions |

**Combos en duo** : Mystère expose, Combat frappe la cible exposée ; Cœur protège, les alliés protégés tapent plus fort ; Magie partage son drain avec Cœur. Le +15 % ne se déclenche qu'avec au moins 10 % des PV max en bouclier restant, y compris pour celui du second joueur au 1er tour.

**Mode manuel** : l'attaque de base est présélectionnée. Toucher un ennemi suffit à l'attaquer ; le joueur peut choisir un autre sort avant sa cible. Toucher à nouveau le sort sélectionné revient à l'attaque de base. La sélection revient à la base après chaque choix joué, changement d'acteur ou mise à jour du journal, y compris après un buff instantané. Aucune attaque n'est lancée sans choix de cible en manuel. Base, Combat, Mystère et Magie visent un ennemi vivant ; Cœur un allié vivant ; Aventure n'a pas de cible (zone).

**Buff personnel instantané (SSR/UR)** : un secondaire, tertiaire ou ultime purement bénéfique pour le lanceur rend immédiatement la main à la même carte. Il doit être sans cible manuelle, avec uniquement bonus positifs de stats, soin, régénération, bouclier, réduction, immunité ou purge sur soi, ou provocation. Le lanceur peut enchaîner d'autres sorts prêts puis terminer avec une attaque ou un sort payant. Les effets mêlant dégâts et protection, les buffs d'équipe et les sorts pouvant cibler un allié gardent leur coût d'un tour. Les recharges avancent une seule fois par tour ; chaque buff lancé entre normalement en recharge ou consomme sa jauge. Poison, régénération et durées ne progressent qu'après l'action qui termine le tour. Le bonus personnel d'un tour s'applique à l'attaque immédiate, puis expire. Le texte du sort indique « Tour immédiat ».

**Mode automatique** (et PvM en arrière-plan) : Cœur ne lance son sort que si un allié est sous 70 % de PV. Combat garde son sort au plus 2 actions en attendant une cible exposée, si un allié Mystère est en vie.

**Ultime** : se charge en combat (§4 ter). Son activation utilise l'action de la carte, avec continuation immédiate pour un buff personnel pur SSR/UR ; l'IA automatique le privilégie dès qu'il peut être lancé utilement.

### 4 bis. Sorts secondaires et tertiaires personnalisés *(intégrés)*
Les SSR et UR ont quatre emplacements : attaque de base, secondaire, tertiaire et ultime. Ils sont disponibles en manuel et en automatique ; les buffs personnels purs peuvent précéder l'action qui termine le tour de la carte.

- `src/lib/skill-data.json` contient les **236 fiches réécrites**, chacune avec un secondaire, un tertiaire et un ultime nommés. `skill-data.ts` alimente les trois catalogues du moteur et de l'interface. Ces valeurs finales ne reçoivent plus les anciens coefficients de réduction.
- Le **secondaire** se recharge en **5 tours** de la carte ; le **tertiaire** en **7 tours**. Les valeurs, noms et combinaisons sont propres à chaque personnage ; le tertiaire apporte surtout des bonus, malus et protections.
- Les **ultimes** combinent jusqu'à quatre effets : gros dégâts, renfort d'équipe, protection, contrôle ou réanimation. La jauge reste décrite au §4 ter.
- Les orientations servent seulement à la simulation : attaque 73, soutien 56, protection 29, contrôle 49, hybride 29. Aucun rôle explicite n'est affiché. Un personnage peut combiner plusieurs fonctions.
- Les quatre sorts s'affichent en **grille 2 × 2**, avec l'ultime mis en avant. Les multiplicateurs de dégâts apparaissent au survol. Les chances de critique et d'esquive s'expriment en **points de pourcentage** : +25 points ajoute 25 points à la chance actuelle.
- `npm run simulate:compositions -- --games 1000 --seed 42` compare des équipes de 2 SSR + 2 UR sur le moteur réel. Les orientations sont réparties aléatoirement entre les raretés et les positions ; les puissances sont appariées et les camps alternés.

**Vocabulaire d'effets** *(les durées sont en actions de la carte qui porte l'effet, comme Affaibli et Élan aujourd'hui)* :

| Famille | Effets | Règle |
|---|---|---|
| Dégâts | **Attaque** sur une cible ; **zone** sur tous les ennemis ; **vol de vie** (soin = part des dégâts) ; **traverse les boucliers** (les dégâts touchent les PV directement) | Zone : multiplicateur plus faible |
| Attaque | **ATK +x %** / **ATK −x %** (soi, équipe ou ennemis) | ±60 % au total |
| Défense | **DEF +x %** / **DEF −x %** | ±60 % au total |
| Critique | **Critique +x** / **Critique −x** (points de chance ; base 15 %) | Total entre 0 et 100 % |
| Esquive | **Chance d'esquiver** les coups (soi ou équipe) | Total entre 0 et 100 % ; ne marche pas contre « traverse » ni contre les effets sans dégâts |
| Soin | **Soin ciblé** ; **soin de zone** (toute l'équipe) ; **soin sur la durée** (% de PV max à chaque action du porteur) | Pas au-delà des PV max |
| Bouclier | **Bouclier** (% des PV max, soi ou équipe) | Cumulable jusqu'à 30 % des PV max |
| Provocation | Les attaques à cible unique doivent viser un provocateur vivant | Les zones et les effets d'équipe restent libres ; plusieurs provocateurs sont tous ciblables |
| Réduction | **Dégâts subis −x %**, soi ou équipe, avant les boucliers | Cumul plafonné à 70 % ; ne réduit pas le poison |
| Poison | **Poison** : perd x % de ses **PV max** à chaque action, pendant N actions | Ne se cumule pas (le plus fort remplace) ; peut tuer |
| Contrôle | **Silence** : la cible ne peut lancer que le **sort de base** pendant N actions | Durée 2 au maximum |
| Étourdissement | **Tour passé** : aucune attaque ni compétence pendant le tour du porteur | Poison, régénération, recharges et durées continuent ; les boss et l'immunité aux malus le refusent ; une purge peut le retirer |
| Protection | **Immunité aux altérations** pendant N actions : aucun nouveau malus (ATK/DEF −, critique −, poison, silence, exposition) | Ne retire pas les malus déjà posés |
| Purge | **Purge** : retire tous les malus d'un allié ou de l'équipe (ATK/DEF −, critique −, poison, silence, exposition) | Ne protège pas contre les suivants |
| Résurrection | **Réanimation** d'un allié mort, avec x % de ses PV max | Une seule fois par combat et par carte lanceuse ; l'allié repart avec un compteur de cooldown neuf |

*(« Exposé » et « Affaibli » du jeu actuel deviennent des cas particuliers : exposition et ATK −20 %.)*

**Automatique** : priorité à l'ultime, puis au secondaire et au tertiaire prêts. Les soins purs attendent un allié sous 70 % de PV, les purges un malus et les réanimations un allié mort ; le silence vise l'ennemi à l'ATK la plus élevée parmi les cibles autorisées.

**Boss** *(décidé le 2026-10-31)* : les boss d'histoire et de raid **résistent au silence et à l'étourdissement** (sans effet sur eux) ; ils subissent tous les autres effets. Le **poison est mortel** (il peut achever une carte).

**Gojo — Extension du territoire** : remplace Pourpre comme ultime. À jauge pleine, étourdit automatiquement les **deux ennemis vivants à l'ATK la plus élevée** : chacun passe **son prochain tour**, puis peut rejouer. À égalité d'ATK, l'ordre des emplacements départage les cibles. Avec un seul ennemi vivant, une seule cible est touchée. Cet effet partiel de zone ignore la provocation. Les deux cibles sont choisies avant la résistance : un boss ou un ennemi immunisé résiste sans transfert vers une troisième cible. L'IA conserve la jauge si les deux cibles sont protégées. Chaque tour passé apparaît dans le journal et le rejeu. La résistance des boss couvre désormais aussi l'étourdissement.

**Lancement** : les 28 SSR et UR de One Piece, Naruto et Jujutsu Kaisen en premier ; les autres univers au fil du temps.

**Archive de la première calibration** : le tableau suivant décrit les anciens secondaires. Les valeurs actuelles sont celles de `skill-data.json`.

| Perso | Sort | Effet |
|---|---|---|
| Sasuke Uchiha (SSR) | Amaterasu | 1,36× ATK ; poison : 8 % des PV max par action pour la cible, 3 actions. |
| Itachi Uchiha (UR) | Tsukuyomi | 1,71× ATK ; silence sur la cible (sort de base seulement), 2 actions; sans effet sur les boss ; ATK −20 % pour la cible, 2 actions. |
| Naruto Uzumaki (UR) | Mode Kyubi | 0,78× ATK sur tous les ennemis ; ATK +20 % pour l'équipe, 2 actions ; soin sur la durée de 5 % des PV max pour le lanceur, 3 actions. |
| Luffy Monkey (UR) | Gomu Gomu no Gatling | 0,82× ATK ; ATK +20 % pour le lanceur, 2 actions. |
| Robin Nico (SSR) | Mil Fleur | 1,33× ATK ; silence sur la cible (sort de base seulement), 2 actions; sans effet sur les boss. |
| Zoro Roronoa (UR) | Santoryu Ogi | 0,94× ATK ; critique +30 points pour le lanceur, 3 actions. |
| Kakashi Hatake (UR) | Raikiri | 1,92× ATK, ignore 30 % de la DEF, traverse les boucliers. |
| Sanji (SSR) | Diable Jambe | 0,96× ATK, ignore 30 % de la DEF. |
| Chopper Tony Tony (SSR) | Rumble Ball | 0,22× ATK sur tous les ennemis ; soigne l'équipe de 15 % des PV max ; retire les malus de l'équipe. |
| Nami (SSR) | Thunderbolt Tempo | 0,29× ATK sur tous les ennemis ; ATK −20 % pour tous les ennemis, 2 actions. |
| Usopp (SSR) | Kemuri Boshi | 1× ATK sur tous les ennemis ; esquive +30 % pour l'équipe, 2 actions. |
| Gaara (SSR) | Armure de sable | 0,44× ATK sur tous les ennemis ; bouclier de 15 % des PV max pour l'équipe. |
| Shikamaru Nara (SSR) | Possession des ombres | 0,72× ATK sur tous les ennemis ; critique −30 points pour tous les ennemis, 2 actions ; DEF −15 % pour tous les ennemis, 2 actions. |
| Ace Portgas (SSR) | Hiken | 0,96× ATK, rend 40 % des dégâts en PV. |
| Jiraiya (SSR) | Rasengan crapaud | 1,2× ATK sur tous les ennemis ; DEF −15 % pour tous les ennemis, 2 actions. |
| Law Trafalgar (SSR) | Shambles | 1,1× ATK, traverse les boucliers ; DEF −20 % pour la cible, 2 actions. |
| Megumi Fushiguro (UR) | Mahoraga | 0,44× ATK sur tous les ennemis ; DEF +20 % pour l'équipe, 3 actions ; immunité aux malus pour l'équipe, 2 actions. |
| Yuuji Itadori (UR) | Black Flash | 0,89× ATK, coup critique assuré. |
| Satoru Gojou (UR) | Pourpre | 0,76× ATK sur tous les ennemis, traverse les boucliers. |
| Yuuta Okkotsu (SSR) | Rika | réanime un allié mort avec 17 % de ses PV max (une fois par combat). |
| Suguru Getou (SSR) | Manipulation de malédiction | 0,44× ATK sur tous les ennemis ; poison : 5 % des PV max par action pour tous les ennemis, 3 actions. |
| Nobara Kugisaki (SSR) | Résonance | 0,96× ATK ; poison : 8 % des PV max par action pour la cible, 3 actions ; ATK −15 % pour la cible, 2 actions. |
| Sukuna (SSR) | Démantèlement | 0,59× ATK sur tous les ennemis, rend 30 % des dégâts en PV. |
| Kento Nanami (SSR) | Ratio 7:3 | 0,96× ATK ; DEF −25 % pour la cible, 2 actions. |
| Maki Zenin (SSR) | Lance du rêve | 0,8× ATK ; esquive +30 % pour le lanceur, 2 actions. |
| Aoi Toudou (SSR) | Boogie Woogie | 1,02× ATK ; critique +25 points pour l'équipe, 2 actions. |
| Toge Inumaki (SSR) | Mot-clé : « Arrêtez-vous » | 0,59× ATK sur tous les ennemis ; silence sur tous les ennemis (sort de base seulement), 1 action; sans effet sur les boss. |
| Touji Fushiguro (SSR) | Lance inversée | 1,39× ATK, traverse les boucliers ; critique +25 points pour le lanceur, 2 actions. |

**Sorts génériques** (SSR et UR sans sort écrit, selon le type) :

| Type | Sort | Effet |
|---|---|---|
| COMBAT | Coup décisif | 1,55× ATK, ignore 30 % de la DEF. |
| MYSTERE | Entrave | 1,31× ATK ; silence sur la cible (sort de base seulement), 2 actions; sans effet sur les boss. |
| MAGIE | Drain | 1,13× ATK, rend 30 % des dégâts en PV. |
| COEUR | Bénédiction | 0,54× ATK sur tous les ennemis ; soigne l'équipe de 12 % des PV max. |
| AVENTURE | Charge | 0,46× ATK sur tous les ennemis ; ATK +15 % pour l'équipe, 2 actions. |

**Calibrage** *(2026-10-31, `npm run calibrate:spells`, `npm run simulate:spells`)* : le sort remplace l'attaque de base de la carte pendant son tour, donc **un sort sans dégâts fait perdre des points**, et un sort de zone vaut 4 cibles. Chaque sort a donc une petite attaque (zone : 0,2 à 0,8×, cible unique : 0,8 à 1,9×) réglée pour qu'il pèse environ **+4 points de victoire** (mesuré après calibrage : de +1,2 à +6,7 pour 32 sorts sur 33 ; Jiraiya, au plus faible, a reçu un malus de DEF en plus). Valeurs d'avant le calibrage : attaques à 2,0 à 2,4×, zones à 0,6 à 1,1× (de −22 à +25 points). Mesure globale : 4 SSR avec sorts contre 4 SSR sans : +3,9 points ; 4 UR : +5,3 ; 4 SSR avec sorts contre 4 UR sans sorts : 0,6 % (l'UR domine toujours).

Les noms et effets sont des propositions, modifiables.

### 4 ter. Attaques de base SSR/UR et ultimes *(intégrés)*

L'ultime reste distinct des sorts secondaire et tertiaire (§4 bis). Une activation termine normalement le tour du personnage ; un ultime purement personnel SSR/UR rend immédiatement la main selon la règle des buffs instantanés (§4). La fiche de chaque SSR/UR vient du catalogue statique ; à terme, si une carte propose plusieurs ultimes, l'équipe pourra en équiper un seul.

**Attaque de base personnalisée** : les **236 SSR/UR actifs** ont chacun une fiche statique avec un nom et un effet dans `src/lib/basic-attack-roster.ts`. Les 47 fiches personnalisées sont listées ci-dessous ; les 189 autres portent chacune le nom unique de leur sort signature, précédé de « Frappe inspirée de », avec un effet léger tiré de son archétype. `npx tsx scripts/generate-basic-attacks.ts` régénère le snapshot depuis la base et les sorts actuels. Pour un futur personnage sans fiche, le moteur garde un fallback depuis son sort ou le sort générique de son type. Chaque coup reste à **1× ATK** et applique un seul petit effet s'il touche. Il ne peut pas infliger de contrôle, de dégâts de zone, de résurrection, d'exécution ou d'action supplémentaire. Plafonds : ATK/DEF ±3 % pour la prochaine action concernée, critique ou esquive ±3 points jusqu'à la prochaine action, ignore-DEF 3 % sur la prochaine attaque, bouclier ou soin de 2 % des PV max (0,08 % pour Gojo, 0,1 % pour Nishinoya et 0,5 % pour Rei, Megumi, Roxy, Izumi et Nezuko après calibrage), drain de 2 % des dégâts, ou poison de 0,5 % des PV max sur une action. Un effet identique ne se cumule pas.

**Calibration actuelle** *(2026-10-31, 500 paires par fiche, camps inversés)* : l'effet moyen d'une attaque de base personnalisée est de **+1,12 point de victoire** face à l'attaque générique. Les résultats complets, après l'ajustement du bonus de combo des boucliers, figurent dans le rapport des quatre slots.

| Personnage | Attaque de base (1× ATK) | Petit effet |
|---|---|---|
| Sasuke | Kunai de foudre | DEF de la cible −3 % pour sa prochaine action |
| Itachi | Shuriken Sharingan | ATK de la cible −3 % pour sa prochaine action |
| Naruto | Rasengan direct | ATK de Naruto +3 % sur sa prochaine attaque |
| Luffy | Pistolet Gum-Gum | Ignore 3 % de la DEF sur sa prochaine attaque |
| Robin | Bras fleuri | DEF de la cible −3 % pour sa prochaine action |
| Zoro | Coupe à trois sabres | Critique +3 points sur sa prochaine attaque |
| Kakashi | Kunai copié | Critique +3 points sur sa prochaine attaque |
| Sanji | Coup de pied enflammé | ATK de Sanji +3 % sur sa prochaine attaque |
| Chopper | Coup de sabot | Soigne Chopper de 2 % de ses PV max |
| Nami | Frappe du Clima-Tact | ATK de la cible −3 % pour sa prochaine action |
| Usopp | Étoile explosive | Poison : 0,5 % des PV max de la cible à sa prochaine action |
| Gaara | Poing de sable | DEF de Gaara +3 % jusqu'à sa prochaine action |
| Shikamaru | Ombre croisée | ATK de la cible −3 % pour sa prochaine action |
| Ace | Flamme légère | Poison : 0,5 % des PV max de la cible à sa prochaine action |
| Jiraiya | Rasengan | DEF de la cible −3 % pour sa prochaine action |
| Law | Coupe de Kikoku | Ignore 3 % de la DEF sur sa prochaine attaque |
| Megumi | Coup de Nue | Bouclier de 0,5 % de ses PV max |
| Yuuji Itadori | Coup divergeant | Critique +3 points sur sa prochaine attaque |
| Satoru Gojou | Impulsion d'Infini | Bouclier de 0,08 % des PV max de Gojo |
| Yuuta Okkotsu | Coupe de katana avec Rika | Soigne Yuta de 2 % de ses PV max |
| Suguru Getou | Frappe de fléau | Poison : 0,5 % des PV max de la cible à sa prochaine action |
| Nobara | Clou résonnant | ATK de la cible −3 % pour sa prochaine action |
| Sukuna | Démantèlement léger | Ignore 3 % de la DEF sur sa prochaine attaque |
| Nanami | Frappe du ratio | Critique +3 points sur sa prochaine attaque |
| Maki | Balayage à la lance | Ignore 3 % de la DEF sur sa prochaine attaque |
| Aoi Todo | Coup suivi d'une feinte | ATK de Todo +3 % sur sa prochaine attaque |
| Toge Inumaki | « Reculez » | ATK de la cible −3 % pour sa prochaine action |
| Touji Fushiguro | Pointe de lance inversée | Ignore 3 % de la DEF sur sa prochaine attaque |
| Emilia | Éclat de glace | DEF de la cible −3 % pour sa prochaine action |
| Subaru | Coup de barre | DEF de Subaru +3 % jusqu'à sa prochaine action |
| Rem | Coup de fléau | Critique +3 points sur sa prochaine attaque |
| Guts | Coup de Dragonslayer | Ignore 3 % de la DEF sur sa prochaine attaque |
| Griffith | Pointe de rapière | Critique +3 points sur sa prochaine attaque |
| Rei Ayanami | Frappe inspirée de Champ A.T. | Bouclier de 0,5 % de ses PV max |
| Izumi Miyamura | Frappe inspirée de Vrai moi | Soigne 0,5 % de ses PV max |
| Roxy Migurdia | Frappe inspirée de Barrière de Roxy | Bouclier de 0,5 % de ses PV max |
| Nezuko Kamado | Frappe inspirée de Forme de démon | Soigne 0,5 % de ses PV max |
| Yuu Nishinoya | Réception de Rolling Thunder | Bouclier de 0,1 % de ses PV max |
| Madara | Kunai embrasé | DEF de la cible −3 % pour sa prochaine action |
| Okabe Rintaro | Gadget lancé | DEF d'Okabe +3 % jusqu'à sa prochaine action |
| Gon | Coup direct | ATK de Gon +3 % sur sa prochaine attaque |
| Killua | Décharge du bout des doigts | Esquive +3 points jusqu'à sa prochaine action |
| Denji | Entaille de tronçonneuse | Rend 2 % des dégâts de l'attaque en PV |
| Makima | Tir contrôlé | ATK de la cible −3 % pour sa prochaine action |
| Frieren | Zoltraak | Ignore 3 % de la DEF sur sa prochaine attaque |
| Midoriya | Delaware Smash léger | ATK de Midoriya +3 % sur sa prochaine attaque |
| All Might | Poing du One For All | ATK d'All Might +3 % sur sa prochaine attaque |
| Todoroki | Éclat de glace et de feu | ATK de la cible −3 % pour sa prochaine action |

**Jauge d'ultime** : jauge individuelle de **100** pour les SSR/UR, remplie de **50 points par attaque de base réussie** *(décidé le 2026-10-31, pour donner de l'intérêt à l'attaque de base)* et de **34 points par sort offensif réussi** (secondaire ou tertiaire) qui inflige des dégâts à un adversaire (attaque de base, affiliée, secondaire ou tertiaire). Elle est plafonnée à 100, sans report de surplus. Une attaque de zone ne donne les points qu'une fois, même si elle touche plusieurs cibles ; les dégâts absorbés par un bouclier comptent. Une esquive, un soin, un poison, les dégâts d'un ultime et les dégâts reçus ne chargent pas la jauge. L'activation remet la jauge à 0. Les entrées de `src/lib/ultimate-catalog.ts` peuvent donc être relancées après une nouvelle charge.

**Catalogue ultime/passif fort** : les 236 SSR/UR ont une entrée nommée et un effet dans `src/lib/ultimate-catalog.ts`. Le moteur réutilise le vocabulaire d'effets pris en charge par `CharacterSpell` ; les idées qui demandent un déclenchement à la mort, une possession, une exécution conditionnelle, une action supplémentaire, une copie ou un reset de cooldown sont représentées par une approximation active (attaque, soin, bouclier, modificateur ou silence). En particulier, Puck et Retour par la mort sont actuellement des ultimes activés avec jauge, et non des passifs automatiques à la mort. Le rapport de simulation donne le nom, l'effet réellement joué et l'impact mesuré de chacune des 236 fiches.

**Équilibrage** : la jauge, les quatre slots isolés et des équipes complètes ont été comparés par graines appariées, en inversant le camp qui commence. Les résultats finaux et les fiches extrêmes sont dans [le rapport de simulation SSR/UR](../reports/character-skills-simulation.md). Les résultats restent dépendants de l'IA automatique, des équipes miroirs et des effets actuellement pris en charge ; ils ne mesurent pas les mécaniques absentes du moteur comme une exécution conditionnelle ou un vrai tour supplémentaire.

### 5. Synergies
- **Franchise** : selon le nombre de cartes du même anime dans l'équipe, 2 : +3 %, 3 : +6 %, 4 : +10 % d'ATK, de DEF et de PV.
- **Passif UR** : chaque UR donne +10 % aux autres cartes de son anime, cumulable entre UR, plafonné à +30 %.

### 6. Budget d'équipe *(proposé, à valider)*
Pour que la rareté ne décide pas tout en arène : N 1, R 2, SR 3, SSR 5, UR 8 points, **14 points maximum** par équipe. Les compositions de même budget s'affrontent entre 33 et 67 % de victoires.

### 7. Résultats de la simulation (2026-10-31, sans ultimes, 4 000 combats par scénario)

**Archive** : les tableaux de cette section précèdent la réécriture des 236 fiches et le facteur de PV à 2,8. La mesure actuelle des compositions est dans [le rapport de composition](../reports/composition-simulation.md).

| Mesure | Résultat |
|---|---|
| Taux de victoire par type, à rareté égale (équipes mixtes) | de 46 à 53 % |
| Équipes d'un seul type | suivent le cycle : le type fort gagne de 61 à 86 % (Combat contre Mystère : 86 %) |
| Équipe plus rare d'un cran (4 SSR contre 4 SR) | ~100 % (d'où le budget) |
| Poids de la franchise | +32 points ; un SSR + 3 SR du même anime bat UR + 3 SR au hasard 49 % du temps |
| Poids des combos de types | de +3 à +13 points (Magie + Cœur : le plus fort) |
| Celui qui commence (équipes miroir) | de 41 à 44 % |
| Durée | 5,7 tours en moyenne, 95 % en 9 tours ou moins |

### 7 bis. Calibration des slots SSR/UR (2026-10-31, 500 paires par fiche)

Chaque fiche est comparée à une copie des mêmes équipes sans capacité personnalisée ; les graines sont appariées et le camp qui commence est inversé. Les quatre slots sont testés isolément pour les 236 SSR/UR, puis activés ensemble dans des équipes SSR, mixtes et UR. L'intervalle de confiance à 95 % est calculé sur les paires.

| Slot | Fiches | Impact moyen | SSR | UR |
|---|---:|---:|---:|---:|
| Attaque de base | 236 | +1,12 pp | +1,14 pp | +1,08 pp |
| Secondaire | 236 | −0,05 pp | +0,18 pp | −1,00 pp |
| Tertiaire | 236 | +4,01 pp | +3,84 pp | +4,68 pp |
| Ultime | 236 | +5,35 pp | +5,28 pp | +5,63 pp |

| Équipe complète | Victoires contre sa copie | Impact des quatre slots | IC 95 % | Ultimes lancés par équipe | Combats avec ultime | Premier ultime |
|---|---:|---:|---:|---:|---:|---:|
| 4 SSR | 51,45 % | +1,45 pp | ±3,03 pp | 1,90 | 98,8 % | tour 4,0 |
| 2 UR + 2 SSR | 47,20 % | −2,80 pp | ±3,07 pp | 1,83 | 99,8 % | tour 4,0 |
| 4 UR | 50,90 % | +0,90 pp | ±3,13 pp | 1,78 | 99,1 % | tour 4,0 |

Les trois résultats d'équipe restent dans leur intervalle de confiance autour de 50 %. La jauge de **100** (50 par attaque de base, 34 par sort offensif), donne environ **1,8 à 1,9 ultime par équipe et par combat** ; au moins 98,8 % des combats voient un ultime, vers le 4ᵉ tour. Le détail des 944 fiches et des extrêmes est dans [le rapport de simulation](../reports/character-skills-simulation.md).

### 8. Reste à décider
- Budget d'équipe et son plafond : à mettre en place plus tard.
- Mode manuel : à chaque action, le joueur choisit le sort (base, affilié, secondaire, tertiaire ou ultime chargé) et la cible. En automatique, l'IA privilégie l'ultime prêt, puis le secondaire, le tertiaire et les choix affiliés/de base.
- Transformer les approximations du catalogue d'ultimes en mécaniques dédiées (passifs déclenchés à la mort, contrôle d'un ennemi qui joue dans l'équipe, exécution conditionnelle, copie, double action et reset de cooldown) ; écrire les cinq techniques distinctes de Midoriya.
- Combat contre Mystère reste un peu fort (86 % contre ~70 % pour les autres paires du cycle) : à réduire si besoin, par exemple en baissant la pénétration de DEF de Combat contre Mystère.
- Modèle de données, pages, migration du duel quiz existant.
- L'arène est décrite dans [pvp.md](pvp.md), les modes PvM dans [pvm.md](pvm.md).

### 9. Moteur et journal du combat (pour l'affichage)
Code : `src/lib/battle.ts`, pur (aucun accès à la base). Vérifié par `npm run check:battle`.

**Déroulement en code**
- `createBattle(a, b, rng, options)` crée l'état. `rng` est un générateur aléatoire à graine : même graine + mêmes cartes + mêmes actions = même combat.
- `currentActor(state)` donne la carte qui doit agir (`null` quand le combat est fini).
- `legalActions(state)` liste ce qu'elle peut faire : `{ spell: "base" | "affinity" | "special" | "tertiary" | "ultimate", targets }`, en excluant les sorts en cooldown ou ultimes non chargés.
- `applyAction(state, { spell, target })` joue l'action (refusée si elle n'est pas permise) et passe à la carte suivante.
- `autoAction(state)` donne le choix de la stratégie automatique. `battle(a, b, rng)` joue tout le combat ainsi.
- Le résultat (`state.result`) contient le gagnant, le nombre de tours et **le journal** (`log`).

**Cartes** : identifiées par leur côté et leur position, `A1` à `A4` et `B1` à `B4`. Une carte d'entrée (`BattleCard`) porte ses stats de base, sa rareté, son type, sa Puissance, sa franchise, et en option ses étoiles (`stars`) et son arme (`weapon`).

**Journal** (`BattleEvent[]`) : la liste ordonnée de tout ce que l'affichage doit montrer. Chaque événement qui change des PV ou un bouclier donne la nouvelle valeur : l'affichage n'a rien à recalculer.

| `kind` | Champs | Sens |
|---|---|---|
| `start` | `first`, `units` (id, characterId, rareté, type, atk, def, maxHp, hp, shield) | Début : les 8 cartes et l'équipe qui commence |
| `round` | `round` | Début d'un tour |
| `action` | `actor`, `spell` (`base` / `affinity` / `special` / `tertiary` / `ultimate`), `target` (null pour Aventure) | Une carte lance un sort ; les effets suivent, jusqu'à la prochaine `action` |
| `damage` | `source`, `target`, `amount`, `absorbed`, `crit`, `affinity` (`strong` / `weak` / null), `exposedBonus`, `hp`, `shield` | Un coup ; `amount` avant bouclier, `absorbed` la part prise par le bouclier |
| `dodge` | `source`, `target` | Le coup d'un sort affilié est esquivé (arme), aucun dégât |
| `heal` | `source`, `target`, `amount`, `hp` | Soin (Cœur) ou drain (Magie) |
| `shield` | `source` (null pour le bouclier du second joueur), `target`, `amount` (négatif quand il disparaît), `shield` | Bouclier gagné ou perdu |
| `status` | `target`, `status` (`exposed` / `weaken` / `elan`), `on` | Un état apparaît ou disparaît |
| `ultimateGauge` | `target`, `amount`, `current`, `max` | La jauge personnelle d'ultime progresse ou est dépensée |
| `revive` | `source`, `target`, `hp` | Une carte revient au combat |
| `control` | `source`, `target`, `remainingActions` | Une carte est contrôlée pour un nombre d'actions indiqué |
| `ko` | `target` | Une carte tombe à 0 PV |
| `end` | `winner` (null = nul), `reason` (`ko` / `timeout`), `rounds`, `hpLeft` | Fin du combat |

Un combat compte environ 80 événements.

### 10. Base et serveur *(validé et codé le 2026-10-31)*
Code : `src/lib/battles.ts` (serveur), actions dans `src/app/battle-actions.ts`. Vérifié par `npm run check:battles` sur la vraie base.

**Données**
- `Card.stars` : éveil 0 à 5. Les étoiles **suivent l'exemplaire** quand il est échangé ou vendu aux enchères. La vente groupée des doublons ne prend jamais une carte éveillée (comme une carte verrouillée) ; la vente d'un exemplaire précis reste possible.
- `BattleTeam` + `BattleTeamSlot` : **une équipe d'attaque** par joueur (et une de défense, prévue pour l'arène). 4 cartes différentes, positions 1 à 4. Les cartes ne sont pas bloquées. Une carte vendue disparaît de l'équipe ; une carte échangée en est retirée à la lecture.
- `Battle` : mode (`TEST`, `STORY`, `RAID`, `TOWER`, `ARENA`), adversaire, manuel ou non, graine, copie des 8 cartes, choix du joueur, statut (`RUNNING`, `DONE`, `ABANDONED`), gagnant, journal complet enregistré à la fin.

**Déroulement**
- **Automatique** : le serveur calcule tout le combat d'un coup et enregistre le journal.
- **Manuel** : le joueur choisit pour son camp (A) ; le camp adverse (B) joue avec la stratégie automatique. À chaque choix, le serveur rejoue le combat depuis la copie des cartes, la graine et les choix précédents, applique le nouveau choix, puis fait jouer l'adversaire jusqu'au prochain choix du joueur. Il renvoie seulement les nouveaux événements. Rien n'est gardé en mémoire, et le navigateur ne peut pas tricher.
- Un seul combat manuel en cours à la fois. Un double clic n'est joué qu'une fois (compteur d'actions `steps`).
- **Abandon** : compté comme perdu. Un combat manuel ouvert depuis plus de **24 h** est abandonné automatiquement (balayage à chaque lecture).
- **Adversaire de test** (`test`) : 4 SR (Combat, Mystère, Magie, Cœur), les plus aimés de leur type. Les vrais adversaires viendront avec le mode histoire.

**Actions serveur** (renvoient `{ ok, battle }` ou `{ ok: false, error }`)

| Action | Rôle |
|---|---|
| `setAttackTeamAction(cardIds)` | Enregistre l'équipe d'attaque (4 identifiants de cartes, dans l'ordre) |
| `startBattleAction(opponent, manual)` | Lance un combat avec l'équipe d'attaque |
| `getBattleAction(battleId)` | Combat complet (replay, ou reprise d'un combat manuel) |
| `playActionAction(battleId, { spell, target })` | Mode manuel : joue un choix, renvoie les nouveaux événements |
| `abandonBattleAction(battleId)` | Abandonne un combat manuel |

`battle` contient : `id`, `status`, `winner`, `log` (journal, ou sa suite en mode manuel), `actor` (carte du joueur qui doit agir), `choices` (sorts et cibles possibles), `characters` (nom et image des 8 personnages).

**Pas encore fait** : armes et ressources d'éveil (avec le mode histoire et le raid), récompenses, page de combat (piste du moteur graphique).

### 11. Page Équipe *(décidé le 2026-10-31, à coder)*
Page `/equipe`, dans le menu « Jouer ». Elle est la **seule** façon de choisir son équipe : tous les modes (histoire, Tour, test, raid) utilisent l'équipe enregistrée, plus de choix à chaque combat.

- **Deux onglets** : **Attaque** (histoire, Tour, raid) et **Défense** (réservé à l'arène PvP : enregistrable dès maintenant, utilisé quand l'arène existera, voir [pvp.md](pvp.md)). Même carte dans les deux équipes autorisée (les cartes ne sont pas bloquées).
- **4 emplacements** ordonnés (l'ordre = ordre de jeu). Choix depuis la collection : filtres rareté / type / anime, recherche. Bouton « Auto » (`autoAttackTeam`) et bouton pour vider un emplacement.
- **Aperçu de l'équipe** : Puissance de combat (ATK / DEF / PV), bonus de **franchise** actif, affinités (forces et faiblesses face aux 5 types), qui joue en premier.
- **Sorts visibles** : chaque emplacement affiche les sorts de la carte (sort de type, sort de personnage pour SSR / UR : nom, effet, durée), avec les mêmes infobulles que le lecteur de combat. Cliquer une carte ouvre le détail de ses sorts, y compris depuis la collection.
- Les combats lancés sans équipe complète renvoient vers `/equipe`.
- Nouvelle action serveur : `setDefenseTeamAction(cardIds)` ; `setAttackTeamAction` existe déjà.

### 12. Spell Builder *(intégré le 2026-10-31)*
Page `/builder`, **réservée au développeur** : uniquement en dev (`NODE_ENV` ≠ production) et connecté. Elle sert à écrire et équilibrer les sorts de personnage des SSR et UR (SR, R et N restent sans sort).

- **Catalogue complet** : les quatre emplacements de chacun des 236 SSR/UR sont affichés : attaque de base, secondaire, tertiaire et ultime (944 fiches). Ces raretés n’ont pas de sort affilié (§4). Recherche par personnage ou par nom de n’importe lequel des quatre sorts. Chaque fiche affiche nom, effets réellement joués et disponibilité/recharge.
- **Éditeur** : sélection d’un personnage SSR / UR et de son emplacement, puis nom du sort, cible (ennemi, allié, allié mort, aucune) et liste d'effets (ajout, retrait, réglage de chaque champ). Le texte français se met à jour en direct. L’attaque de base garde 1× ATK et un seul petit effet, validé selon les plafonds du §4 ter.
- **Stockage** : table `SpellOverride`, JSON `{ slots: { base?, secondary?, tertiary?, ultimate? } }`. Sauvegarde et remise à zéro indépendantes par emplacement ; les anciennes sauvegardes (sort seul) restent lisibles comme secondaires. Les catalogues du jeu restent inchangés. **Exporter** copie la fiche JSON et sa destination (`BASIC_ATTACK_ROSTER[id].attack` ou emplacement de `skill-data.json`).
- **Simulate** (serveur, progression en direct) : 500 ou 4 000 **paires** de combats. Le brouillon et le sort d’origine affrontent les mêmes équipes, avec la même graine par paire et les camps alternés. La mesure isole l’emplacement choisi via `BattleCard.basicAttack`, `.spell`, `.tertiary` ou `.ultimate`, face à une copie sans capacités personnalisées. L’interface affiche les deux impacts et leur différence, avec un intervalle de confiance apparié à 95 %. Le verdict est **inchangé** si les mécaniques sont identiques (un renommage seul ne compte pas), **plus fort** ou **plus faible** si cet intervalle exclut zéro, sinon **comparable**. L’ancien seuil universel de +6 points face à une carte sans capacités est retiré : il ne permettait pas de juger les quatre emplacements actuels. Un sort inchangé n’est pas pour autant certifié équilibré globalement. Pour un SSR, le scénario 4 SSR contre 4 UR sans capacités personnalisées reste affiché à titre complémentaire.
- **Mécaniques sur mesure par IA** : si le sort demande une mécanique absente du moteur, le sort passe en `pending` (exclu de la simulation) et un bouton **Implémenter** lance un agent Claude Code en arrière-plan (CLI `claude` en mode headless, dev local seulement) dans un worktree git séparé, sur la branche `mecanique/<nom>`. L'agent ajoute l'effet dans `spells.ts` (type et texte), `battle.ts` (résolution), le formulaire du builder et `check-spells`.
- **Garde-fous obligatoires** : typecheck, lint, `check:spells`, `check:battle`, et `check:replay` **identique** pour les sorts existants (même graine, même résultat). Deux tentatives au plus ; au second échec, le sort reste `pending`, le journal d'erreur s'affiche, rien n'est fusionné.
- **Retour** dans le builder : résumé de ce qui a été ajouté, fichiers touchés, résultat des tests, puis simulation du sort. **Valider** fusionne la branche dans `main` ; l'agent ne touche jamais à `main` lui-même.

---

## Progression des cartes *(décidé le 2026-10-31, chiffres à fixer au simulateur)*

### 1. Règle de puissance
Tout ce qui rend une carte plus forte, avec une limite pour chaque source. Le combat amplifie les écarts : un SSR a ~38 % de stats de plus qu'un SR, mais 4 SSR battent 4 SR 99,9 % du temps. L'écart moyen SSR → UR n'est que de ~31 %. Les bonus de progression doivent donc rester petits.

| Source | Ce qu'elle apporte | Limite |
|---|---|---|
| Rareté | L'écart de départ | **Un UR domine un SSR** : c'est voulu |
| Synergies | Franchise (+3 / 6 / 10 %), passif UR (+10 % par UR, 30 % max) | Valeurs actuelles jugées bonnes ; sorts spéciaux à ajouter pour les UR |
| Éveil (0 à 5 étoiles) | Stats et réduction de cooldown | Jamais assez pour battre la rareté du dessus |
| Arme légendaire | Stats et un passif spécial | Comptée avec l'éveil dans la limite |

**Test automatique** (dans `npm run simulate:battle`, §8) : un SSR éveillé 5 étoiles avec une arme légendaire doit perdre contre un UR à 0 étoile sans arme. Avec les valeurs retenues, il gagne 14 % du temps.

### 2. Éveil
- De 0 à 5 étoiles, sur la carte du joueur (l'exemplaire, pas le personnage).
- **+2 % d'ATK, de DEF et de PV par étoile** (+10 % à 5 étoiles).
- **À 5 étoiles, le cooldown du sort affilié passe de 3 à 2 actions.**
- **Coût** : étoiles 1 à 3 = ressource du mode histoire ; étoiles 4 et 5 = ressource rare du raid **et un seul doublon** du personnage. Un doublon consommé ne circule plus : en demander davantage ferait de la Bourse un marché de puissance.
- À 5 étoiles, la carte peut équiper une **arme légendaire**.

### 3. Arme légendaire
- Équipable uniquement sur une carte éveillée 5 étoiles (le moteur l'ignore sinon).
- **Fabriquée** à partir des ressources obtenues en jeu, et **difficile** à obtenir.
- **+5 % d'ATK, de DEF et de PV**, et un **passif**. Deux passifs codés pour l'essai :
  - **Esquive** : chance d'esquiver chaque coup d'un sort affilié adverse.
  - **Renfort de type** : +X % d'ATK aux alliés d'un type, porteur compris.
- Liste des armes, recettes et passifs définitifs : à écrire.

### Mesures (2026-10-31, 3 000 combats par case)
Équipes de 4 cartes de même rareté, tirées au hasard.

| Par étoile | Arme | SSR 5★ armé contre UR 0★ | SR 5★ armé contre SSR 0★ | SSR 5★ sans arme contre SSR 0★ | UR 5★ armé contre UR 0★ |
|---|---|---|---|---|---|
| +1 % | +5 % | 5 % | 2 % | 75 % | 92 % |
| **+2 %** | **+5 %** | **14 %** | **5 %** | **89 %** | **98 %** |
| +3 % | +5 % | 28 % | 11 % | 96 % | 99 % |
| +4 % | +5 % | 46 % | 22 % | 99 % | 100 % |

- **Retenu : +2 % par étoile et +5 % pour l'arme.** Un UR à 0 étoile gagne encore 86 % du temps contre un SSR éveillé et armé : la rareté domine. À rareté égale, l'éveil compte beaucoup (89 %), parce que le combat amplifie les écarts.
- Le cooldown réduit seul (sans les stats) vaut 55 % contre 45 %.
- Passifs, portés par une seule carte (équipe contre la même sans le passif) : esquive 3 % = +0,6 point (presque rien) ; esquive 10 % = +3 ; renfort de type +5 % = +7 ; renfort +10 % = +14.
- **À décider** : la force des passifs. 3 % d'esquive ne se sent pas, 10 % commence à compter.

### 4. Rythme
Fangame gratuit, sans frustration : en jouant assez, on finit toujours par obtenir ce qu'on veut. Le rythme et le tableau des ressources (ce que chaque mode donne, et combien par jour) restent à retravailler.


> *Mesure du 2026-10-31 après suppression du sort de type et jauge de base à 50 : 1,94 ultime par équipe et par combat (6,5 tours en moyenne) ; 4 SSR contre 4 SR 99,9 %, 4 UR contre 4 SSR 99,7 %, 4 SSR contre 4 SSR 50,7 %. Les difficultés de l'histoire ont été recalibrées (×0,98 à ×1,22).*
