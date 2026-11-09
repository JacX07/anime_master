# Direction artistique — « Citadelle sombre »

**Source de vérité unique du style d'Anima Clash.** Elle prime sur toute autre indication (anciens fichiers, maquettes, habitudes). Tout agent la lit avant de faire une maquette ou du code visuel, et y reporte chaque décision visuelle que l'utilisateur valide, dans le même commit.

Ce fichier décrit le site **tel qu'il est codé** (`src/app/globals.css`, `maquette.css`, `reference.css`, `controls.css`). Référence d'origine : maquette `JacX07/MaquetteDeJeuTCG` (`src/index.css`, `src/App.tsx`) : reprendre ses composants et mesures plutôt que la réinterpréter.

---

## 1. Principes
- **Fantasy sobre** : noir charbon chaud, or patiné. Pas de néon, pas de 3D (`perspective`, retournements), pas d'effet hologramme, pas de dégradés criards.
- **Aucune bordure** dans l'interface (règle globale de `reference.css`). Les zones se distinguent par leur **fond**, l'**espacement** et la **typographie**. Seules exceptions : le liseré coloré de rareté des cartes et la surbrillance d'un élément ciblé (§4.7).
- **Pas de lueur décorative.** L'or sert à signaler : action, sélection, élément actif.
- **Sobriété des arrondis** : 3 à 7 px. Jamais de bulles très arrondies (10 px et plus) ni de pilules, sauf le bouton JOUER et les avatars ronds.
- **Pas d'emoji ni de pictogramme dessiné à la main** : icônes du sprite (§5).
- **Horlogerie médiévale brisée** (validé le 2026-11-04) : astrolabes, cadrans gradués et rouages dessinés au trait, abîmés par une chute (dents arrachées, rayons cassés, cadrans fêlés, anneaux ouverts). C'est une horloge astronomique en ruine, pas du steampunk (§4.13).
- **L'or parle, la couleur éclaire** : l'or reste réservé à l'action ; chaque mode a sa lumière d'ambiance, et un vert-de-gris porte l'information (§2).

## 2. Couleurs
Toujours via les variables de `globals.css` ou les valeurs ci-dessous, jamais de valeur inventée.

| Rôle | Valeur | Variable |
|---|---|---|
| Fond de page | `#0b0e0f` | `--background` |
| Panneau | `#111514` | `--panel` |
| Panneau relevé (survol, bloc mis en avant) | `#171b1a` | `--panel-raised` |
| Fond flottant (menus, bulles) | `#151918` à 95 % (`#151918f2`) | — |
| Texte | `#e9e5dc` | `--foreground` |
| Texte secondaire | `#b4b2aa` | — |
| Texte atténué (onglets au repos, légendes) | `#717772` / `#777d78` | `--muted` (`#767b76`) |
| Or (accent, soulignements, focus) | `#c4a76d` | `--gold` |
| Or clair (texte actif, chiffres) | `#d5bb7f` | `--gold-light` |
| Or sourd (sur-titres) | `#a68e5d` | `--gold-dim` |
| Or des boutons d'action | texte `#edd49a`, fond `rgb(205 170 99 / 12%)` | — |
| Avertissement doux (verrou, condition) | `#d9a46b` | — |
| Rareté N / R / SR / SSR / UR | `#94a3b8` / `#38bdf8` / `#a855f7` / `#f59e0b` / `#ff3b4a` | `--rarity-*` |

Les couleurs de rareté sont de l'**information de jeu** : on ne les réutilise pas comme décor.

### 2.1 Contre-accent vert-de-gris (validé le 2026-11-04, variante C)
Du bronze oxydé à côté de l'or patiné. Il porte l'**information** : difficulté vaincue, bonus actif, remplissage des barres de progression, états « en cours ». L'or reste sur les actions.

| Rôle | Valeur |
|---|---|
| Texte et marque d'information | `#8fbfae` |
| Fond d'étiquette (bonus actif) | `rgb(111 154 141 / 14%)` |
| Remplissage de barre | `#6f9a8d` |

