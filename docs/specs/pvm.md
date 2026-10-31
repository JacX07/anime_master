# Anime Masters — PvM

[← Index des specs](README.md)

## Vue d'ensemble *(décidé le 2026-10-31)*

> Idées validées dans leur principe, à réordonner et détailler. Tous les modes utilisent le moteur de [combat.md](combat.md).

Une ressource, une source : chaque mode a un rôle propre.

| Mode | Ce qu'on y vient chercher |
|---|---|
| Histoire | Découverte des univers ; ressource d'éveil courante (étoiles 1 à 3) |
| Raid | La ressource rare de l'éveil (étoiles 4 et 5), seule source |
| Tour multiverselle | Maîtrise et **classement**, sans gain de puissance |
| Expéditions | Cristaux spéciaux |

### Mode histoire
Détaillé dans la section « Mode histoire » ci-dessous.

### Raid
- Des **boss** qui droppent la ressource **rare** de l'éveil.
- D'abord en solo. À terme, peut-être du multijoueur ; première étape possible : un boss d'événement à PV partagés entre tous les joueurs, avec un classement des contributions.

### Tour multiverselle
- Décrite à l'étape 7 ci-dessous (écrite pour l'ancien combat 3 cartes, à aligner sur le 4 contre 4).
- Avec un **classement**.

---

## Mode histoire *(discuté le 2026-10-31, rien n'est codé)*

> Les chiffres marqués *(simulateur)* sont à fixer avec `scripts/simulate-battle.ts`. Tout le reste est décidé.

### Principe
- Un **univers** = un lieu à visiter, avec **3 actes de 5 combats**. Le 5ᵉ combat de chaque acte est un **boss d'acte** ; celui de l'acte 3 est le **boss final**. 15 combats par univers, débloqués l'un après l'autre.
- Le joueur combat avec son **équipe d'attaque** ([combat.md](combat.md) §10), en manuel ou en automatique. **Une défaite n'a aucune pénalité.**
- Pas d'énergie, pas de limite de tentatives (voir « Rejouer et farmer »).

### Deux sortes d'univers
| Sorte | Contenu | Pour qui |
|---|---|---|
| **Univers d'anime** | Les personnages de cet anime, déréglés par l'anomalie : leur signature est brouillée et ils attaquent. Boss final = le SSR ou UR le plus populaire de l'anime. | Les gros anime (assez de personnages, dont des SSR ou UR) |
| **Univers de collision** | Plusieurs univers qui se sont percutés : on y croise des personnages de plein d'anime. Nom et thème propres (lore des brèches). | Les anime plus petits, qui sans cela n'auraient jamais d'univers ni de ressource |

- Repères (base de personnages) : 155 anime ont au moins 8 personnages, 76 d'entre eux ont un SSR ou un UR, 25 ont au moins 20 personnages.
- **Lancement : 3 univers d'anime choisis à la main** (One Piece, Jujutsu Kaisen, Naruto, validés), puis des univers de collision et d'autres anime au fil du temps.
- **Le premier univers sert de tutoriel** et débloque tous les autres, qui sont alors ouverts avec leur difficulté affichée.

