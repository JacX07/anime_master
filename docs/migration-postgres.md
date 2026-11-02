# Migration Postgres — 2026-11-02

Branche : `migration/postgres`, base : `d72a203`. Aucun changement appliqué aux bases SQLite existantes ni à Supabase. Ne pas fusionner dans `production` tant que les contrôles globaux et parcours navigateur ne passent pas.

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
- Tous les 40 fichiers `scripts/check-*.ts` présents dans le commit de base ont été exécutés. Après correctifs et relances : 38 passent ; deux échouent dans du code de combat inchangé (`check-combat-vfx` : effet counter absent ; `check-kits` : cas Makima, zéro exécution du dernier survivant).
- Les checks de concurrence quêtes/duels/histoire et les checks combats, équipement, armes, donjons, raids et tour passent sur Postgres.
- TypeScript après `next typegen` : échec sur les incohérences déjà présentes dans d72a203 (export DUNGEONS, statuts earth et statistiques de combat). Aucun de ces fichiers n'est modifié par la migration.
- Navigateur réel : formulaire d'inscription soumis, redirection vers `/packs`, puis échec de compilation de l'accueil causé par l'import DUNGEONS manquant. Parcours joueur complet, connexion/reconnexion et persistance visuelle non validés. Build non lancé car cette erreur de source et les erreurs TypeScript bloquent déjà la compilation.

## Suite

1. Finaliser les travaux combat/donjons puis intégrer leur version commitée dans la branche de migration.
2. Relancer typecheck, les deux checks de combat restants et les parcours navigateur ; faire un build.
3. Préparer séparément le transfert rejouable du contenu SQLite vers Postgres et la synchronisation dev vers prod sans données joueurs ni suppressions.
4. Configurer Supabase et Vercel seulement après ces validations.
