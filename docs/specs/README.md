# Anime Masters — Spécifications

Jeu de cartes à collectionner de personnages d'anime, inspiré de WikiMasters. Fangame entièrement gratuit. Ces fichiers sont la **source de vérité** : on y valide les règles avant de coder. L'avancement du code est dans [docs/STATE.md](../STATE.md), l'histoire dans [lore.md](../../lore.md).

Les titres « Étape N » d'origine sont gardés dans chaque fichier, pour que les renvois du type « étape 2 §3 » restent valables.

| Fichier | Contenu | Étapes d'origine | État |
|---|---|---|---|
| [general.md](general.md) | Vision, MVP, mise en ligne | MVP, 6 | MVP codé ; mise en ligne à faire |
| [personnages.md](personnages.md) | Import AniList, rareté, finitions, types, stats | 1 | Codé |
| [collection.md](collection.md) | Paquets, cristaux, bannières, pity, album, calendrier | 2, 4 bis | Codé |
| [economie.md](economie.md) | Ryō, échanges, enchères, Bourse des brèches, liste de souhaits | 3 | Codé |
| [combat.md](combat.md) | Combat 4 contre 4, sorts, synergies, éveil, arme légendaire | 4 quater | Moteur codé et simulé, pas branché ; progression en discussion |
| [pvp.md](pvp.md) | Arène, matchmaking, Elo, classements ; ancien duel quiz | 4 | Duel quiz codé, arène à faire |
| [pvm.md](pvm.md) | Histoire, raid, Tour multiverselle, expéditions | 4 ter, 7 | Expéditions codées ; le reste en discussion |
| [social.md](social.md) | Profils, amis, guildes, messagerie, succès | 5 | Succès codés ; social à faire |

## Priorité
1. **Système de combat** : finir les règles ([combat.md](combat.md)), puis le brancher en jeu.
2. Ensuite, à réordonner : mode histoire, éveil, Tour, arène, raid.

## Questions ouvertes
- Budget d'équipe (plus tard).
- Montants de l'éveil et de l'arme légendaire, à fixer au simulateur.
- Rythme de progression et tableau des ressources par mode.
- Mode manuel, ultimes, sorts spéciaux des UR.
