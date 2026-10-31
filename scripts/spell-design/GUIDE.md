# Réécriture des sorts SSR/UR — consignes (2026-10-31)

Tu écris, pour chaque personnage de ton lot, **3 sorts** : `secondary`, `tertiary`, `ultimate` (l'attaque de base n'est pas concernée).
Ton lot : `scripts/spell-design/input-N.json` (liste de personnages : id, nom, rareté, type de jeu, rôle dans l'anime, anime, noms actuels).
Sortie : `scripts/spell-design/output-N.json` = tableau `[{ "id": 1, "orientation": "...", "secondary": S, "tertiary": S, "ultimate": S }, ...]` pour **tous** les personnages du lot, dans l'ordre.
Vérifie avec : `npx tsx scripts/spell-design/validate.ts scripts/spell-design/output-N.json` (corrige jusqu'à 0 erreur). Ne modifie aucun autre fichier.

## Esprit
- Le jeu manque de **stratégie** : trop d'attaques, effets trop faibles. On veut des sorts qui **changent le combat** et des équipes qui se **complètent** (attaque / soutien / tank / contrôle), sans rôle explicite affiché : c'est le contenu des sorts qui fait le rôle. Beaucoup de personnages sont **transversaux** (par exemple un attaquant qui se protège, un soutien qui frappe).
- Chaque sort doit **évoquer le personnage** : vraie technique, objet ou trait de l'œuvre (en français, nom propre de la technique quand elle existe : « Rasengan », « Gomu Gomu no Gatling », pas de « Frappe inspirée de »). Les 3 sorts d'un personnage sont **différents** les uns des autres et racontent son style. Ne copie pas les noms actuels s'ils sont génériques (« X : … — Élan bref », « X — Déchaînement : … »).
- **Répartition cible sur ton lot** (champ `orientation` = ce que le personnage apporte surtout) : `attaque` ≈ 30 %, `soutien` ≈ 25 % (soin, boucliers, bonus d'équipe), `tank` ≈ 13 % (provocation, défense, réduction de dégâts), `controle` ≈ 20 % (silence, poison, malus ennemis), `hybride` ≈ 12 %. **Au plus 35 % des personnages ont leurs trois sorts centrés sur les dégâts.** Chaque personnage a au moins un sort sans dégât principal (utilitaire).
- Respecte la logique de l'œuvre : un guérisseur soigne, un bouclier humain protège, un stratège débilite l'adversaire, un monstre frappe fort.

## Cible des sorts
`target` : `"foe"` (le joueur choisit 1 ennemi ; l'effet scope `"target"` vise lui), `"ally"` (1 allié), `"deadAlly"` (1 allié mort, pour une réanimation), ou `null` (aucun choix : zone, équipe, soi).
Si `target` est `null`, les effets n'utilisent pas le scope `"target"`.

## Effets (JSON) — scopes : `"self"` (lanceur), `"target"` (la cible choisie), `"team"` (équipe du lanceur), `"foes"` (tous les ennemis)
- `{"k":"damage","mult":1.2}` dégâts × ATK sur la cible ; options : `"zone":true` (tous les ennemis, **en même temps**), `"ignoreDef":0.3`, `"pierce":true` (traverse boucliers et esquive), `"drain":0.3` (soin = part des dégâts), `"critSure":true`.
- `{"k":"mod","stat":"atk|def|crit|dodge","amount":0.3,"turns":2,"to":"team"}` bonus (+) ou malus (−). `crit` et `dodge` sont des **points de pourcentage** (0,25 = +25 points de chance, plafonds 100 %) ; `atk` et `def` sont des % de la stat.
- `{"k":"heal","pct":0.2,"to":"team"}` soin en % des PV max ; `{"k":"regen","pct":0.06,"turns":3,"to":"team"}` soin par tour.
- `{"k":"shield","pct":0.15,"to":"team"}` bouclier en % des PV max.
- `{"k":"poison","pct":0.05,"turns":3,"to":"target"}` perd pct des PV max par tour (mortel).
- `{"k":"silence","turns":2,"to":"target"}` ne peut utiliser que l'attaque de base (sans effet sur les boss).
- `{"k":"stun","turns":1,"count":2}` : les deux ennemis vivants à l'ATK la plus élevée passent leur prochain tour. Réservé aux ultimes sans cible manuelle ; 1–2 ennemis, 1–2 tours. Immunité et boss résistent ; la purge le retire. Les recharges, poisons et régénérations continuent pendant un tour passé.
- `{"k":"immune","turns":2,"to":"team"}` immunité aux malus ; `{"k":"purge","to":"team"}` retire les malus.
- `{"k":"revive","pct":0.4}` réanime un allié mort (`target:"deadAlly"`), une fois par combat.
- **Nouveaux** : `{"k":"taunt","turns":2}` (le lanceur seul) : les ennemis ne peuvent viser que lui avec leurs attaques à cible unique pendant `turns` tours ; `{"k":"reduce","pct":0.3,"turns":2,"to":"self|team"}` : dégâts subis −pct.
- Les durées sont en **tours** (un tour = une action de la carte qui porte l'effet).

## Intensité (bandes à respecter : le validateur refuse le hors-bande)
Cooldowns : secondary 5 tours, tertiary 7 tours. L'ultimate se charge en jouant (jauge) : il est **rare et décisif**.
- **Secondaire** (modeste mais lisible) : dégâts 0,8–1,5× cible / 0,5–0,8× zone ; bonus d'équipe : atk +15–20 %, crit +10–15 pts, def +15–25 %, dodge +15–25 pts ; bouclier 8–12 % ; soin 10–15 % ; malus ennemis atk/def −15–25 %, crit −10–15 pts ; poison 4–6 %/tour ; silence 1–2 tours ; taunt 1–2 tours ; reduce 20–30 % 2 tours.
- **Tertiaire** (le sort de **composition** : surtout buff/debuff, peu de dégâts, 0 à 0,8×) : bonus d'équipe atk +25–35 %, crit +15–25 pts, def +25–35 %, dodge +30–50 pts (1–2 tours), bouclier 12–18 %, soin 18–25 % ; malus sur tous les ennemis atk/def −25–35 %, crit −15–25 pts ; taunt 2 tours + reduce 30 % ; silence 2 tours sur 1 cible ou 1 tour sur tous ; poison 6–8 %.
- **Ultime** (game-changer, **net plus fort** que les deux autres) : au choix par personnage — gros dégâts de zone 1,2–2,2× (simultanés) avec effet, ou frappe unique 3,0–5,0× (pierce/critSure possibles), ou **renversement d'équipe** (atk +40–50 % et crit +25–35 pts sur 3 tours ; bouclier 25–30 % + soin 30 % ; réanimation 50–70 % + soin 25 % ; immunité + purge + bouclier ; taunt 3 tours + reduce 50 % + bouclier 20 %), ou **désarmer l'adversaire** (atk −40 % et def −40 % sur tous les ennemis 3 tours, silence 1–2 tours sur tous). Il peut cumuler 2–4 effets.
- 1 à 4 effets par sort. Les valeurs d'un même rôle ne doivent pas être toutes identiques : varie entre les personnages dans la bande.
