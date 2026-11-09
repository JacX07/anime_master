# Megumin — Explosion !

Refonte suivant le skill « Animation 2D des sorts — Anime Masters » fourni par l'utilisateur.

## Fiche

- Personnage : Megumin, identifiant 89361.
- Hypothèse de présentation : UR / ultime, feu, zone ennemie. Aucune rareté ni règle du moteur n'est modifiée.
- Durée : 3 600 ms ; impact et résultats à 1 800 ms.
- Intention : une annonce théâtrale et une charge convergente, puis une frappe courte, asymétrique et écrasante.
- Portée : preview isolée. Les dégâts, PV, brûlures et KO sont des fixtures fournies au rendu. Aucune simulation de combat n'est exécutée.

## Timeline

| Phase | Temps | Calques et easing | Événement sonore / affichage |
| --- | --- | --- | --- |
| Anticipation | 0–1 500 ms | Cut-in de 100 à 780 ms, entrée cubic ease-out ; cercles rouges, particules convergentes, assombrissement et zoom de 3,5 % | `charge` à 0 ms : résonance ascendante |
| Lancement | 1 500–1 800 ms | Projectile accéléré avec easing quadratique, axe lumineux vers la zone, contraction des cercles | `launch` à 1 500 ms : aspiration ; silence avant le contact |
| Impact | 1 800–1 880 ms | Éclair unique de 32 ms à opacité limitée, silhouette figée 50 ms (3 frames à 60 Hz), recul et lumière sur les cartes | `impact` et `results` à 1 800 ms : détonation, dégâts et états immédiats |
| Retombée | 1 880–3 000 ms | Deux anneaux décalés de 85 ms, easing cubic ease-out ; débris à 1 940 ms, fumée à 2 120 ms ; feu éteint à 2 500 ms | `fallout` à 1 940 ms : réflexions et pierres ; fin progressive de la SFX |
| Retour au calme | 3 000–3 600 ms | Dissipation de la fumée, affaissement du lanceur, marques au sol effacées | PV et statuts fournis conservés, son arrêté en fin de séquence |

Les événements sont des notifications de présentation. Ils ne déclenchent aucun calcul de dégâts. Passer l'animation affiche directement le résultat fourni et annule le son. L'inspection avec la réglette n'émet pas d'événements. Une reprise ne réémet pas les événements déjà traversés.

## Implémentation et paramètres

- Rendu : `public/vfx/megumin-explosion.js`, classe `window.MeguminExplosion`, Canvas 2D sans dépendance. Constantes `MEGUMIN_TIMING` pour les phases.
- Preview : `/mockups/sort-feu-megumin.html`, avec lecture, pause/reprise, interruption, passage rapide, boucle, son, vitesse et qualité.
- Contrat : `new MeguminExplosion(canvas, options)` ; options documentées en JSDoc : `duration`, `color`, `intensity`, `seed`, `target`, `targets`, `quality`, `reducedMotion`, `onEvent`.
- Chaque cible fournit position, nom, dégâts, fraction de PV restante, état et KO. Le rendu ne les calcule jamais.
- `draw(ms)` inspecte sans événements ; `advance(ms)` affiche et notifie les événements traversés ; `resetEvents()` prépare un nouveau lancement ; `resize()` conserve les proportions ; `destroy()` libère le rendu.
- La preview utilise le son comme horloge, y compris pendant les ralentis. `configure()` accepte une durée de 1 800 à 7 200 ms pour cette piste audio ; le renderer est indépendant de cette restriction.
- Pool fixe de 76 particules, ou 30 en qualité réduite ; 13/7 masses de fumée ; DPR limité à 2/1. Positions et variations pré-calculées à partir du seed, sans création de particules par frame.
- Réduction des animations : résultat fixe sans cut-in, secousse, flash ni lecture sonore ; les chiffres restent visibles. Inspection manuelle disponible.

```js
meguminPreview.configure({
  duration: 3600,
  color: '#e33221',
  intensity: 1,
  seed: 89361,
  quality: 'low',
  target: { x: 753, y: 398 },
});
meguminPreview.play();
```

## Assets

- Portrait original stylisé, cartes de test, cercles, feu, ondes, poussière et débris dessinés en code. Aucun sprite externe ni extrait d'anime.
- SFX originale : `public/audio/sfx/megumin-explosion.wav`, stéréo 44 100 Hz, 3,6 s, pic normalisé à −1 dBFS, détonation à 1,8 s. Sans voix.
- Régénération : `timeout --kill-after=5s 60s python3 scripts/generate-megumin-sfx.py` (NumPy déjà présent dans l'environnement).
- Aucun asset supplémentaire requis pour la preview. L'intégration au lecteur devra utiliser ses vraies cartes et les résultats du serveur.

## Vérification du 2026-11-09

- Contrôle Node 24 : `timeout --kill-after=5s 60s ~/.nvm/versions/node/v24.21.0/bin/node scripts/check-megumin-preview.mjs`.
- ESLint ciblé sur le renderer et le contrôle Node.
- Navigateur : 1 280 × 800 et 390 × 844, sans débordement horizontal. Cut-in, charge et impact inspectés visuellement.
- Contrôles : lecture audio, vitesses ×0,25/×0,5/×1/×2/×4 avec progression positive, pause/reprise, synchronisation dans la même frame, passage rapide, répétition, seed, durée/couleur/intensité/cible, arrêt normal et mouvement réduit émulé.
- Hit stop : images identiques à 1 835 et 1 845 ms ; image différente après reprise. Résultats présents à l'impact, également dans la version fixe.
- Après 30 lancements interrompus : 39 éléments DOM comme avant, aucune animation Web Animations, aucun `requestAnimationFrame` du lecteur restant ; audio en pause.
- Séquence complète à ×1 : médiane/p95 16,7/16,7 ms en desktop (220 frames), format mobile qualité complète (223 frames) et réduite (221 frames).
- Limite : navigateur de bureau redimensionné, sans mesure sur téléphone physique ni garantie sur appareil mobile moyen. Pas d'intégration au moteur de combat dans cette étape.

## Checklist

- [x] Lanceur et cibles identifiables dans la première seconde ; cut-in évacué à 780 ms.
- [x] Anticipation, lancement directionnel, impact net, retombée et retour au calme.
- [x] Hit stop de 50 ms, éclair unique de 32 ms, recul, lumière et secousse brève.
- [x] Couches et vitesses distinctes ; variations déterministes, palette de feu limitée.
- [x] Ultime limité à 3,6 s ; accélération, passage et interruption disponibles.
- [x] Points sonores documentés, détonation et résultats à 1,8 s.
- [x] Pool plafonné, qualité réduite, annulation et démontage contrôlés.
- [x] Paramètres documentés, timeline nommée, aucun résultat de jeu décidé par l'animation.
- [ ] Validation sur un téléphone physique de gamme moyenne.
- [ ] Branchement aux événements et aux cartes du lecteur de combat, après validation de cette preview.
