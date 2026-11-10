# Anime Masters — Spécifications

Jeu de cartes à collectionner de personnages d'anime, inspiré de WikiMasters. Fangame entièrement gratuit. Ces fichiers sont la **source de vérité** : on y valide les règles avant de coder. L'avancement du code est dans [docs/STATE.md](../STATE.md), l'histoire dans [lore.md](../../lore.md).

Les titres « Étape N » d'origine sont gardés dans chaque fichier, pour que les renvois du type « étape 2 §3 » restent valables.

| Fichier | Contenu | Étapes d'origine | État |
|---|---|---|---|
| [general.md](general.md) | Vision, MVP, mise en ligne | MVP, 6 | MVP codé ; mise en ligne à faire |
| [personnages.md](personnages.md) | Import AniList, rareté, finitions, types, stats | 1 | Codé |
| [collection.md](collection.md) | Paquets, cristaux, bannières, pity, album, calendrier | 2, 4 bis | Codé |
| [economie.md](economie.md) | Ryō, échanges, enchères, Bourse des brèches, liste de souhaits | 3 | Codé |
| [combat.md](combat.md) | Combat 4 contre 4, sorts, synergies, journal du combat, éveil, arme légendaire | 4 quater | Moteur pas à pas codé et vérifié, pas branché ; progression en discussion |
| [donjons.md](donjons.md) | Donjons, artefacts (4 emplacements, sets), boss mondial quotidien, arme légendaire | — | Donjons, artefacts et sets codés ; voir aussi le lot 6 |
| [lot-6-donjons-sets.md](lot-6-donjons-sets.md) | Butin progressif, donjons Titans / Demon Slayer / Fairy Tail et protection du Titan | — | Codé et vérifié sur PC/mobile |
| [pvp.md](pvp.md) | Arène, matchmaking, Elo, classements ; ancien duel quiz | 4 | Duel quiz codé, arène à faire |
| [pvm.md](pvm.md) | Histoire, raid, Tour multiverselle, expéditions | 4 ter, 7 | Expéditions codées ; le reste en discussion |
| [social.md](social.md) | Profils, amis, guildes, messagerie, succès | 5 | Succès codés ; social à faire |
| [admin.md](admin.md) | Rôle admin, statistiques (boosters, combats, économie), actions sur les comptes, journal d'audit | — | Validée, rien codé |
| [direction-visuelle.md](direction-visuelle.md) | Historique du restyle « Citadelle sombre » ; la référence est [docs/direction-artistique.md](../direction-artistique.md) | — | Remplacé |
| [guide.md](guide.md) | Guide du joueur : page tutoriel en étapes ; scénario de Pew en attente | — | Page simple codée ; Pew en attente |

## Priorité
1. **Système de combat** : finir les règles ([combat.md](combat.md)), puis le brancher en jeu.
2. Ensuite, à réordonner : mode histoire, éveil, Tour, arène, raid.

## Questions ouvertes
- Montants de l'éveil et de l'arme légendaire, à fixer au simulateur.
- Rythme de progression et tableau des ressources par mode.
- Mode manuel, ultimes, sorts spéciaux des UR.

- [Quêtes et niveau d’Arpenteur](aventure.md) : progression globale, lore et accès aux modes.