### Ennemis
- Les ennemis **gardent leurs sorts** (rôle par type, [combat.md](combat.md)) mais **pas leurs stats d'origine** : leurs stats viennent du **niveau du combat**, sinon un anime sans SR serait trop facile et un anime plein d'UR impossible.
- **Niveau de combat** : un nombre fixé par combat (1 à 15 dans un univers, plus pour les univers difficiles). Il donne les stats de l'ennemi : **moyenne de sa rareté × échelle du niveau**, l'échelle montant de 0,3 (niveau 1) à 1,0 (niveau 15) en ligne droite. Valeurs validées le 2026-10-31 avec `npm run simulate:story`. **Les joueurs n'ont pas de niveau** : leur progression reste la rareté, les étoiles et l'arme.
- **Difficulté progressive, pas par paliers** : le joueur garde la même équipe principale, il ne doit pas écraser l'acte 1 puis l'acte 2 d'un coup. Chaque combat mélange des raretés qui montent peu à peu (un combat de début : surtout N et R ; milieu : SR, un SSR ; fin : SSR, un UR en boss final). La rareté de l'ennemi sert à son apparence et à son niveau.
- **Boss** : carte **plus grande**, **barre de PV plus large**, bonus de **×1,25** sur l'ATK, la DEF et donc les PV (validé). Les autres ennemis sont des **sbires** : cartes plus petites. L'équipe adverse reste de 4 cartes (1 boss + 3 sbires) pour garder le moteur 4 contre 4 ; les actes plus tardifs peuvent avoir 2 boss.
- **Mélange de raretés par combat** (le boss est la 4ᵉ carte aux combats 5, 10 et 15) : 1–3 : N, N, N, R puis N, N, R, R puis N, R, R, R · 4–5 : R, R, R, SR puis R, R, SR, SR · 6–7 : R, SR, SR, SR · 8 : SR, SR, SR, SSR · 9 : SR, SR, SSR, SSR · 10–11 : SR, SSR, SSR, SSR · 12–13 : SSR ×4 · 14–15 : SSR, SSR, SSR, UR.
- **Repères mesurés** (victoire en auto) : 4 R → jusqu'au combat 7 ; 4 SR → jusqu'au 9 (le boss du 10 est le premier mur) ; 4 SSR → jusqu'au 13, boss final 6 % ; 4 SSR 5★ avec arme → boss final 61 % ; 1 UR + 3 SSR 5★ → 91 % ; 4 UR → 95 %. **Un boss final difficile est voulu** (validé) : il pousse à éveiller et à farmer.
- Chaque combat affiche une **puissance conseillée**.

### Ressources d'éveil
- **Chaque univers a sa ressource**, tirée de l'anime pour le côté « waouh » (le fruit du démon pour One Piece, etc.). Univers de départ *(noms proposés le 2026-10-31, modifiables)* :

| Univers | Ressource d'éveil | Ressource d'arme légendaire (boss finaux) |
|---|---|---|
| One Piece | Fruit du démon | Kairoseki |
| Naruto | Parchemin de jutsu | Métal à chakra |
| Jujutsu Kaisen | Doigt maudit | Outil maudit |

