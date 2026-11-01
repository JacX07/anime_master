# Gestion des illustrations

Ouvrir **Illustrations** dans la navigation (`/illustrations`). La recherche couvre tous les personnages et leur série. Un second onglet liste objets, armes, monnaies et ressources, y compris les ressources en stock non encore répertoriées. Choisir une image l'enregistre immédiatement ; **Rétablir l’origine** annule ce remplacement.

Formats : PNG, JPEG, WebP ; 5 Mo maximum. Les personnages utilisent leur nouvelle image dans les vues existantes (album, combats, tirages, fiches, équipes). Les objets et ressources sont illustrés dans l'inventaire, le butin d'histoire, l'éveil et la forge. Les réimports AniList préservent les remplacements.

L'édition requiert une connexion. En développement local, les comptes connectés peuvent éditer. Pour restreindre l'édition à un compte, définir `ART_EDITOR_USER_ID` dans l'environnement. En production, cette variable est obligatoire pour activer l'éditeur et identifier son seul utilisateur autorisé. Les images sont partagées entre joueurs, pas personnalisées par compte.

Les fichiers et les références des images d'origine sont conservés dans `data/illustrations/`, exclus de Git. Sauvegarder ce dossier avec la base SQLite : les lignes de personnages pointent vers ces fichiers. Le stockage local doit être persistant ; une plateforme sans disque persistant nécessite un stockage d'objets avant d'y utiliser cette fonction.
