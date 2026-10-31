# Anime Masters — Combat

[← Index des specs](README.md)

## Étape 4 quater — Combat 4 contre 4 (refonte des duels)

> **Statut : règles en cours d'équilibrage (discussion des 2026-10-29 au 2026-10-31).** Moteur pur codé dans `src/lib/battle.ts`, sans page ni base ; équilibrage mesuré par `npm run simulate:battle`. Remplacera le duel quiz 3 contre 3 de l'étape 4 (§1 à §3), qui reste en place tant que la refonte n'est pas codée. Les chiffres ci-dessous sont ceux du moteur au 2026-10-31. Moteur pas à pas avec journal d'événements (§9), vérifié par `npm run check:battle`.

### Objectif
Un vrai combat de cartes, où le type, la rareté et les synergies d'équipe comptent, jouable contre l'ordinateur (PvM) ou contre un autre joueur (PvP).

### Décisions validées
- **4 cartes contre 4.** Le quiz est abandonné (il pourra revenir plus tard comme bonus).
- Chaque carte a un **sort de base**, un **sort affilié** à son type (avec cooldown) et, pour les SSR et UR, un **ultime** *(désactivé pour le moment, voir §4)*.
- **Ultime** : un par anime pour les SSR. Les UR ont deux ultimes, celui de leur anime et un ultime personnel ; le joueur choisit lequel utiliser.
- **Passif UR** : bonus pour les alliés du même anime (franchise), plafonné.
- La rareté ne doit pas tout décider : une bonne combinaison SSR + SR doit pouvoir battre UR + SR au hasard.
- **Pas de formation** (avant / arrière) : testée, elle n'apportait rien.
- **Modes** : tour par tour manuel ; automatique calculé en arrière-plan par le serveur (PvM) ; automatique synchrone, que l'on regarde se dérouler (PvM ou PvP).
- **PvP** : arène asynchrone contre l'équipe de défense d'un joueur absent, avec Elo. Le matchmaking en direct viendra peut-être plus tard.
- **Défense cachée** : en arène, l'équipe de défense n'est révélée qu'au début du combat (impossible de choisir le contre parfait).
- **Ordre de jeu** : l'équipe qui possède la carte avec la plus haute **Puissance** commence. Cela donne une utilité à la Puissance.

