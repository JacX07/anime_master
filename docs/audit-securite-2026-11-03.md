# Audit de sécurité — 3 novembre 2026

État **partiel**, pas une certification de sécurité. Base de revue : main e955f78 ; correctif cron 88dcf2c. Git distant concordant au démarrage, CI exacte réussie : https://github.com/JacX07/anime_master/actions/runs/41544075677. Fichiers graphify préexistants conservés hors commits. Aucune publication, aucun test intrusif sur Supabase ou service tiers, aucun secret affiché.

## Failles prouvées

### Moyenne — cron ouvert lorsque CRON_SECRET manque — corrigé

`src/app/api/auctions/close/route.ts` ne contrôlait Authorization que si le secret existait. Sans variable, tout appelant pouvait déclencher le traitement global des enchères échues. Le caractère idempotent et la vérification d'échéance limitent l'impact ; aucun vol de cartes ou clôture anticipée démontré.

Reproduction isolée : `node --import tsx scripts/check-cron-access.ts` sous Node 24. Avant correctif : assertion `200 !== 403`. Après : secret absent et incorrect → 403 sans appel métier ; secret valide → 200 et un appel métier simulé. Aucun accès base. Désormais le secret est obligatoire dans tous les environnements.

Validation : check dédié, lint ciblé et TypeScript réussis. Navigateur privé sur le serveur local du worktree : POST sans Authorization → 403 avant et après push ; album sans session → 401, builder/jobs → 404. Le handler autorisé n'a pas été déclenché sur la base dev. Aucun build de production effectué.

### Moyenne — absence de limitation sur les appels directs d'authentification — ouvert

`src/app/auth-actions.ts` appelle `auth.api.signInEmail` et `signUpEmail`. Le limiteur Better Auth s'exécute dans le hook HTTP `router.onRequest` ; les appels directs passent par `toAuthEndpoints` et `dispatch`, sans ce hook.

Reproduction sans base : `timeout --kill-after=5s 60s node scripts/audit-auth-rate-limit.mjs`. Instance Better Auth en mémoire, limiteur activé : cinq appels directs → `[401,401,401,401,401]` ; cinq appels HTTP au handler → `[401,401,401,429,429]`. Cela prouve le contournement de la bibliothèque utilisée ; un scénario complet de bruteforce du formulaire Next n'a pas été exécuté. Aucune prise de compte démontrée.

Correction requise : limiter atomiquement les tentatives sur les deux chemins, avec stockage partagé adapté au déploiement et identité réseau issue d'un proxy de confiance. Tester concurrence, expiration, utilisateurs légitimes et cookies de session. Ne pas considérer un simple compteur mémoire comme une protection distribuée. Aucun correctif validé ici.

## Robustesse de la migration Supabase

Test réel sur PostgreSQL embarqué jetable (127.0.0.1:55439), arrêté et supprimé ensuite. Fixture User et séquence, rôles anon/authenticated avec droits ALL, droits par défaut permissifs. Migration exacte appliquée deux fois. Sous chaque rôle : SELECT, TRUNCATE et nextval refusés avec SQLSTATE 42501 ; propriétaire toujours autorisé ; nouvelle table sans droit SELECT anon. Aucun contact Supabase pour ce test.

La migration active RLS et révoque les grants directs existants. Limites structurelles : les futures tables n'activent pas automatiquement RLS ; les privilèges par défaut sont propres au créateur ; propriétaire/superutilisateur/BYPASSRLS restent privilégiés. Fonctions SECURITY DEFINER, vues, politiques existantes, héritages de rôles, grants PUBLIC/colonnes et autres schémas doivent être inventoriés séparément. Le check existant ne couvre ni toutes ces voies ni tous les privilèges (notamment TRUNCATE). Ces limites ne prouvent pas une exposition actuelle en production.

## Couverture et exclusions

| Domaine | Travail réalisé | Limite |
| --- | --- | --- |
| SQL injection | Recherche SQL brut dans src/lib : requêtes Prisma paramétrées dans leaderboard, duels et adventure-state | Pas de fuzz HTTP ni analyse de flux exhaustive |
| XSS | Point dangerouslySetInnerHTML de BattlePlayer alimenté par STATUS_FX statique | Pas de payload stocké/réfléchi testé en navigateur |
| CSRF | Lecture des contrôles Origin uploads et de la documentation locale Next sur Server Actions | Pas de test navigateur inter-origines complet |
| IDOR | Revue ciblée trades/auctions : userId issu de session, prédicats fromId/toId/ownerId | Pas de matrice dynamique à deux joueurs, concurrence non auditée intégralement |
| Auth/permissions | Session serveur, refus anonymes album/builder testés, contournement du limiteur prouvé isolément | Cookies, fixation, révocation et récupération non testés exhaustivement |
| Uploads | Revue : édition limitée au développement connecté, Origin, taille de flux, signatures PNG/JPEG/WebP, clés bornées, CSP sandbox/nosniff | Pas de corpus malveillant envoyé ; pas de test dimension/bombe image |
| Secrets | Aucun .env lu/affiché ; git ls-files ne recense que .env.example | Pas de scan de l'historique ni de détection exhaustive des secrets |
| Limites requêtes | Défaut auth et cron analysés | Pas de charge, déni de service ou mesure des quotas globaux |
| CodeQL | Compétence lue ; CLI absente du PATH | Extraction, extensions, suites, contrôle qualité et SARIF non exécutés |

Graphify query exécuté puis graphify update après correction. Extracteur SQL manquant (`tree_sitter_sql`) : le graphe ne remplace pas la lecture des migrations.

## Travail restant

Installer et exécuter CodeQL avec contrôle qualité et suites explicites, corriger le limiteur auth, puis exécuter les scénarios SQLi/XSS/CSRF/IDOR/auth/uploads sur une application reliée à une base jetable avec deux joueurs. Le navigateur local actuellement ouvert sur dev a seulement reçu les requêtes non mutantes/refusées décrites ci-dessus. Aucun compte test ni catalogue prod modifié. Ne pas interpréter l'absence de preuve sur les domaines non testés comme une absence de vulnérabilité.