### 2.2 Lumière d'ambiance par mode (validé le 2026-11-04, variante C)
Maquette : `public/mockups/couleurs-ambiance.html`.
Chaque mode a une teinte sombre et désaturée. Elle colore uniquement : un halo radial en haut de page (`radial-gradient(60% 100% at 30% 0%, <ambiance> à 32 %, transparent 70%)`), le fond des panneaux, les sur-titres et les ornements mécaniques (§4.13). Les boutons, le texte courant et l'or ne changent pas.

| Mode | Ambiance | Panneau | Panneau relevé | Sur-titre | Ornements |
|---|---|---|---|---|---|
| Donjons | vert-de-gris `#3f6b62` | `#111716` | `#161d1b` | `#7fa497` | `#8fb5a8` |
| Tour | indigo nuit `#3b4170` | `#12131a` | `#171922` | `#8d93c4` | `#a3a9db` |
| Histoire | parchemin ambré `#7a5a34` | `#151310` | `#1b1814` | `#b8935f` | `#d0a96f` |
| Arène | grenat sombre `#6b2a32` | `#161112` | `#1c1617` | `#b47a80` | `#c98d93` |
| Guilde | bleu acier `#3a5568` | `#111518` | `#161b1f` | `#88a3b6` | `#9cb8cc` |

Les pages sans mode (collection, inventaire, profil…) gardent la palette neutre du §2. Règle de dosage : 60 % de fond neutre, 30 % de teinte d'ambiance, 10 % d'or. Les ambiances restent sombres pour ne jamais être confondues avec une rareté ; le grenat de l'Arène doit rester distinct du rouge UR.

## 3. Typographie
- **Cinzel** : logo, titres de page, titres de bloc, gros chiffres, boutons d'action.
  - Titre de page : `500 clamp(34px, 4vw, 52px)/1.05`, approche `-.025em` (34 px sur téléphone).
  - Titre de bloc : `500 14–22px`.
- **DM Sans 400** : tout le reste. Texte courant 13 px, interligne 1.5. Onglets et contrôles textuels 11 px.
- **Sur-titre** (`.mq-eyebrow`) au-dessus de chaque titre de page : 9 px, capitales, espacement `.28em`, gras, or sourd.
- Pas d'autre police (Michroma, Sora, Big Shoulders sont retirées).

## 4. Composants
Réutiliser les classes existantes ; ne pas recréer un composant dans une feuille locale.

### 4.1 En-tête de page
`PageHeading` (`src/components/mq/PageHeading.tsx`) : sur-titre, titre Cinzel, phrase en 13 px atténuée, petit trait or de 70 px dessous.

### 4.2 Boutons et liens d'action (`src/app/controls.css`)
| Type | Classe | Rendu |
|---|---|---|
| **Action** (Y aller, Équiper, Améliorer…) | `ui-button` | Fond or translucide 20 % (`rgb(205 170 99 / 20%)`) avec filet or 2 px en bas (55 %), angles 3 px et coins fins cassants (`identity.css`), Cinzel 600 12 px `#edd49a`, hauteur min. 44 px ; au survol fond 30 %, filet or plein `#c4a76d` et montée de 2 px. |
| **Action textuelle** (invocation, actions secondaires) | `ui-button text-action` | Fond transparent, texte or, soulignement or 2 px qui s'ouvre au survol. |
| **Contrôle textuel / onglet / filtre** | `button` nu ou classes d'onglets | Transparent, DM Sans 11 px gris `#717772`, soulignement or 2 px au survol et à l'état actif (texte `#e9e5dc`). |
| **Récompense prête** | `claim-button` | Texte or en capitales espacées, point qui pulse, soulignement lumineux. |

États obligatoires : **focus clavier visible** (contour or 2 px, décalage 3 px), **désactivé** distinct (opacité .4–.45, curseur interdit). Jamais de bouton plein opaque ni de bouton encadré.

### 4.3 Onglets de section
`.mq-section-tabs` (et équivalents) : rangée d'onglets 11 px, largeur min. 92 px, trait or qui s'ouvre depuis le centre ; état actif souligné.

