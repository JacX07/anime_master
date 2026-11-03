# Guide du joueur — Pew

Scénario du guide intégré au jeu. **Proposition du 2026-11-03, à valider avant de coder.** Le lore est dans [lore.md](../../lore.md).

## 1. Principe

Pew est le guide. Il parle au joueur, lui dit quoi faire ensuite et pourquoi, du point de vue de l'histoire. Bernstein et Alice n'interviennent qu'au prologue et aux grands moments.

- **Ce que le guide fait** : présenter chaque mode au moment où il s'ouvre, montrer le bouton à utiliser, féliciter, et toujours proposer la prochaine étape.
- **Ce qu'il ne fait pas** : bloquer le joueur. Chaque bulle se ferme ; tout le guide peut être coupé dans les paramètres et rejoué depuis les Quêtes. Aucune action n'est obligatoire pour continuer à jouer (fangame gratuit, jamais frustrant).
- **Voix de Pew** : phrases courtes (une ou deux lignes par bulle), tutoiement, concret. Il dit quoi faire, jamais d'où il vient. Ses émotions passent par ses gestes (indiqués entre crochets dans le scénario, rendus par une pose ou une animation).

## 2. Interface *(proposition)*

- **Bulle de Pew** : portrait de Pew en bas à droite (en bas de l'écran sur mobile), texte, boutons « Suivant » et « Plus tard ». Une seule bulle à la fois.
- **Mise en évidence** : le bouton ou la zone concernée est entourée d'un halo doré ; le reste de la page n'est pas assombri (le joueur garde la main).
- **Bouton « Que faire ? »** permanent (icône Pew dans l'en-tête) : rouvre la dernière consigne en cours et l'objectif suivant du carnet de Quêtes.
- **Scènes** (prologue, premier retour, fin d'univers) : fenêtre plein écran, portraits de Bernstein, Alice et Pew, texte en bulles successives, bouton « Passer ».
- Chaque étape vue est mémorisée côté compte (pas dans le navigateur), pour ne pas la rejouer sur un autre appareil.

## 3. Scénario

Les étapes suivent les passages de [aventure.md](aventure.md). Chaque étape a un **déclencheur**, une **page** et des **répliques**.

### Étape 0 — Prologue (première connexion, scène)
*Laboratoire de Bernstein, univers 483, an 1700. Nuit, bougies, l'Araignée de Bernstein immobile au centre.*

> **Bernstein** : Vingt ans qu'on me traite de rêveur. Et ce soir, le ciel se déchire au-dessus de la ville.
> **Alice** : Professeur, l'Araignée s'emballe. Trois signatures étrangères. Non… quatre.
> **Bernstein** : Des êtres d'autres univers. Chaque heure qu'ils passent ici rapproche nos mondes de la collision.
> **Alice** : On ne peut pas aller les chercher nous-mêmes. Il nous faut quelqu'un sur le terrain.
> **Bernstein** *(au joueur)* : C'est vous. Bienvenue parmi nous, Arpenteur.
> *[Une brèche crépite. Une petite silhouette en tombe et roule jusqu'aux pieds du joueur.]*
> **Alice** : … Et ça, c'est quoi ?
> **Pew** : Pew ! Moi, c'est Pew. Je sens les brèches. Je viens avec toi.
> **Bernstein** : Sa signature… non, plus tard. Pew vous montrera comment faire. Le temps presse.

### Étape 1 — Première capture (`/packs`)
*Déclencheur : fin du prologue. Mise en évidence : les bannières de bienvenue.*

> **Pew** : L'Araignée a repéré des égarés. On va les attraper !
> **Pew** : Choisis une bannière : elle règle l'Araignée sur un type de signature. Tu as des tirages offerts.
> *(après le premier tirage)* **Pew** : Capturé ! Il est figé dans une carte, il ne risque rien.
> **Pew** : Un cristal, une capture. L'Araignée en recharge un toutes les deux minutes.

### Étape 2 — Former l'équipe (`/equipe`)
*Déclencheur : le joueur possède au moins 4 cartes. Mise en évidence : les quatre emplacements.*

> **Pew** : Pour aller dans une brèche, il te faut une équipe de quatre.
> **Pew** : Mets tes plus forts. Les types comptent : regarde qui bat qui.
> *(équipe complète)* **Pew** : Bonne équipe ! Direction le premier univers.

### Étape 3 — Premier combat (`/histoire`, One Piece, combat 1)
*Déclencheur : équipe complète. Mise en évidence : le combat 1.*

> **Pew** : Je sens une brèche, là. Un univers de pirates… il y a des égarés partout.
> **Pew** : Gagne les combats pour rétablir leurs signatures. Si tu perds, pas grave : tu peux recommencer autant que tu veux.
> *(victoire)* **Pew** : Pew pew ! Regarde le butin : des fragments de signature et des fruits du démon.
> **Pew** : Plus tu fais d'étoiles sur un combat, plus tu gagnes au palier d'étoiles.

### Étape 4 — Premier éveil (`/eveil`)
*Déclencheur : assez de ressources pour éveiller une carte. Mise en évidence : la carte éveillable.*

> **Pew** : Tu as assez de ressources ! Une signature plus complète, c'est un écho plus fort.
> **Pew** : Éveille une carte : elle gagne une étoile et des stats.

### Étape 5 — Le carnet (`/quetes`)
*Déclencheur : premier niveau d'Arpenteur gagné.*

> **Pew** : Niveau 2 ! Bernstein a noté ça dans ton carnet.
> **Pew** : Le carnet te dit quoi faire ensuite. Si tu es perdu, appuie sur moi, en haut.

### Étape 6 — Expéditions (`/expeditions`)
*Déclencheur : niveau 3 et combat 5 de One Piece gagné.*

> **Pew** : Je sens des petites brèches, partout. Trop pour toutes les fermer nous-mêmes.
> **Pew** : Envoie une à trois cartes les explorer. Elles reviennent quelques heures plus tard avec du butin.
> **Pew** : Pendant ce temps, elles ne peuvent pas combattre. Garde ton équipe principale !

### Étape 7 — Donjons (`/donjons`)
*Déclencheur : niveau 5 et combat 10 de One Piece gagné.*

> **Pew** : Là, un repaire. Un seul boss, très fort, avec ses sbires.
> **Pew** : Il garde des artefacts. Équipe-les sur tes cartes pour les renforcer.

### Étape 8 — Premier retour (scène, fin de One Piece)
*Déclencheur : boss final de One Piece vaincu.*

> **Alice** : Signature complète. Ancre d'origine… stable. On peut le renvoyer.
> **Bernstein** : Faites-le. Il n'a rien à faire ici.
> *[Une lumière. Le boss final disparaît dans la brèche.]*
> *[Pew regarde l'endroit où la brèche s'est refermée. Il ne dit rien pendant un moment.]*
> **Pew** : … Il est rentré chez lui.
> **Alice** : L'album garde son empreinte. Grâce à elle, son écho pourra encore combattre à vos côtés, sans qu'on le retienne loin de chez lui.
> **Pew** : Univers suivant ! Je sens une odeur de ramen.

### Étape 9 — La Tour (`/tour`)
*Déclencheur : niveau 8 et One Piece terminé.*

> **Pew** : Il y a un endroit… une tour. Cinq cents étages. Chaque étage est un univers.
> *[Pew se tasse un peu, les yeux fixés vers le haut.]*
> **Pew** : Je ne sais pas pourquoi, mais je la connais. Monte aussi haut que tu peux.

### Étape 10 — Raid (`/raid`)
*Déclencheur : niveau 12 et deux premiers univers terminés.*

> **Pew** : Une grande brèche ! Quelque chose d'énorme passe à travers.
> **Pew** : Tout le monde peut le frapper. Il lâche des cœurs de brèche : il en faut pour les étoiles 4 et 5.
> **Pew** : Un nouveau boss chaque semaine. Reviens souvent !

### Étape 11 — Premier univers de collision (scène, entrée dans *Le Grand Concert*)
*Déclencheur : premier accès à l'univers 3.*

> **Bernstein** : C'est ce que je craignais. Deux mondes… non, plusieurs, déjà mêlés.
> **Alice** : Si on ne répare pas celui-ci, la collision va s'étendre.
> **Pew** : Plein de signatures différentes au même endroit. Ça me donne le tournis.

### Étape 12 — Doublons, échanges et Bourse (`/trades`, `/market`)
*Déclencheur : premier doublon obtenu.*

> **Pew** : Deux fois le même ? Celui-là vient d'un autre amas. Un autre Arpenteur le cherche peut-être.
> **Pew** : Tu peux l'échanger, ou le mettre à la Bourse des brèches.
> **Pew** : Si tu revends trop cher, on t'appellera « mercenaire ». Pour toujours. Je dis ça, je dis rien.

### Étape 13 — Arène, quand elle sera codée
*Déclencheur : accès à l'arène.*

> **Pew** : D'autres Arpenteurs. Ils chassent les mêmes égarés que toi.
> **Pew** : Ce sont tes rivaux. Montre-leur que tes échos sont les meilleurs.

## 4. Astuces contextuelles

Petites bulles qui s'affichent une seule fois, en dehors du scénario :

| Situation | Réplique de Pew |
|---|---|
| Plus de cristaux | L'Araignée recharge. Va faire un tour dans l'histoire en attendant ! |
| Trois défaites de suite sur le même combat | Essaie d'éveiller tes cartes, ou change l'ordre de ton équipe. |
| Première carte SSR ou UR | Pew ! Une signature très forte ! Garde-la bien. |
| Inventaire de ressources plein pour un éveil | Tu as de quoi éveiller quelqu'un. Va voir l'éveil ! |
| Expédition terminée | Ton équipe d'expédition est rentrée. Viens chercher le butin ! |
| Pas connecté depuis 3 jours ou plus | Tu es revenu ! Les brèches ne se sont pas calmées. |

## 5. Données *(proposition)*

- Le scénario (étapes, déclencheurs, répliques, page, élément mis en évidence) est défini **dans le code**, comme les univers.
- `GuideProgress` : joueur, clé d'étape, date de lecture. Un réglage `guideEnabled` sur le compte.
- Les déclencheurs réutilisent les données existantes (passages d'aventure, progression d'histoire, stock de ressources), sans nouvel état de jeu.

## 6. Questions ouvertes
1. Le prologue au tout début, ou après le premier tirage, pour aller plus vite au jeu ?
2. Pew a-t-il besoin d'une illustration (portrait et quelques poses) ? Qui la fait ?
3. Une scène de fin pour chaque univers, ou seulement pour le premier et les univers de collision ?
4. Garder l'exclamation « Pew ! » au début des répliques, ou la réserver aux moments de joie ?
