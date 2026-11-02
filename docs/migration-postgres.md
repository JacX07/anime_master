# Migration Postgres — 2026-11-02

Branche : `migration/postgres`, base : `d72a203`. Aucun changement appliqué aux bases SQLite existantes ni à Supabase. Les contrôles et parcours ci-dessous sont validés localement ; aucune publication Supabase/Vercel ni fusion de branche n’a été faite.

## Changements

- Prisma et Better Auth utilisent Postgres. Client : `@prisma/adapter-pg`, pool de cinq connexions maximum, délai de connexion de dix secondes.
- Migration initiale `20261102160000_init_postgres`. `npm run db:deploy` l'applique à une base Postgres vide.
- Runtime : `DATABASE_URL`. Migrations : `DIRECT_URL` si renseigné, sinon `DATABASE_URL`. Sur Supabase, utiliser une connexion directe ou le pooler session pour les migrations.
- Schéma et 33 migrations SQLite archivés dans `prisma/sqlite/` ; configuration indépendante `prisma.sqlite.config.ts`. `play:sync` reste uniquement SQLite.
- Requêtes de classement et réparation des artefacts compatibles Postgres ; verrous joueur pour les quêtes et quotas de duels ; création concurrente des progressions avec conflit ignoré.
- Checks : schéma Postgres isolé pour le builder, comparaison structurelle des replays JSONB, numéros de carte compatibles INTEGER.

## Vérifications

Sous Node 24.21.0, Postgres local jetable, catalogue copié en lecture seule depuis SQLite : 3 411 séries, 4 717 personnages, 14 934 relations et un override. Aucun compte SQLite copié. Ce chargement ponctuel de test ne constitue pas le futur script de transfert de contenu.

- `prisma generate` : OK.
- `play:sync` sur des copies des deux bases SQLite : sauvegarde et 33 migrations historiques OK, aucun changement de contenu attendu.
- ESLint ciblé sur tous les fichiers TypeScript modifiés et `git diff --check` : OK.
- `prisma migrate deploy` deux fois : migration appliquée puis aucune migration en attente.
- `prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code` : aucune différence.
- Les 43 fichiers `scripts/check-*.ts` (40 existants et trois repris des ajouts combat/donjons) ont été exécutés sur Postgres. Le seul échec de la première passe complète, double clic manuel intermittent, a été corrigé puis son check relancé avec succès. Les 43 checks ont désormais chacun un résultat réussi sur cette branche.
- TypeScript : OK après intégration des dépendances manquantes.
- Build de production Node 24 : OK.
- Navigateur sur le build de production, localhost:3012 : inscription, session après rechargement, ouverture/révélation de cinq cartes, contrôle de leur persistance en base, connexion refusée pour mauvais mot de passe puis réussie.
- Équipe : fiche personnage avec statistiques détaillées et bonus de set visible.
- Donjons : navigation entre cinq univers, dix difficultés par univers, victoire automatique Naruto, butin et progression persistés après rechargement, progression indépendante One Piece. Navigation des cinq univers et sélection après rechargement vérifiées à 390 px ; aucune erreur JavaScript. Ouverture et abandon d’un combat manuel vérifiés depuis le navigateur. Onglets alignés sur les classes partagées `pg-tabs` après inspection visuelle.
- VFX en navigateur à 390 px : dix statuts complétés par réutilisation des effets existants, pause et vitesse ×4, nettoyage après fin naturelle et 50 déclenchements interrompus, démontage du canvas et mouvement réduit vérifiés. Retour à zéro overlay et zéro animation après nettoyage. Échantillon local de 60 frames : médiane 16,6 ms, p95 17,6 ms ; mesure headless ponctuelle, pas une garantie sur téléphone réel.

## Correctifs complémentaires autorisés

- Reprise des ajouts combat/donjons présents dans le dossier principal, sans modification de celui-ci : cinq donjons et leurs sets, statistiques d’artefacts, saignement et combinaisons élémentaires. Les contrôles serveur et la création concurrente des progressions restent compatibles Postgres.
- Tous les statuts déclarés ont une animation d’application ; aucune nouvelle dépendance VFX.
- Le scénario Makima charge explicitement l’ultime puis vérifie contrôle, K.-O. et victoire : le moteur exécutait déjà le dernier ennemi contrôlé.
- Le navigateur transmet le numéro d’action du combat. Une requête obsolète, même arrivée après la précédente écriture, est refusée ; check de concurrence et de requête retardée ajouté.

## Suite

1. Préparer séparément le transfert rejouable du contenu SQLite vers Postgres et la synchronisation dev vers prod sans données joueurs ni suppressions.
2. Configurer la CI, Supabase et Vercel selon le plan de déploiement.
3. Ne publier la production qu’à la demande de l’utilisateur.
