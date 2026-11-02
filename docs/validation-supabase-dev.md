# Vérification navigateur de Supabase dev — 2026-11-02

Application locale : `anime_master-postgres`, branche `migration/postgres`, code au commit `0d3d1c0`, Next dev sous Node 24.21.0, port 3000, connexion Session pooler configurée dans le `.env` local non versionné. Test dans un profil navigateur privé, à 1280 × 800 puis 390 × 844. Aucune publication ni action sur production.

## Parcours réalisés

- Inscription depuis `/signup` : création du compte `sbtest57942310`, session reconnue et accueil connecté affiché après chargement.
- Tirage standard depuis l’accueil : ouverture de cinq cartes, révélation des résultats ; réserve passée de 30 à 25 cristaux avant recharge naturelle.
- Collection : cinq cartes conservées après navigation, rechargement et reconnexion. Filtre « Possédés » (`/album?owned=owned`) : Kusuriuri, Botan, Najenda, Riddle Rosehearts et Shioriko Mifune. Les cinq images chargent aussi à largeur mobile.
- Squad d’attaque : choix de quatre cartes via l’interface, enregistrement, rechargement ; quatre emplacements conservés, puissance totale 16 569.
- Combat de test : lancement automatique, actions enregistrées ; rechargement pendant le combat, bouton « Reprendre » puis reprise du combat existant. Passage de manuel à automatique après reprise, vitesse ×4 ; fin au tour 4 avec victoire de l’équipe d’essai et bilan affiché.
- Déconnexion via le menu du compte, puis connexion à largeur mobile : mauvais mot de passe refusé avec le message attendu ; bon mot de passe accepté. Collection et session toujours présentes après nouvelle navigation.

## Problèmes constatés

- Illustrations locales : 404 au premier chargement pour une image personnalisée importée par URL. Contournement local : copie sans écrasement des 74 fichiers de `anime_master/data/illustrations` vers `anime_master-postgres/data/illustrations`. Chargement confirmé dans l’accueil après copie. Ces fichiers restent hors Git ; ce contournement ne configure aucun stockage Vercel.
- Mobile : navigation supérieure débordante ; à 390 px, le bouton JOUER se trouve hors de la zone visible. Le contenu de connexion et de collection fonctionne mais l’ensemble du parcours mobile n’est pas validé. Voir `journal.md`.

## Limites

Le compte de test et ses cinq cartes restent dans dev pour rejouer les vérifications. Aucun compte réel ou donnée prod n’a été modifié. Pas de test sur une adresse publique Vercel, ni de test de charge, de restauration ou de retour arrière. Combat manuel complet, PvP, donjons et autres modes non couverts par ce parcours. Aucun lancement de `production:publish`.

## Correctifs après ce parcours

- Navigation repliable jusqu’à 1 100 px : vérifiée avec et sans session à 320, 390, 768, 1 024 et 1 280 px. Ouverture de Jouer, navigation vers Squads et fermeture avec Échap ; retour du focus au bouton du menu.
- Illustrations : 37 images versionnées, manifeste comprenant aussi les ressources SVG. Build de production testé localement sur la même base dev : les anciennes URLs redirigent vers les images publiques, même sans data/illustrations. L’éditeur répond HTTP 404 et les deux méthodes d’écriture HTTP 403. Les tests d’export contrôlent signatures, empreintes, chemins invalides et rejeu.
- Vérifications complémentaires : TypeScript, lint ciblé et build de production réussis. Aucun déploiement Vercel ni accès à la base prod ; les limites concernant les autres modes de jeu restent valables.
