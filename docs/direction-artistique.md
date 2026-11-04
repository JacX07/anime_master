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
| **Action** (Y aller, Équiper, Améliorer…) | `ui-button` | Fond or translucide 12 %, angles 7 px, Cinzel 600 12 px `#edd49a`, ombre portée, hauteur min. 44 px ; au survol fond 20 % et montée de 2 px. |
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
- Barre fine (4 à 10 px), fond `#313632`, remplissage or, extrémités arrondies.
- Gros chiffres en Cinzel or clair ; légende en capitales 10 px atténuées.
- État vide : symbole `◇`, titre Cinzel, une phrase.

### 4.9 Champs de saisie
Un champ reste identifiable comme champ (fond distinct `#171b1a`, texte clair, focus or), malgré l'absence de bordures.

### 4.10 Barre du haut
Onglet actif souligné d'or (2 px) et texte or clair ; menus déroulants au survol ; bouton **JOUER** central. Sur mobile, bouton « Menu ».

## 5. Iconographie
Piste C « Héraldique » : sprite `public/icons/icons.json` via `Icon`, `TypeIcon`, `RarityGem`, `StatusIcon` (`src/components/icons.tsx`). Silhouettes de blasons, aplats francs, lisibles en petit ; couleurs de rareté conservées. Symboles typographiques admis : `◇ ◆ › → ✓ ×`.

## 6. Mouvement
Transitions courtes (.18–.2 s), sans rebond. Pas d'animation continue sur les grandes surfaces. Toujours une variante `prefers-reduced-motion`.

## 7. Mise en page
Contenu max. 1530 px, marges `48px 4.3vw 70px` (téléphone : `28px 16px 45px`). Vérifier chaque écran à 1280 px et sur téléphone (375 px), sans défilement horizontal.

## 8. Maquettes
- Une maquette **réutilise ce fichier** : mêmes couleurs, polices, classes et mesures. Idéalement, elle est faite **dans le jeu** (page ou composant de test utilisant les vraies feuilles de style) ; sinon, en HTML avec les valeurs exactes ci-dessus.
- On la montre à l'utilisateur et on attend son accord avant de coder.
- Toute décision validée est reportée ici (section concernée, avec la date).

## 9. Interdits
Bordures de cadre, boutons pleins opaques ou encadrés, pastilles et bulles très arrondies, halos et néons, 3D, emojis, couleurs hors palette, nouvelle police, couleur de rareté utilisée comme décor.

## Historique
- 2026-11-01 : passage au style « Citadelle sombre » (ancien fichier `docs/specs/direction-visuelle.md`, lots 1 et 2 codés ; lot 3 : combat et donjons).
- 2026-11-03 : interface sans bordures, boutons d'action « or translucide », contrôles textuels soulignés, bouton « Récupérer » validé.
- 2026-11-04 : ce fichier devient la référence unique.