### 4.4 Panneaux et blocs
Fond `#111514` (ou `#171b1a` pour un bloc mis en avant), **sans bordure**, arrondi 5 px (jusqu'à 7 px pour un panneau flottant). Bloc mis en avant possible avec un filet or intérieur à gauche (`box-shadow: inset 3px 0 0 #c4a76d`).

### 4.5 Cartes de personnages
Liseré coloré selon la rareté, arrondi 3 px, cadres décoratifs détaillés masqués pour l'instant. Une sélection se marque par le fond ou le texte, pas par une nouvelle bordure.

### 4.6 Éléments flottants (menus déroulants, infobulles)
Modèle : `.mq-dropdown-panel` (`maquette.css`).
- Fond `#151918f2`, flou d'arrière-plan 16 px, ombre `0 18px 35px #0009`, arrondi 7 px, marge intérieure 7–16 px.
- Texte DM Sans 12–13 px ; titre éventuel en Cinzel 500 14 px.
- Pas de flèche dessinée ni de pastille pleine : la relation avec l'élément visé se voit par la position et la surbrillance (§4.7).
- Apparition : fondu + glissement de 8 px en .18 s.

### 4.7 Surimpressions (fenêtres, menu JOUER, tutoriel)
Modèle : `.mq-play-overlay` / `.mq-play-menu`.
- Voile `rgba(4, 6, 6, .82)` avec flou de 12 px ; apparition en fondu .2 s.
- Panneau : dégradé `145deg, #151a18f7 → #0d1110f7`, arrondi 10 px au maximum, ombre `0 40px 100px #000b`.
- Fermeture : contrôle textuel en capitales 10 px atténuées (« Fermer × »), pas de croix dessinée.
- **Élément ciblé** (tutoriel) : il reste au-dessus du voile, entouré d'un contour or 2 px (même style que le focus clavier), sans halo diffus.

### 4.8 Barres de progression, compteurs, états vides
- Barre fine (4 à 10 px), fond `#313632`, remplissage vert-de-gris `#6f9a8d` (§2.1), extrémités droites. Graduations tous les 10 % (encoches sombres dans la barre et repères fins au-dessus, couleur d'ornement), cliquet triangulaire sous le front de remplissage ; elle avance par crans (§6).
- Gros chiffres en Cinzel or clair ; légende en capitales 10 px atténuées.
- État vide : symbole `◇`, titre Cinzel, une phrase.

### 4.9 Champs de saisie
Un champ reste identifiable comme champ (fond distinct `#171b1a`, texte clair, focus or), malgré l'absence de bordures.

### 4.10 Barre du haut
Onglet actif souligné d'or (2 px) et texte or clair ; menus déroulants au survol ; bouton **JOUER** central. Sur mobile, bouton « Menu ».

### 4.11 Anneau gravé (avatars et emblèmes ronds)
Validé le 2026-11-04 (maquette « A · Anneau gravé »). Classe partagée `ring-engraved` (`src/app/reference.css`), appliquée d'office à l'avatar de l'en-tête (`.mq-avatar`) et à l'avatar du profil (`.pf-avatar`) ; à réutiliser pour tout **élément rond** qui représente une personne ou un groupe (emblème de guilde, futurs avatars d'amis dans le chat).
- Fond en relief : dégradé radial `#2b2f2c → #0f1211`, initiales ou symbole en or clair `#f0dca0` (Cinzel pour les initiales).
- Double filet : or `#c4a76d` de 2 px à l'extérieur, un anneau sombre de 3 px, puis un filet d'or sourd `#655331` de 1 px ; ombre portée `0 4px 10px #000a`.
- **Deux losanges** or de 5 px (7 px au-delà de 64 px) en haut et en bas, qui dépassent de 3 à 4 px. Pas de halo.
- État « récompense prête » (bonus du jour) : le filet extérieur et les losanges passent à l'or clair.
- C'est une **exception volontaire** à « aucune bordure » (§1) : un emblème gravé, pas un cadre de zone. Ne pas l'étendre aux panneaux, boutons ni cartes.

### 4.12 Classements : podium, liste, barre « ton rang »
Validé le 2026-11-04. Composant `Leaderboard` (`src/components/board/`), utilisé par tous les classements de joueurs.
- **Podium** : trois cartes (2 · 1 · 3), la première plus haute ; filet intérieur et numéro en bandeau aux couleurs métalliques or `#c4a76d`, argent `#b9bfc4`, bronze `#c08a5a` (information de rang, pas de décor). Avatar en **anneau gravé** (§4.11) à la couleur du rang, pseudo, score en Cinzel, détail, raretés.
- **Liste** à partir du 4ᵉ : numéro Cinzel gris, pseudo et titre, détail, puces de raretés (`N R SR SSR UR` avec le nombre en couleur de rareté, car c'est de l'information), score Cinzel or. Ligne du joueur : fond or translucide et filet or à gauche.
- **Barre « Ton rang »** : fixée en bas de l'écran, filet or en haut ; elle apparaît quand la ligne du joueur n'est plus visible, avec son rang, son score et ce qu'il manque pour entrer dans le top 100. Absente si le joueur n'est pas classé.
- Mobile : podium compact (sans détail), onglets en défilement horizontal.

### 4.13 Ornements mécaniques brisés
Validé le 2026-11-04 (maquette `public/mockups/rouages-brises.html`). Prolonge le langage du dos de carte (`public/images/cards/anima-clash-back.webp`) : cercles concentriques, graduations, losanges cardinaux.
- **Dessin au trait uniquement** (SVG), filet de 0,8 à 1,2 px, angles vifs (`stroke-linejoin: miter`). Pas de remplissage, de laiton en relief, de dégradé métallique, de rivets, de tuyaux ni de vapeur.
- **Rouages** : dents trapézoïdales à sommet étroit, moyeu, jante intérieure, 3 à 6 rayons.
- **Cadrans** : anneau extérieur gradué (60 graduations, une sur cinq plus longue), anneau pointillé, losanges aux quatre points cardinaux.
- **Brisures** obligatoires sur chaque grand ornement (au moins deux) : dents arrachées (bord déchiqueté), rayon cassé, fissure en zigzag avec embranchement, anneau ouvert sur un arc, morceau de roue manquant.
- **Couleur** : celle des ornements du mode (§2.2). Dans les pages sans mode et pour l'invocation : or `#c4a76d`.
- **Emplacements** :
  - pages de mode : un grand rouage, un pignon engrené et un cadran en haut à droite (opacité 17 %), à la place de l'astrolabe de fond (`.mq-lore-system`) ; les autres pages gardent leur astrolabe ;
  - toutes les pages décorées (sauf accueil et équipe) : un fragment de roue en ruine en bas à gauche (12 %) et un cadran fêlé derrière le titre de page (20 %) ;
  - sous le titre (`PageHeading` et `.pg-head`) : le trait or devient une **crémaillère** or de 96 px terminée par un petit pignon, qui tourne de trois crans à l'arrivée sur la page ;
  - **invocation** : machine or (cadran, aiguille, deux rouages) au premier plan (§6).
- **Code** : SVG générés par `scripts/generate-ornaments.mjs` dans `public/ornaments/` (traits noirs servant de masques), styles dans `src/app/ornaments.css`, calque de fond `MechanicalBackdrop`, machine `src/app/packs/SummonMachine.tsx`. Les teintes de mode vivent dans `src/app/ambiance.css` (attribut `data-ambiance` posé par `AppShell`).
- C'est une **exception volontaire** à « pas de décor », comme l'anneau gravé : les ornements restent en arrière-plan, sauf la machine d'invocation. Ne jamais en faire des cadres de panneaux, de boutons ni de cartes.

### 4.14 Tiroir de navigation et profil (téléphone et tablette, < 1500 px)
Validé le 2026-11-04. Barre de 68 px en trois colonnes : bouton **Menu** à gauche (fond `#2a2e2c`, trois traits or, filet or dessous), logo au centre, notifications et **avatar à anneau gravé** (§4.11) à droite. Plus d'engrenage dans l'en-tête : Paramètres est dans le menu du profil.
- **Tiroir** : panneau de 84 % de large (360 px max) à gauche, fond `#1d211f`, voile `#000a` derrière, ouverture en .18 s (§6). « Jouer » en tête, entrées de 50 px, page courante : filet or à gauche et fond `#c4a76d14`. Se ferme au clic sur un lien, sur le voile ou avec Échap.
- **Profil** : panneau sous la barre ouvert au toucher sur l'avatar ; boutons de 46 px avec filet or à gauche, « Se déconnecter » en rouge (`#e0645c`).
- Menu « Social » (Amis, Guildes, Classement) remplace l'entrée Classement, sur tous les écrans.

### 4.16 Cases d'artefact par rareté (validé le 2026-11-09, variante C)
Fond de la couleur de rareté à 20 % sur `#0a0e0d`, liseré intérieur 2 px de la rareté assombrie, petit losange plein de la couleur de rareté en haut à gauche, reflet diagonal discret sur SSR et UR. Les cinq raretés ont chacune leur teinte (`--rarity-*`). Sélection : fond à 30 % et contour or `#d5bb7f` décalé de 3 px. Icône non désaturée. Même rendu dans la fiche personnage (`.eq-character-dialog`).

## 5. Iconographie
Piste C « Héraldique » : sprite `public/icons/icons.json` via `Icon`, `TypeIcon`, `RarityGem`, `StatusIcon` (`src/components/icons.tsx`). Silhouettes de blasons, aplats francs, lisibles en petit ; couleurs de rareté conservées. Symboles typographiques admis : `◇ ◆ › → ✓ ×`.

## 6. Mouvement
Transitions courtes (.18–.2 s), sans rebond. Pas d'animation continue sur les grandes surfaces. Toujours une variante `prefers-reduced-motion`.

**Mouvement par crans** (mécanique, validé le 2026-11-04) : un rouage avance d'une dent en .16 s (`cubic-bezier(.2, .9, .3, 1)`), puis s'arrête net. Pas de rotation fluide continue ni de rebond.
- Fond : seuls le grand rouage et son pignon tournent, d'un cran toutes les 1,8 s, en sens opposés. C'est la seule animation continue autorisée.
- Pages : le pignon de la crémaillère tourne de trois crans à l'arrivée sur la page.
- **Invocation « graduations »** (validée le 2026-11-09, `SummonMachine` + `StarFrame`) : dans le style du dos de carte (filets fins, cercles pleins et pointillés, étoile à quatre branches, losanges). Cadre double à coins biseautés qui se trace ; astrolabe de six cercles qui se tracent ou apparaissent ; 60 graduations qui se remplissent pendant qu'une aiguille fait un tour en 12 crans avec son arc lumineux ; puis verrouillage à la couleur de la meilleure rareté (axes, losanges, étoile qui s'embrase, 2 anneaux de choc). ~2,8 s (×0,6 pour un lot de 10). Un clic n'importe où ou Échap l'abrège, son coupé (`packAudio.cut`).
- **Son de l'invocation** (`packAudio.machine`) : balayage fin de sinus qui monte, tic d'horlogerie tous les 5 crans, tintement à chaque douzième de tour, puis verrouillage (frappe de cloche pour une SSR/UR, choc discret sinon) et cinq petites notes montantes.
- **Sons des cartes** : distribution = froissement léger ; retournement = « parchemin lourd » (validé le 2026-11-09) : souffle d'étoffe épaisse puis claquement sourd et mat, identique pour toutes les raretés (l'éclat SSR/UR prend le relais).
- **Éclat SSR / UR « constellation encadrée »** (validé le 2026-11-09, `RarityBurst`, piloté par `--S` = instant de l'embrasement : 1,3 s SSR, 1,5 s UR) : plein écran (portail sur `body`), fond opaque. Cadre biseauté plein écran qui se trace ; quatre diagonales convergent vers un cadre biseauté autour de la future carte (cadre pointillé extérieur) ; huit losanges s'allument un à un ; l'astrolabe se trace et l'étoile pulse ; à `--S` : flash, secousse, anneaux de choc (3 en UR), étoile qui embrase, lignes d'énergie fines ; la carte sort de l'étoile (petite, puis grosse au premier plan ×1,38, puis posée avec un reflet qui la balaie) et redescend +2,4 s après. Par crans. Un clic n'importe où ou Échap l'abrège, son coupé.
- **Son de l'éclat** (`packAudio.jingle`, calé sur l'animation) : balayage fin qui monte, tic à chaque losange, frappe de cloche à l'embrasement (UR : double, avec cloche grave), nappe grave, chuintement aigu et petites notes montantes à la sortie de la carte, cloche et choc quand elle se pose.
- `prefers-reduced-motion` : rouages de fond immobiles, éclat SSR/UR supprimé, invocation sans crans ni éclats ni son (résultat direct).

## 7. Mise en page
Contenu max. 1530 px, marges `48px 4.3vw 70px` (téléphone : `28px 16px 45px`). Vérifier chaque écran à 1280 px et sur téléphone (375 px), sans défilement horizontal.

## 8. Maquettes
- Une maquette **réutilise ce fichier** : mêmes couleurs, polices, classes et mesures. Idéalement, elle est faite **dans le jeu** (page ou composant de test utilisant les vraies feuilles de style) ; sinon, en HTML avec les valeurs exactes ci-dessus.
- On la montre à l'utilisateur et on attend son accord avant de coder.
- Toute décision validée est reportée ici (section concernée, avec la date).

## 9. Interdits
Bordures de cadre, boutons pleins opaques ou encadrés, steampunk (laiton en relief, rivets, tuyaux, vapeur), ornements mécaniques intacts et propres ou en premier plan hors invocation, pastilles et bulles très arrondies, halos et néons, 3D, emojis, couleurs hors palette, nouvelle police, couleur de rareté utilisée comme décor.

## Historique
- 2026-11-04 : variante C validée : lumière d'ambiance par mode (§2.2) et contre-accent vert-de-gris pour l'information (§2.1) ; ornements d'horlogerie médiévale brisée (§4.13), mouvement par crans et séquence d'invocation (§6), barre de progression graduée (§4.8).
- 2026-11-04 : classements (§4.12) : podium, raretés par joueur, barre « Ton rang » ; sélecteur de lot ×5 gris / ×10 jaune (lot choisi plein, l'autre gris).
- 2026-11-04 : bouton d'action `ui-button` renforcé (fond or 20 %, filet or de 2 px en bas) ; anneau gravé validé (§4.11) pour les avatars et emblèmes ronds.
- 2026-11-01 : passage au style « Citadelle sombre » (ancien fichier `docs/specs/direction-visuelle.md`, lots 1 et 2 codés ; lot 3 : combat et donjons).
- 2026-11-03 : interface sans bordures, boutons d'action « or translucide », contrôles textuels soulignés, bouton « Récupérer » validé.
- 2026-11-04 : ce fichier devient la référence unique.
- 2026-11-04 : tutoriel en infobulles validé : panneau flottant des §4.6–4.7, sur-titre de progression, contour or sur la cible, sans flèche ni pastille pleine ; bouton « Suivant » de type `ui-button` pendant les présentations.
- 2026-11-04 : son de l'invocation « rouage sec » validé (§6).
- 2026-11-04 : sons de carte distribuée et retournée en papier (bruit filtré, sans note ni queue ; SSR/UR = claquements en plus), §6.
- 2026-11-04 : tiroir de navigation mobile, profil au toucher et menu Social validés (§4.14).
- 2026-11-04 : éclat SSR/UR mécanique (anneau, plaque, éclats) validé, remplace l'éclair à rayons (§6).
- 2026-11-09 : pile des cartes révélées à gauche abandonnée, retour à l'ancien système (une carte à la fois, au centre).
- 2026-11-09 : éclat SSR/UR en plein écran (le fond disparaît un instant), pile allégée (lag), bug d'affichage de l'éclat coupé dans la scène corrigé (§6).
- 2026-11-09 : carillon d'horloge à l'apparition d'une SSR/UR (§6).
- 2026-11-09 : éclat SSR/UR allongé à 3,1 s avec la carte tirée au centre puis qui redescend ; carillon plus long ; grille du résumé de tirage corrigée (§6).
- 2026-11-09 : éclat SSR/UR remplacé par « horloge + portes » (carte qui sort des portes, lignes d'énergie, reflets), retournement en « parchemin lourd » (§6).
- 2026-11-09 : ouverture « graduations » et éclat « constellation encadrée » (style dos de carte) remplacent le rouage et « horloge + portes » ; saut d'animation au clic ou Échap (§6).
