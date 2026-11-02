# Préparation de la base de production — 2026-11-03

La connexion Session pooler de `anime-prod` a été fournie via un champ sécurisé, vérifiée comme distincte de dev, puis utilisée sans la copier dans le `.env` de développement. Aucun secret n’est versionné.

## État vérifié

- Avant intervention : zéro table dans public, aucune migration Prisma.
- Migrations appliquées : `20261102160000_init_postgres`, puis `20261103010000_private_game_tables`.
- Catalogue transféré depuis dev : 3 411 Media, 4 717 Character, 14 934 CharacterMedia et 1 SpellOverride. Aperçu annulé avant application.
- Rejeu appliqué : zéro écriture dans les quatre tables, y compris après activation des protections.
- User, Session, Account, Card, Battle et Squad restent vides. Les compteurs de tirage sont tous à zéro. Aucun joueur de dev n’a été copié.

## Accès aux tables

L’application utilise Prisma et Better Auth, pas la Data API publique Supabase. Les droits par défaut de Supabase donnaient accès aux nouvelles tables via anon/authenticated. La deuxième migration active RLS sans politique publique et retire les droits directs de ces rôles lorsqu’ils existent, ainsi que leurs droits par défaut pour les futurs objets créés par le rôle de migration.

La connexion serveur propriétaire conserve ses droits ; elle reste un secret côté serveur. Toute future séparation entre rôle applicatif et rôle de migration devra définir explicitement ses droits/politiques. Les nouvelles tables devront aussi activer RLS.

`check-database-access.ts`, découvert par `npm run check`, vérifie les tables sensibles, l’absence de droits API et la lecture du catalogue par Prisma. Ce contrôle a réussi sur dev et prod. La migration complémentaire est également appliquée à dev ; reconnexion dans le navigateur et équipe de quatre cartes conservée.

## Sauvegardes et restauration

Fichiers locaux privés, exclus de Git dans `anime_master-postgres/data/backups/` :

- `anime-prod-before-init-2026-11-03.dump` : schéma public avant création des tables (1 682 octets).
- `anime-prod-catalogue-2026-11-03.dump` : schéma et catalogue après protection (2 504 469 octets).
- `anime-prod-restore-check-2026-11-03.json` : empreintes SHA-256 et résultats des restaurations.

Les deux archives ont été restaurées avec les clients PostgreSQL 17.11 sur un serveur local jetable 17.11. L’état initial retrouve zéro table ; l’archive catalogue retrouve les quatre comptages exacts, zéro compte/session/carte et RLS activé. Le serveur de restauration est arrêté et son dossier supprimé.

Ces archives portent uniquement sur public : elles ne sauvegardent pas Supabase Auth, les autres schémas gérés par Supabase, les rôles globaux, ni les objets Supabase Storage. Les images du jeu sont versionnées séparément dans Git.

**À faire avant d’inviter les amis :** conserver une copie protégée hors de cette machine et organiser les sauvegardes régulières. La sauvegarde ponctuelle locale testée ici ne constitue pas une sauvegarde automatique ni une copie externe.

## Publication encore à effectuer par l’humain

La branche production n’a été ni modifiée ni poussée ; aucun déploiement du site n’a été lancé. Avant la publication, attendre la CI verte du commit exact de main, vérifier les variables Production dans Vercel et publier ce code (avec la migration de protection). Les parcours sur l’adresse publique restent à tester sur ordinateur et mobile. Aucun compte de test n’a été créé sur prod pour préserver son démarrage vide.
