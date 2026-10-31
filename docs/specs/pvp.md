# Anime Masters — PvP

[← Index des specs](README.md)

## Arène (combat 4 contre 4) *(décidé le 2026-10-31)*

> Remplace le duel quiz de l'étape 4 ci-dessous, qui reste codé tant que l'arène ne l'est pas. Le combat lui-même est décrit dans [combat.md](combat.md).

- **Asynchrone** : on affronte l'équipe de défense d'un joueur absent.
- **Matchmaking** : appariement automatique par Elo. Le matchmaking en direct viendra peut-être plus tard.
- **Équipes fantômes** tant que la population est petite : copies d'équipes de joueurs ou équipes de l'ordinateur, classées par tranche d'Elo.
- **Pas de limite de combats** pour le moment. Les gains sont limités : le gain d'Elo baisse contre un adversaire déjà affronté dans les 24 h.
- **Récompenses** : prestige et cosmétiques uniquement, jamais de ressource d'éveil.
- **Défense cachée** jusqu'au début du combat, puis visible dans le replay.
- Elo : repris de l'étape 4 §5 (départ 1 000, K = 32), sauf décision contraire.

---

## Étape 4 — Duels, classements, succès

> **Duels quiz codés, à remplacer** par le combat 4 contre 4 de l'étape 4 quater. Les classements et les succès restent valables.

### Objectif
Donner une utilité de jeu aux cartes : duels quiz utilisant les stats et les types, classements, succès.

### Décisions validées
- Duel **asynchrone** : équipe et ordre d'attaque choisis à l'avance, quiz joués chacun de son côté, combat résolu par le serveur puis rejoué.
- **Carte mystère** : pendant le quiz, seuls le type, la rareté et l'ATK de la carte attaquante sont visibles.
- 4 questions à 4 choix, 15 secondes par question (Mystère : 5 choix, 10 secondes).
- Match nul possible.
- Récompenses : victoire 30 / nul 15 / défaite 10 Ryō. 5 duels lancés par jour maximum ; 2 duels récompensés par jour maximum contre un même adversaire.
- Classements : Elo (duels) et Collection.

---

