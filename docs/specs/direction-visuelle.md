# Direction visuelle — « Citadelle sombre »

Source : maquette Figma Make `JacX07/MaquetteDeJeuTCG` (clonée hors projet). **Remplace** l'ancien style « futuriste » (Michroma, bleus acier, effets 3D). État : **validé le 2026-11-01**, lot 1 codé.

## Principes
- Ambiance **fantasy sobre** : noir charbon chaud, or patiné, bordures fines. Pas de néon, pas de perspective 3D, pas d'effet « hologramme ».
- Hiérarchie par la typographie et l'espacement, pas par la lueur.

## Jetons (à mettre dans `:root` de `globals.css`)
| Rôle | Valeur |
|---|---|
| Fond | `#0b0e0f` + lueur olive `rgba(85,91,63,.13)` en haut à droite + grille diagonale 28 px à 2 % |
| Panneau / panneau relevé | `#111514` / `#171b1a` |
| Bordure / bordure forte | `#252a28` / `#313632` |
| Texte / atténué / très atténué | `#e9e5dc` / `#767b76` / `#626863` |
| Or (accent) | `#c4a76d` ; clair `#d5bb7f` ; sourd `#a68e5d` |
| Éléments (Feu, Nature, Éther, Ombre, Givre) | couleur + symbole propres, repris de la maquette |

Les couleurs de **rareté** (N, R, SR, SSR, UR) restent : c'est de l'information de jeu, pas du décor.

## Typographie
- **Cinzel** (500–700) : logo, titres de page, gros chiffres.
- **DM Sans** : tout le reste de l'interface.
- Retrait de Michroma, Sora et Big Shoulders : tout passe en Cinzel (noms de mondes de l'album compris).
- Sur-titre (`eyebrow`) avant chaque titre de page : 9 px, capitales, espacement .28 em, or sourd.

## Composants
- **Barre du haut** : 78 px, collante, flou d'arrière-plan, onglet actif souligné en or 2 px, blason hexagonal pour le logo.
- **Panneaux** : bordure 1 px, rayon 7 px, en-tête « petit label + titre + compteur ».
- **Boutons** : rayon 4–5 px, bordure fine ; action principale en or.
- **Onglets de section**, **barres de progression fines** (4 px), **filtres en pastilles**.
- **Cartes** : bordure 1 px, dégradé sombre, léger grain, survol = montée de 4 px. Cadre de rareté conservé.
- États vides : symbole `◇` + titre + phrase.

## Hors périmètre / abandonné
- Tout `perspective` / `preserve-3d` (2 occurrences dans `globals.css`) et animations de retournement 3D.
- Dépendance `three` si elle n'est plus utilisée (à vérifier avant retrait).
- **Combat** (`battle.css`, `src/components/battle/`) : en cours de modification par d'autres sessions, restylé en dernier.

## Plan en 3 lots (un commit + vérification navigateur par lot)
1. **Socle** : jetons, polices, fond, barre du haut, boutons, panneaux, onglets. Effet immédiat sur toutes les pages.
2. **Pages principales** : accueil/paquets, album (collection + détail de carte), équipe, inventaire, marché, profil.
3. **Le reste** : quêtes, histoire, tour, raid, donjons, expéditions, duels, puis combat.

## Décisions (2026-11-01)
- **Menu** : ordre de la maquette — Accueil, Collection ▾ (Paquets, Album, Souhaits), Inventaire, Équipe — **Jouer** au centre — Quêtes, Marché ▾, Classement. Sous 1500 px le nom du jeu et « Arpenteur » s'effacent ; sur téléphone la barre passe sur deux lignes (icônes).
- **Rareté sur les cartes** : bordure fine + pastille de rareté, comme la maquette (lot 2, avec l'album). Le cadre épais de 3 px disparaît.
- **Polices** : Cinzel partout pour les titres, DM Sans pour l'interface.

## Avancement
- Lot 1 (socle) : codé — jetons, polices, fond, barre du haut, formulaire de connexion, remplacement des anciens bleus dans `globals.css` et les fichiers hors combat.
- Lot 2 : codé — cartes (bordure fine 1 px, pastille de rareté ronde ; les ornements de cadre SR+ restent), titres de page (Cinzel, plus petits), noms de mondes de l'album, accueil refait sans 3D (succès, paquet dessiné en CSS, bannières, profil en bref, raccourcis vers les modes), couleurs des pages Inventaire, Équipe, Histoire, Quêtes, Tour, Raid, Éveil, Builder.
- Ouverture de paquets 2D : codée (`/packs` : bannières, lots ×5 / ×10, cartes retournées une à une, taux, boutique de cristaux). La scène 3D (`public/pack-opening`, écran de chargement, `three`) est supprimée ; PixiJS reste pour le combat.
- Reste (lot 3) : combat (`battle.css`, aussi utilisé par Histoire : boutons et panneaux encore bleus), Donjons (à reprendre quand la session d'équilibrage des compositions aura fini).

## Questions ouvertes
- Les écrans de la maquette qui n'existent pas encore (profil public, titres) : hors de ce chantier ?