- Les univers de collision auront les leurs, à nommer quand on les écrira.
- **Une ressource commune** existe aussi : le **fragment de signature** (nom du lore : une signature complète est nécessaire au retour d'un personnage). Elle est la seule dont disposent les personnages des anime **sans univers**.
- Dans un univers d'anime, les drops sont à **50 % ressource de l'univers, 50 % ressource commune** *(à équilibrer)*.
- Éveiller un personnage coûte de la ressource commune et, s'il vient d'un univers, un peu de la ressource de cet univers. **Plus la rareté est haute, plus le coût est élevé** : un UR demande plus qu'un SSR.
- Les étoiles 4 et 5 demandent en plus la ressource rare du raid (voir « Raid »).
- Les ressources de **fabrication des armes légendaires** tombent aussi ici (boss finaux surtout) ; recettes à écrire plus tard.

### Récompenses
- **Premier passage** d'un combat : Ryō, cristaux et ressources. Le **boss final** donne un gros bonus.
- **Rejouer** un combat gagné rapporte encore des ressources, en plus petite quantité.

### Rejouer et farmer
- **Aucune limite de combats**, aucun coût : on peut rejouer un combat autant de fois qu'on veut, en manuel ou en auto, pour obtenir la ressource voulue.
- **Lancer N combats automatiques d'affilée** (par exemple 10) sur un combat déjà gagné : le serveur calcule chaque combat avec l'équipe d'attaque et verse le butin. Chaque combat reste enregistré et rejouable.
- **Garde-fou** : sans limite, tout le monde finirait à 5 étoiles très vite. Les gains des combats **rejoués** sont donc limités par un **plafond quotidien qui ne ferme jamais la porte** : au-delà, les drops continuent mais à taux réduit *(simulateur)*. Le premier passage n'est jamais plafonné.

### Histoire racontée
- Seuls les personnages du labo parlent (Dr Hakase, Akari, Pew), quelques lignes au début et à la fin de chaque acte. Les personnages d'anime ne parlent jamais.
- Un boss final vaincu : sa signature est rétablie, et Pew réagit à son départ (direction de caractérisation dans `lore.md`).

### À écrire / à décider
- Liste des univers de collision (thèmes, noms, quels anime) et de leurs ressources.
- Tables de niveau, de coûts d'éveil et de drops : à la charge de Claude, qui les propose et les valide au simulateur avant de les présenter.
- Modèle de données : `StoryProgress` (joueur, univers, combat atteint), définitions des univers dans le code, `Battle.mode = STORY` déjà prévu.
- Moteur : bonus de stats et de PV du boss, équipe adverse construite par niveau (aujourd'hui `PVM_OPPONENTS`).

---

## Étape 4 ter — Expéditions dans les brèches

> **Statut : phase 1 (cristaux, lots) et phase 2 (bannières, cristaux spéciaux, cadeau de bienvenue) codées le 2026-10-12.** Les décisions de principe sont validées ; les chiffres marqués *(à équilibrer)* sont des valeurs de départ à tester.

### Objectif
Donner une utilité de jeu aux cartes en dehors des duels : envoyer une équipe explorer une brèche pendant quelques heures, et revenir chercher le butin. Les expéditions sont la source de **cristaux spéciaux** (et un petit revenu en Ryō et en cristaux).

### Décisions validées
- **Mode idle seul** pour l'instant : on envoie, on revient plus tard. Pas de boss ni de combat interactif (idée repoussée : boss de brèche en quiz, réutilisant `duel-quiz.ts`).
- **3 durées**, thèmes de brèche, **1 emplacement au début, 3 après quelques succès**.
- **Gratuit** : aucun coût d'entrée ; les emplacements sont le seul frein.
- Récompenses **qui augmentent avec la puissance de l'équipe** (§3) : **Ryō (plus faible que la vente rapide, pour ne pas concurrencer le marché)**, un peu de cristaux normaux, et des **cristaux spéciaux qui tombent de temps en temps**, sans boss. Plafond de 10 cristaux spéciaux par semaine (déjà décidé, Étape 4 bis §6).
- **Échec sans pénalité** : aucune blessure ni temps de repos ; les cartes reviennent, le butin est réduit.
- **Capture d'un personnage précis** : « on verra » (hors périmètre).

---

### 1. Brèches
Définies **dans le code** (comme les succès), pas en base : `id`, `name`, `lore`, `durationH`, `favoredTypes`, `threshold` (puissance requise) et table de récompenses.

| Niveau | Durée | Seuil de puissance *(à équilibrer)* | Types favorisés |
|---|---|---|---|
| Faille | 1 h | faible | 1 type |
| Brèche | 6 h | moyen | 2 types |
| Gouffre | 24 h | élevé | 2 types |

Chaque niveau a plusieurs brèches thématiques (nom, lore, types favorisés différents) pour varier ; liste initiale à écrire avec la direction du lore. Les noms ci-dessus sont des placeholders.

### 2. Équipe et emplacements
- Une expédition = **1 à 3 cartes** du joueur (cartes distinctes ; deux cartes du même personnage autorisées).
- Les cartes envoyées sont **bloquées** (`Card.inExpedition`) : ni vente, ni échange, ni enchère, ni nouvelle expédition. Elles restent utilisables en duel (le duel copie leurs stats).
- **Emplacements** : 1 au début ; un 2ᵉ puis un 3ᵉ se débloquent avec des succès d'expédition *(seuils à équilibrer, par exemple 5 et 20 expéditions terminées)*.
- Pas de limite par jour : le temps et les emplacements suffisent.

### 3. Résolution
Calculée par le serveur **au retour**, à partir d'une `seed` tirée et enregistrée **au lancement** (recharger la page ne change pas le résultat).

```
score(carte) = puissance × affinité        (type favorisé ×1,25 ; autre type ×1,0)
score(équipe) = Σ score(carte) × aléa      (aléa dans [0,7 ; 1,3] fixé par la seed, élargi le 2026-10-17)
ratio = score(équipe) / seuil de la brèche
```
| Résultat | Condition | Butin |
|---|---|---|
| Échec | ratio < 1 | 25 % des Ryō, rien d'autre |
| Réussite | 1 ≤ ratio < 1,5 | butin de base (§4) |
| Triomphe | ratio ≥ 1,5 | butin de base, avec le bonus de puissance (ci-dessous) |

**Bonus de puissance** *(validé : plus l'équipe est puissante, plus les ressources rares sont probables)* : pour une réussite ou un triomphe, on pose `m = clamp(ratio, 1, 3)`.
- **Ryō** : × `1 + 0,25 × (m − 1)` (jusqu'à ×1,5).
- **Cristaux normaux** : la quantité de base, plus 1 cristal supplémentaire avec une probabilité de `(m − 1) / 2`.
- **Cristal spécial** : probabilité de base × `m` (jusqu'à ×3), toujours dans le plafond de 10 par semaine.
- Une équipe très au-dessus du seuil ne rapporte donc pas des quantités illimitées : les multiplicateurs sont bornés, et les plafonds quotidiens et hebdomadaires restent valables.

*(Coefficients à équilibrer par simulation.)*

### 4. Récompenses *(à équilibrer)*
| Brèche | Ryō (réussite) | Cristaux normaux | Chance de cristal spécial |
|---|---|---|---|
| Faille (1 h) | 10 | 0 | 0 % |
| Brèche (6 h) | 60 | 1 | 5 % |
| Gouffre (24 h) | 250 | 3 | 20 % |

- Repères : le bonus quotidien rapporte 50 Ryō, une UR se vend 200 Ryō. Un joueur à 3 emplacements ne doit pas dépasser environ **600 Ryō par jour** d'expéditions.
- Cristaux normaux gagnés par expédition : plafond **10 par jour**.
- Cristal spécial : 1 par tirage réussi, **plafond de 10 par semaine** (semaine commençant le lundi, heure du serveur).
- Journal : nouvelles raisons `EXPEDITION` (Ryō) ; les cristaux ont leur propre journal (Étape 4 bis).

### 5. Déroulement
1. `/expeditions` : choix d'une brèche, de 1 à 3 cartes, lancement. Le résultat n'est pas affiché.
2. À la fin du temps, l'expédition passe à « terminée » (balayage paresseux à chaque consultation, comme `sweepDuels`, et `POST /api/expeditions/close` pour la production). Une notification `EXPEDITION_DONE` est envoyée.
3. Le joueur **récupère le butin** par un bouton ; le résultat s'affiche alors (échec / réussite / triomphe, gains). Une expédition non récupérée reste en attente : elle occupe l'emplacement mais ne perd rien.
4. Le passage « terminée » → « récupérée » est un **passage conditionnel** (une seule récupération, même en cas de double clic) et crédite Ryō, cristaux et cristal spécial dans la même transaction, avec le journal.

### 6. Succès liés
Nouveaux succès *(à définir et équilibrer)* : première expédition, 5 et 20 expéditions terminées (qui débloquent les emplacements 2 et 3), premier triomphe, premier cristal spécial.

### 7. Modèle de données (ajouts)
- **Expedition** : `id`, `userId`, `breachId`, `startedAt`, `endsAt`, `seed`, `status` (RUNNING / DONE / CLAIMED), `outcome` (FAIL / SUCCESS / TRIUMPH, une fois calculé), `rewards` (JSON), `claimedAt`.
- **ExpeditionCard** : `expeditionId`, `cardId`, instantané `characterId`, `type`, `power`.
- **Card** : ajout de `inExpedition`.
- **User** : ajout de `expeditionsDone` (pour les emplacements et succès).
- **CurrencyLedger.reason** : ajout de `EXPEDITION`.

### 8. Pages
| Page | Contenu |
|---|---|
| `/expeditions` | Emplacements, expéditions en cours avec compte à rebours, à récupérer, historique, formulaire de lancement |
| Accueil / menu | Entrée « Expéditions » avec le nombre à récupérer |

### 8 bis. Réalisation (2026-10-13)
- Brèches : 2 par niveau, seuils de puissance **650** (Faille 1 h), **6 000** (Brèche 6 h), **24 000** (Gouffre 24 h) ; Ryō **10 / 70 / 200** (équilibrage validé le 2026-10-17 par simulation : 3 N réussissent une Faille environ 2 fois sur 3, 1 SR + 2 R une Brèche ~9 fois sur 10, 1 SSR + 2 SR un Gouffre de ~60 % à presque toujours selon les types favorisés ; aléa ±30 % pour garder du suspense près du seuil) ; plafond de **600 Ryō et 10 cristaux par jour** appliqué à la récupération.
- La page `/expeditions` montre une estimation (puissance de l'équipe contre le seuil). Un lien verrouillé vers `/tour` y figure (voir Étape 7, « Préparation v1 »). Dans la scène des paquets, une brèche cliquable à gauche mène à la page.

### 9. Critères pour dire que l'étape 4 ter est finie
- [ ] Une carte en expédition ne peut ni être vendue, ni échangée, ni mise aux enchères, ni envoyée dans une autre expédition.
- [ ] Le résultat est identique quel que soit le nombre de rechargements (seed enregistrée) ; récupérer deux fois ne paie qu'une fois.
- [ ] Le plafond de 10 cristaux spéciaux par semaine et de 10 cristaux normaux par jour est respecté, même avec des récupérations simultanées.
- [ ] Un joueur à 3 emplacements reste sous ~600 Ryō par jour (vérifié par simulation).
- [ ] L'échec rend les cartes sans pénalité et paie 25 % des Ryō.

---

## Étape 7 — Après le MVP : la Tour

> **Statut : idée validée le 2026-10-12, rien n'est codé.** Elle vient d'un conseil (5 avis + relecture croisée) et d'une discussion. L'histoire est dans `lore.md`. Les chiffres marqués *(à équilibrer)* sont des valeurs de départ à tester avec un script de simulation.

### Objectif
Donner aux cartes un but de progression qui ne dépend pas de la chance des tirages : un mode PvE où le joueur compose son équipe face à un boss connu d'avance.

### Décisions validées
- **La Tour remplace les brèches aléatoires de rang D à S** (qui refaisaient les expéditions). Les rangs sont gardés, répartis par tranches d'étages.
- **La Puissance ne sert pas de PV** (elle va de 100 à 104 000 et mesure la popularité). Elle est renommée **« Popularité »** dans l'interface ; le champ `Character.power` ne change pas. Les expéditions continuent de l'utiliser.
- **Les combats réutilisent la logique des duels** (ATK, DEF, modificateurs de type), sans quiz.
- **Pas de stats brutes ajoutées par des artefacts** : un N équipé ne doit jamais battre un UR nu.
- **Pas de 500 boss faits à la main** : étages générés, environ 10 jalons écrits à la main pour la v1.
- **Récompenses au premier passage seulement**, avec un budget fermé.
- **Sorts génériques** : pas de sort écrit personnage par personnage au début.
- **La v1 couvre les étages 1 à 50.**

---

### 0. Préparation v1 (faite le 2026-10-13)
- Page `/tour` d'attente (accès scellé, lore, aucune mécanique), liée depuis `/expeditions` comme brèche verrouillée « Univers 0 ». Elle ne bloque pas les expéditions et ne crée aucune table.
- Les expéditions utilisent déjà `Character.power` (futur « Popularité ») : le renommage ne touche que l'interface.

### 1. Structure
- La Tour est le méta-univers 0 : 500 étages, un univers par étage.
- Rangs : étages 1–100 = D, 101–200 = C, 201–300 = B, 301–400 = A, 401–499 = S, étage 500 = SS.
- Chaque étage est **identique pour tous les joueurs** (graine fixée par le numéro d'étage).
- **Étage normal** : 3 ennemis tirés du pool de personnages avec cette graine, stats multipliées par `1 + étage / 100` *(à équilibrer)*.
- **Jalon** (tous les 10 étages) : un boss nommé, choisi à la main, avec une ligne de lore et un **trait** visible. 10 jalons pour la v1, 50 à terme.
- L'étage 500 reste verrouillé tant que le mystère du lore n'est pas tranché.

### 2. Combat
- Équipe de **3 cartes** du joueur ; les cartes ne sont pas bloquées (comme en duel, leurs stats sont copiées).
- PV de l'équipe = somme des DEF modifiées, comme en duel. Les modificateurs de type des duels s'appliquent.
- Le combat est **résolu par le serveur**, rejouable grâce à la graine. Il se joue en tours, chaque carte agissant à son tour.
- Le boss est **révélé avant le combat** : type, PV, trait. Le joueur choisit son équipe en conséquence. C'est sa décision.
- Exemples de traits *(à écrire)* : « résiste à Magie », « frappe en premier », « ignore 30 % de la DEF ».
- **3 tentatives par jour** *(à équilibrer)*. Une défaite consomme une tentative, sans autre pénalité.

### 3. Sorts
Chaque carte possède, dans le combat de la Tour :
1. **Sort d'attaque** : un coup dont les dégâts suivent l'ATK. Disponible à chaque tour.
2. **Sort spécial de type** : un effet propre au type de la carte (5 types, donc 5 sorts), avec un **cooldown** en tours.
3. **Sort de personnage** (SSR et UR seulement) : un sort spécial avec cooldown. Il est **générique** au début, déduit du type et du rôle (principal / secondaire) du personnage. Quelques sorts écrits à la main pourront être ajoutés plus tard pour des personnages populaires.

Effets du sort de type *(à écrire et équilibrer)* : pistes à valider, une par type (Combat, Mystère, Magie, Cœur, Aventure), en cohérence avec les atouts et défauts déjà définis pour les duels.

### 4. Récompenses *(à équilibrer)*
Uniquement au **premier passage** d'un étage :
| Étage | Récompense |
|---|---|
| Normal | `10 + étage / 5` Ryō |
| Tous les 10 | 5 cristaux et la **carte du boss du jalon** (une fois) |
| Tous les 50 | 1 cristal spécial (dans le plafond hebdomadaire de 10) et un titre |

- Avec 3 tentatives par jour, finir les 500 étages prend au moins environ 170 jours. Le total de Ryō reste sous environ 20 000, étalé sur des mois.
- La carte offerte au premier passage d'un jalon vient du lore de la capture ; au plus 50 cartes par joueur, à vie.

### 5. Artefacts (phase 2)
Après la v1, si les joueurs reviennent :
- **Effets latéraux seulement** : changer le type de dégât, +1 tentative, modifier un cooldown, cosmétique. Jamais de stats brutes.
- Liés au compte, non échangeables, pour ne pas créer de second marché.
- Raretés, sources et emplacements : à spécifier dans une étape à part.

### 6. Pew
Compagnon-guide, **hors combat**. Il peut signaler des pistes (par exemple l'étage ou le jalon à regarder), sans résoudre l'enquête à la place du joueur. Son histoire est dans `lore.md`.

### 7. Classement
Classement « **étage maximum atteint** », en cas d'égalité le joueur arrivé le premier.

### 8. Modèle de données (ajouts)
- **TowerProgress** : `userId`, `maxFloor`, `updatedAt`
- **TowerAttempt** : `id`, `userId`, `floor`, `team` (JSON, instantané), `result` (JSON du combat pour le replay), `won`, `createdAt`
- **TowerFloorClaim** : `userId`, `floor`, `claimedAt` (une récompense par étage, passage conditionnel)
- **TowerBoss** : définitions dans le code (jalons : personnage, trait, lore)

### 9. Critères pour dire que l'étape 7 est finie
- [ ] `scripts/simulate-tower.ts` affiche le taux de victoire par étage pour trois équipes types : l'équipe R bloque vers les étages 40–60, l'équipe SSR vers 200–300, l'équipe UR doit avoir le bon type et éviter le trait du boss pour passer l'étage 400.
- [ ] Les étages sont les mêmes pour tous les joueurs et le replay correspond au combat calculé.
- [ ] Les récompenses ne sont versées qu'une fois par étage, même en cas de double clic.
- [ ] Les 3 tentatives par jour sont comptées côté serveur.
- [ ] La stat « Puissance » est renommée « Popularité » dans l'interface.

### 10. Questions ouvertes
- Effets exacts des 5 sorts de type et des sorts génériques SSR / UR.
- Liste des 10 premiers jalons et leurs traits (AniList n'indique pas qui est un méchant : choix à la main).
- Durée d'un combat : une habitude quotidienne ou une corvée ?
- Cause du dérèglement, origine de Pew, nature de l'étage 500 (voir `lore.md`).
