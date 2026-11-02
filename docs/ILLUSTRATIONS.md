# Gestion des illustrations

Ouvrir **Illustrations** dans la navigation (`/illustrations`). La recherche couvre tous les personnages et leur série. Un second onglet liste objets, armes, monnaies et ressources, y compris les ressources en stock non encore répertoriées. Choisir une image l'enregistre immédiatement ; **Rétablir l’origine** annule ce remplacement.

Formats : PNG, JPEG, WebP ; 5 Mo maximum. Les personnages utilisent leur nouvelle image dans les vues existantes (album, combats, tirages, fiches, équipes). Les objets et ressources sont illustrés dans l'inventaire, le butin d'histoire, l'éveil et la forge. Les réimports AniList préservent les remplacements.

L'édition requiert une connexion. En développement local, les comptes connectés peuvent éditer. Pour restreindre l'édition à un compte, définir `ART_EDITOR_USER_ID` dans l'environnement. L’éditeur est toujours désactivé en production, même si cette variable est définie. Les images sont partagées entre joueurs, pas personnalisées par compte.

En développement, les fichiers et références des images d’origine restent dans `data/illustrations/`, exclus de Git. Sauvegarder ce dossier avec la base : les lignes de personnages peuvent pointer vers ces fichiers.

## Images disponibles sur Vercel

Les illustrations approuvées sont livrées avec le code dans `public/illustrations/`. Le manifeste `src/data/published-illustrations.json` associe les identifiants du jeu aux fichiers. Les noms sont des empreintes SHA-256 : un changement d’image crée une nouvelle URL, compatible avec le cache long des fichiers publics.

Depuis le worktree Postgres, sous Node 24 :

```sh
npm run art:export
# Ou pour exporter depuis un autre dossier local :
npm run art:export -- /chemin/vers/data/illustrations
```

L’export valide toutes les métadonnées et signatures avant de produire les fichiers. Il ne copie ni les comptes, ni les secrets, ni les références privées du dossier data ; seuls les pixels approuvés deviennent publics. Relire puis committer les fichiers publics et le manifeste. Cette commande ne déploie rien ; la publication reste réservée à l’humain.

En production, `/api/illustrations/<identifiant>` redirige vers l’image versionnée, sans consulter `data/`. Les URLs déjà stockées en base restent donc valides. Le catalogue de ressources provient du manifeste et conserve les SVG par défaut lorsqu’il n’existe pas de remplacement. Les écritures sont refusées et la page d’édition répond 404.

En développement, les remplacements locaux sont prioritaires et les images versionnées servent de référence de secours. Un remplacement n’arrive en ligne qu’après export, commit et publication humaine. Les anciens fichiers publics sont conservés par l’export pour ne pas casser leurs URLs ; leur nettoyage éventuel est une opération distincte.