### 1. Stats de combat
- **PV** = ATK + DEF de la carte (stats de base de l'étape 1, §6).
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
**Sort de base** : 1× ATK sur la cible. Disponible à chaque action.

**Sort affilié** (jeu « rôles ») : cooldown de 3 actions, premier lancer à la 2ᵉ action de la carte.

| Type | Rôle | Effet |
|---|---|---|
| 🔥 Combat | Frappe | 1,5× ATK, ignore 40 % de la DEF ; ×1,7 sur une cible **exposée** (et l'exposition est consommée) |
| 🔮 Mystère | Ouverture | 0,8× ATK (1,2× si aucun allié Combat n'est en vie) ; la cible devient **exposée** (jusqu'au prochain sort de Combat sur elle) et **affaiblie** (ATK −20 %) pendant ses 2 prochaines actions |
| ✨ Magie | Vampire | 1,2× ATK ; soigne de 50 % des dégâts infligés le lanceur et chaque allié Cœur |
| 💗 Cœur | Soutien | Soigne de 30 % de ses PV max l'allié ciblé (en automatique : le plus blessé), puis donne à toute l'équipe un bouclier de 10 % de ses PV max ; un allié protégé par un bouclier inflige +15 % |
| 🧭 Aventure | Zone | 0,6× ATK sur tous les ennemis ; toute l'équipe gagne l'**élan** (ATK +10 %) pendant 2 actions |

**Combos en duo** : Mystère expose, Combat frappe la cible exposée ; Cœur protège, les alliés protégés tapent plus fort ; Magie partage son drain avec Cœur. Le +15 % vaut pour tout bouclier, y compris celui du second joueur au 1er tour.

**Mode manuel** : à chaque action, le joueur choisit le sort (base, ou affilié s'il est prêt) et la cible. Base, Combat, Mystère et Magie visent un ennemi vivant ; Cœur un allié vivant ; Aventure n'a pas de cible (zone).

**Mode automatique** (et PvM en arrière-plan) : Cœur ne lance son sort que si un allié est sous 70 % de PV. Combat garde son sort au plus 2 actions en attendant une cible exposée, si un allié Mystère est en vie.

**Ultime** : **désactivé pour le moment** (décidé le 2026-10-31), retiré du moteur. Il reviendra avec les ultimes écrits par anime et les ultimes personnels des UR. *(L'essai précédent n'était qu'un bouche-trou pour mesurer le poids d'un ultime : jauge de 100, +20 par action et +10 par coup reçu, puis le sort affilié ×2 sur toute l'équipe adverse ; il donnait 60 % à 4 SSR avec ultimes contre 4 SSR sans.)*

### 4 bis. Sorts de personnage *(proposé le 2026-10-31, révisé : plus de variété ; à valider)*
Décidé : les SSR et UR ont un **3ᵉ sort**, propre à leur personnage, avec son cooldown. Il s'ajoute au sort de base et au sort affilié (qui restent), en manuel comme en automatique. Il remplace l'idée d'ultime à jauge (§4, désactivé).

- **Cooldown 5 actions**, premier lancer à la 3ᵉ action de la carte. Le sort affilié et le sort perso ont chacun leur compteur ; une carte ne lance qu'un sort par action.
- **Format** : une liste d'effets du vocabulaire ci-dessous, écrite en données (`src/lib/spells.ts`). Un SSR ou UR sans sort écrit reçoit un sort générique déduit de son type et de son rôle.
- **Variété** : au plus **un tiers** des sorts sont des attaques ; les autres soignent, protègent, affaiblissent ou contrôlent. Un sort sans dégâts est compensé par un effet fort (un sort de soutien peut avoir un effet que l'attaque pure n'a pas).

**Vocabulaire d'effets** *(les durées sont en actions de la carte qui porte l'effet, comme Affaibli et Élan aujourd'hui)* :

| Famille | Effets | Règle |
|---|---|---|
| Dégâts | **Attaque** sur une cible ; **zone** sur tous les ennemis ; **vol de vie** (soin = part des dégâts) ; **traverse les boucliers** (les dégâts touchent les PV directement) | Zone : multiplicateur plus faible |
| Attaque | **ATK +x %** / **ATK −x %** (soi, équipe ou ennemis) | ±20 % par effet, ±40 % au total |
| Défense | **DEF +x %** / **DEF −x %** | ±20 % par effet, ±40 % au total |
| Critique | **Critique +x** / **Critique −x** (points de chance ; base 15 %) | Total entre 0 et 75 % |
| Esquive | **Chance d'esquiver** les coups (soi ou équipe) | Plafond 50 % ; ne marche pas contre « traverse » ni contre les effets sans dégâts |
| Soin | **Soin ciblé** ; **soin de zone** (toute l'équipe) ; **soin sur la durée** (% de PV max à chaque action du porteur) | Pas au-delà des PV max |
| Bouclier | **Bouclier** (% des PV max, soi ou équipe) | Cumulable jusqu'à 30 % des PV max |
| Poison | **Poison** : perd x % de ses **PV max** à chaque action, pendant N actions | Ne se cumule pas (le plus fort remplace) ; peut tuer |
| Contrôle | **Silence** : la cible ne peut lancer que le **sort de base** pendant N actions | Durée 2 au maximum |
| Protection | **Immunité aux altérations** pendant N actions : aucun nouveau malus (ATK/DEF −, critique −, poison, silence, exposition) | Ne retire pas les malus déjà posés |
| Purge | **Purge** : retire tous les malus d'un allié ou de l'équipe (ATK/DEF −, critique −, poison, silence, exposition) | Ne protège pas contre les suivants |
| Résurrection | **Réanimation** d'un allié mort, avec x % de ses PV max | Une seule fois par combat et par carte lanceuse ; l'allié repart avec un compteur de cooldown neuf |

*(« Exposé » et « Affaibli » du jeu actuel deviennent des cas particuliers : exposition et ATK −20 %.)*

**Équilibre** *(à fixer au simulateur)* : un sort d'attaque pure vaut environ 2,0× l'ATK (SSR) ou 2,4× (UR) ; un sort de zone 0,9× (SSR) ou 1,1× (UR) ; un sort qui ajoute un effet fort (silence, DEF −, poison) perd du multiplicateur. **Automatique** : lancé dès qu'il est prêt ; un soin, un bouclier ou une réanimation seulement si un allié en a besoin ; un silence sur la cible la plus dangereuse.

**Boss** *(décidé le 2026-10-31)* : les boss d'histoire et de raid **résistent au silence** (sans effet sur eux) ; ils subissent tous les autres effets. Le **poison est mortel** (il peut achever une carte).

**Lancement** : les 28 SSR et UR de One Piece, Naruto et Jujutsu Kaisen en premier ; les autres univers au fil du temps.

| Perso | Sort | Effet | Rôle |
|---|---|---|---|
| Luffy (UR) | Gomu Gomu no Gatling | 2,2× ATK ; ATK +20 % pour lui, 2 actions | Attaque |
| Zoro (UR) | Santoryu Ogi | 1,8× ATK ; critique +30 pour lui, 3 actions | Attaque |
| Sanji (SSR) | Diable Jambe | 2,0× ATK, ignore 30 % de la DEF | Attaque |
| Robin (SSR) | Mil Fleur | 1,0× ATK ; silence 2 actions sur la cible | Contrôle |
| Law (SSR) | Shambles | 1,6× ATK qui traverse les boucliers ; DEF −20 %, 2 actions | Contrôle |
| Nami (SSR) | Thunderbolt Tempo | 0,6× ATK en zone ; ATK −20 % sur tous les ennemis, 2 actions | Zone / malus |
| Ace (SSR) | Hiken | 1,8× ATK ; vol de vie 40 % | Attaque / vol de vie |
| Chopper (SSR) | Rumble Ball | soin de zone 15 % des PV max ; purge des malus de l'équipe | Soin / purge |
| Usopp (SSR) | Kemuri Boshi | esquive 30 % pour l'équipe, 2 actions | Soutien |
| Naruto (UR) | Mode Kyubi | ATK +20 % pour l'équipe, 2 actions ; soin sur la durée 5 % × 3 actions pour lui | Soutien |
| Itachi (UR) | Tsukuyomi | 1,2× ATK ; silence 2 actions et ATK −20 % sur la cible | Contrôle |
| Kakashi (UR) | Raikiri | 2,2× ATK qui traverse les boucliers, ignore 30 % de la DEF | Attaque |
| Sasuke (SSR) | Amaterasu | poison 5 % des PV max × 3 actions sur la cible | Poison |
| Shikamaru (SSR) | Possession des ombres | critique −30 sur tous les ennemis, 2 actions ; DEF −15 % | Contrôle |
| Gaara (SSR) | Armure de sable | bouclier 15 % des PV max pour l'équipe | Bouclier |
| Jiraiya (SSR) | Rasengan crapaud | 0,9× ATK en zone | Zone |
| Gojo (UR) | Pourpre | 1,1× ATK en zone qui traverse les boucliers | Zone |
| Yuji (UR) | Black Flash | 2,0× ATK, coup critique assuré | Attaque |
| Megumi (UR) | Mahoraga | DEF +20 % pour l'équipe, 3 actions ; immunité aux altérations, 2 actions | Protection |
| Nanami (SSR) | Ratio 7:3 | 1,6× ATK ; DEF −25 % sur la cible, 2 actions | Contrôle |
| Nobara (SSR) | Résonance | poison 5 % des PV max × 3 actions ; ATK −15 % | Poison |
| Maki (SSR) | Lance du rêve | 1,4× ATK ; esquive 50 % pour elle, 2 actions | Attaque / esquive |
| Sukuna (SSR) | Démantèlement | 0,8× ATK en zone ; vol de vie 30 % | Zone / vol de vie |
| Yuta (SSR) | Rika | réanimation d'un allié mort à 35 % de ses PV max | Résurrection |
| Inumaki (SSR) | Mot-clé : « Arrêtez-vous » | silence 1 action sur tous les ennemis | Contrôle |
| Getou (SSR) | Manipulation de malédiction | 0,8× ATK en zone ; poison 3 % × 3 actions | Zone / poison |
| Toji (SSR) | Lance inversée | 2,0× ATK qui traverse les boucliers ; critique +25 pour lui | Attaque |
| Todo (SSR) | Boogie Woogie | 1,2× ATK ; critique +25 pour l'équipe, 2 actions | Soutien |

Répartition : 7 attaques, 4 zones (dont 2 avec vol de vie ou poison), 6 contrôles, 3 poisons ou malus, 6 soutiens (soin, bouclier, esquive, protection, résurrection, bonus d'équipe). Les noms et effets sont des propositions, modifiables.

### 5. Synergies
- **Franchise** : selon le nombre de cartes du même anime dans l'équipe, 2 : +3 %, 3 : +6 %, 4 : +10 % d'ATK, de DEF et de PV.
- **Passif UR** : chaque UR donne +10 % aux autres cartes de son anime, cumulable entre UR, plafonné à +30 %.

### 6. Budget d'équipe *(proposé, à valider)*
Pour que la rareté ne décide pas tout en arène : N 1, R 2, SR 3, SSR 5, UR 8 points, **14 points maximum** par équipe. Les compositions de même budget s'affrontent entre 33 et 67 % de victoires.

### 7. Résultats de la simulation (2026-10-31, sans ultimes, 4 000 combats par scénario)

| Mesure | Résultat |
|---|---|
| Taux de victoire par type, à rareté égale (équipes mixtes) | de 46 à 53 % |
| Équipes d'un seul type | suivent le cycle : le type fort gagne de 61 à 86 % (Combat contre Mystère : 86 %) |
| Équipe plus rare d'un cran (4 SSR contre 4 SR) | ~100 % (d'où le budget) |
| Poids de la franchise | +32 points ; un SSR + 3 SR du même anime bat UR + 3 SR au hasard 49 % du temps |
| Poids des combos de types | de +3 à +13 points (Magie + Cœur : le plus fort) |
| Celui qui commence (équipes miroir) | de 41 à 44 % |
| Durée | 5,7 tours en moyenne, 95 % en 9 tours ou moins |

### 8. Reste à décider
- Budget d'équipe et son plafond : à mettre en place plus tard.
- Mode manuel *(décidé le 2026-10-31)* : à chaque action, le joueur choisit **le sort** (base ou affilié s'il est prêt) **et la cible**. En automatique, la cible reste l'ennemi le plus faible.
- Écriture des ultimes par anime et des ultimes personnels des UR ; sorts spéciaux en plus pour les UR.
- Combat contre Mystère reste un peu fort (86 % contre ~70 % pour les autres paires du cycle) : à réduire si besoin, par exemple en baissant la pénétration de DEF de Combat contre Mystère.
- Modèle de données, pages, migration du duel quiz existant.
- L'arène est décrite dans [pvp.md](pvp.md), les modes PvM dans [pvm.md](pvm.md).

### 9. Moteur et journal du combat (pour l'affichage)
Code : `src/lib/battle.ts`, pur (aucun accès à la base). Vérifié par `npm run check:battle`.

**Déroulement en code**
- `createBattle(a, b, rng, options)` crée l'état. `rng` est un générateur aléatoire à graine : même graine + mêmes cartes + mêmes actions = même combat.
- `currentActor(state)` donne la carte qui doit agir (`null` quand le combat est fini).
- `legalActions(state)` liste ce qu'elle peut faire : `{ spell: "base" | "affinity", targets }`.
- `applyAction(state, { spell, target })` joue l'action (refusée si elle n'est pas permise) et passe à la carte suivante.
- `autoAction(state)` donne le choix de la stratégie automatique. `battle(a, b, rng)` joue tout le combat ainsi.
- Le résultat (`state.result`) contient le gagnant, le nombre de tours et **le journal** (`log`).

**Cartes** : identifiées par leur côté et leur position, `A1` à `A4` et `B1` à `B4`. Une carte d'entrée (`BattleCard`) porte ses stats de base, sa rareté, son type, sa Puissance, sa franchise, et en option ses étoiles (`stars`) et son arme (`weapon`).

**Journal** (`BattleEvent[]`) : la liste ordonnée de tout ce que l'affichage doit montrer. Chaque événement qui change des PV ou un bouclier donne la nouvelle valeur : l'affichage n'a rien à recalculer.

| `kind` | Champs | Sens |
|---|---|---|
| `start` | `first`, `units` (id, characterId, rareté, type, atk, def, maxHp, hp, shield) | Début : les 8 cartes et l'équipe qui commence |
| `round` | `round` | Début d'un tour |
| `action` | `actor`, `spell`, `target` (null pour Aventure) | Une carte lance un sort ; les effets suivent, jusqu'à la prochaine `action` |
| `damage` | `source`, `target`, `amount`, `absorbed`, `crit`, `affinity` (`strong` / `weak` / null), `exposedBonus`, `hp`, `shield` | Un coup ; `amount` avant bouclier, `absorbed` la part prise par le bouclier |
| `dodge` | `source`, `target` | Le coup d'un sort affilié est esquivé (arme), aucun dégât |
| `heal` | `source`, `target`, `amount`, `hp` | Soin (Cœur) ou drain (Magie) |
| `shield` | `source` (null pour le bouclier du second joueur), `target`, `amount` (négatif quand il disparaît), `shield` | Bouclier gagné ou perdu |
| `status` | `target`, `status` (`exposed` / `weaken` / `elan`), `on` | Un état apparaît ou disparaît |
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