### 1. Déroulement d'un duel
1. **Défi** : A défie B par son pseudo et choisit 3 cartes et leur ordre d'attaque. Une même carte ne peut pas apparaître deux fois ; deux cartes du même personnage sont autorisées.
2. **Acceptation** (délai 24 h) : B accepte et choisit ses 3 cartes et leur ordre, ou refuse.
3. **Défense** (délai 48 h après l'acceptation) : chaque joueur répond aux quiz sur les 3 cartes adverses, dans l'ordre d'attaque adverse. Une session commencée doit être terminée (une question non répondue à temps compte comme une erreur).
4. **Résolution** : quand les deux défenses sont terminées, le serveur calcule le combat en alternant A1, B1, A2, B2, A3, B3 (le challenger attaque en premier).
5. **Replay** : affichage tour par tour du combat calculé.

**Forfait** : un joueur qui n'a pas terminé sa défense dans les 48 h perd. Si aucun des deux n'a joué, le duel expire sans résultat ni récompense.

**Instantané** : au choix de l'équipe, `characterId`, type, ATK et DEF de chaque carte sont copiés dans le duel. Les cartes restent libres (vente, échange) et une mise à jour de rareté n'affecte pas un duel en cours.

### 2. Quiz
- **Carte mystère** : le défenseur voit le type, la rareté et l'ATK ; le personnage est révélé à la fin du quiz de cette carte.
- 4 questions, 4 choix (5 pour Mystère), 15 s par question (10 s pour Mystère).
- Questions générées à partir des données de l'étape 1, sans LLM, au moment où le défenseur commence sa session :

| # | Question | Bonne réponse | Fausses réponses |
|---|---|---|---|
| 1 | Image du personnage : « Qui est-ce ? » | son nom | noms de personnages de la même série en priorité, sinon de séries aux genres proches |
| 2 | « De quel anime vient ce personnage ? » | sa série principale | séries de genres et d'année proches |
| 3 | Tirée au hasard parmi celles possibles : rôle (principal / secondaire), anniversaire, « lequel de ces personnages est dans la même série ? » | selon le type | selon le type |
| 4 | Sur la série principale : studio ou année de diffusion | studio ou année | studios ou années proches |

- Une question impossible faute de données (pas d'anniversaire, pas de studio…) est remplacée par une autre question possible.
- Ordre des choix mélangé.

**Anti-triche**
- Questions envoyées une par une ; la bonne réponse n'est jamais envoyée au navigateur avant la réponse du joueur.
- Le chrono est vérifié côté serveur (`servedAt` / `answeredAt`, avec une petite tolérance réseau).
- Une question ne peut recevoir qu'une seule réponse.

### 3. Calcul du combat
Appliqué dans cet ordre, à partir des stats de l'instantané :

1. **Modificateurs de type**
   | Type | Modificateur |
   |---|---|
   | 🔥 Combat | DEF × 0,75 |
   | 🔮 Mystère | ATK × 0,75 |
   | ✨ Magie | ATK × 0,85 |
   | 💗 Cœur | ATK × 0,70 ; DEF × 1,3 |
   | 🧭 Aventure | aucun |
2. **Bonus Cœur** : chaque carte Cœur donne +10 % d'ATK aux autres cartes de son équipe (bonus additifs, +20 % maximum pour une carte).
3. **PV de l'équipe** = somme des DEF modifiées (= PV maximum).
4. **Dégâts d'une attaque** = ATK × (erreurs / nombre de questions)
   - 🔥 Combat : ×2 si toutes les réponses sont fausses.
   - 🧭 Aventure : dégâts bornés entre 25 % et 75 % de l'ATK.
   - ✨ Magie : l'attaquant récupère 30 % des dégâts infligés, sans dépasser ses PV maximum.
   - Dégâts arrondis à l'entier ; PV jamais sous 0.
5. **Fin**
   - Une équipe à 0 PV perd immédiatement (les attaques suivantes n'ont pas lieu).
   - Sinon, après les 6 attaques : victoire au plus haut pourcentage de PV restants (PV / PV maximum).
   - Égalité de pourcentage : match nul.

Les chiffres sont indicatifs et seront équilibrés après des tests.

### 4. Récompenses et limites
| Résultat | Ryō |
|---|---|
| Victoire | 30 |
| Nul | 15 |
| Défaite | 10 |
| Forfait | 0 pour le perdant, 30 pour le gagnant |

- 5 duels **lancés** par jour maximum par joueur.
- 2 duels récompensés par jour maximum contre un même adversaire (au-delà, le duel compte pour l'Elo mais ne rapporte rien).
- Duels réservés aux comptes de plus de 24 h ayant ouvert au moins 20 paquets (comme les échanges).

### 5. Classements
- **Duel (Elo)** : départ à 1 000, facteur K = 32. Calcul standard (`attendu = 1 / (1 + 10^((eloAdverse − elo) / 400))`, nul = 0,5). Forfait compté comme une défaite. Pas de variation d'Elo pour un duel expiré.
- **Collection** : somme sur les personnages **uniques** possédés : N 1 / R 3 / SR 10 / SSR 40 / UR 200 (rareté actuelle), plus 50 % de cette valeur si le joueur possède la version Holo et 100 % s'il possède la version Gold.
- Affichage : top 100 et position du joueur. *(Plus tard : saisons mensuelles.)*

### 6. Succès
Déplacés dans [social.md](social.md) (« Succès »).

### 7. Modèle de données (ajouts)
- **User** : `elo` (1 000), `duelsStartedToday`, `duelsStartedDate`
- **Duel** : `id`, `challengerId`, `opponentId`, `status` (PENDING / ACCEPTED / DONE / DECLINED / EXPIRED / FORFEIT), `createdAt`, `acceptDeadline`, `playDeadline`, `winnerId` (null si nul), `result` (JSON du combat pour le replay), `eloChangeChallenger`, `eloChangeOpponent`, `rewarded`
- **DuelSlot** : `duelId`, `userId`, `position` (1–3), `cardId`, instantané `characterId`, `type`, `attack`, `defense`
- **DuelDefense** : `duelId`, `userId`, `startedAt`, `finishedAt`
- **DuelQuestion** : `id`, `duelId`, `defenderId`, `slotPosition`, `index`, `kind`, `prompt` (JSON), `choices` (JSON), `correctIndex`, `servedAt`, `answeredAt`, `answerIndex`
- **UserAchievement** : `userId`, `key`, `unlockedAt` (unique sur `userId` + `key`)
- **CurrencyLedger.reason** : ajout de DUEL_REWARD, ACHIEVEMENT

### 8. Pages
| Page | Contenu |
|---|---|
| `/duels` | Défis reçus et envoyés, duels à jouer, historique, duels restants aujourd'hui |
| `/duels/new?to=pseudo` | Choix de l'équipe et de l'ordre |
| `/duels/[id]` | Choix de l'équipe (si défié), session de défense, puis replay |
| `/leaderboard` | Classements Duel et Collection |
| `/achievements` | Succès débloqués et à débloquer |

### 9. Critères pour dire que l'étape 4 est finie
- [ ] Un duel se joue de bout en bout en asynchrone, avec délais, forfait et expiration.
- [ ] La bonne réponse n'est jamais envoyée avant la réponse du joueur ; le chrono est vérifié côté serveur.
- [ ] Les effets des 5 types et le bonus Cœur sont couverts par des tests sur des combats calculés à la main.
- [ ] Le replay correspond exactement au combat calculé.
- [ ] L'Elo, les récompenses et les limites (5 par jour, 2 récompensés par adversaire) sont respectés.
- [ ] Chaque succès ne se débloque qu'une fois et crédite les Ryō.
