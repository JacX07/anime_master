# Journal des agents

## 2026-11-02 — Décision de dépôt privé non encore appliquée

- Symptôme : pendant la configuration CI, la lecture sans authentification de l'API GitHub renvoie `private: false`, `visibility: public` pour `JacX07/anime_master`.
- Cause : la décision de rendre le dépôt privé est documentée, mais le réglage GitHub est encore public.
- Suite : utilisateur informé ; visibilité laissée inchangée pendant la tâche CI. Vérifier le forfait et les protections avant le passage en privé.
- Occurrences : 1.
- Statut : ouvert.

## 2026-11-02 — Contexte runner dans les variables du workflow GitHub

- Symptôme : actionlint refuse `runner.temp` dans `jobs.check.env`.
- Cause : le contexte `runner` est disponible dans les variables d'une étape, pas dans celles du job.
- Correctif : définir `TMPDIR` sur l'étape `npm run check`, conserver le même chemin pour l'artefact des journaux.
- Occurrences : 1.
- Statut : corrigé avant le premier push du workflow.

## 2026-11-02 — Périmètre du lint global et catalogue des checks

- Symptôme : le lint global parcourt PixiJS minifié et un script local dans `data/` ; il signale aussi l'initialisation des préférences audio après hydratation. Les checks de bannières exigent plus de 100 personnages de chaque genre.
- Cause : ESLint n'utilise pas les exclusions Git ; la règle React ne distingue pas cette lecture initiale de localStorage d'un état dérivé inutile. Un catalogue d'une centaine de personnages ne couvre pas les assertions existantes.
- Correctif : exclure les répertoires générés, outils tiers et données locales ; documenter une exception limitée à la lecture des préférences après hydratation, sans changer le comportement. Versionner un catalogue fixe de 368 personnages pour la suite isolée.
- Occurrences : 1.
- Validation : première suite globale limitée à 60 s interrompue avec code 124 ; le lanceur a arrêté le check en cours et supprimé ses bases. Avec 60 s par étape et une borne globale de 3 300 s, les 50 étapes (dont 45 checks) passent. Ne pas confondre le délai d'un check et la somme des délais de la suite.
- Statut : corrigé sur `migration/postgres`.

Bugs et manques de contexte rencontrés une fois. Voir la section « Journal et promotion en règle » de `AGENTS.md`.
Format : `## AAAA-MM-JJ — titre` puis symptôme, cause, correctif, occurrences, statut (ouvert / promu en règle).

## 2026-11-02 — Node du serveur et module SQLite natif

- Symptôme : après redémarrage, les pages authentifiées échouent avec `ERR_DLOPEN_FAILED` ou « Module did not self-register » pour `better_sqlite3.node`.
- Cause : le shell utilise Node 20 par défaut ; le module installé est compilé pour Node 24 (ABI 137).
- Contournement vérifié : démarrer Next avec `/home/jxu002/.nvm/versions/node/v24.21.0/bin/node node_modules/next/dist/bin/next dev`. Pour un build npm, préfixer le PATH avec le répertoire de cette version.
- Occurrences : 2. (1) 2026-11-02, incident pendant la vérification de la refonte des artefacts, affectant les redémarrages en développement et en production.
  (2) 2026-11-02, serveur de prod `next start -p 3001` (base `play.db`) lancé via `npx` sous Node 20 ; relancé avec le binaire Node 24.
- Statut : promu en règle (AGENTS.md, section « Command timeouts and resource limits ») le 2026-11-02 ; `nvm alias default 24` appliqué.

## 2026-11-02 — Traits décoratifs effacés par la remise à zéro des bordures

- Symptôme : le petit angle en haut à gauche des squads est absent dans le navigateur malgré un pseudo-élément présent.
- Cause : `src/app/reference.css` impose `border-style: none !important` à tous les éléments et pseudo-éléments de l’interface.
- Correctif : dessiner les deux traits décoratifs avec des fonds CSS de 1px, sans réintroduire de bordures ni modifier la règle globale.
- Occurrences : 1.
- Statut : corrigé.

## 2026-11-02 — Vérification TypeScript sous forte pression mémoire

- Symptôme : une seconde vérification TypeScript dépasse son délai de 60 s (code 124), après une première vérification réussie.
- Contexte observé : nombreuses navigations Next en développement ; environ 68 Mo de RAM libres et 2 Go de swap entièrement utilisés, plusieurs processus de navigateur actifs. La pression mémoire est une cause probable, non isolée.
- Contournement : fermer l’onglet de vérification appartenant à la tâche, attendre la fin de graphify et lancer les contrôles séquentiellement avec Node 24. Ne pas arrêter les autres navigateurs ou serveurs.
- Occurrences : 1.
- Résultat : le contrôle TypeScript relancé seul après fermeture de l’onglet et fin de graphify a réussi (code 0).
- Statut : contourné.

## 2026-11-02 — Historique SQLite lors du passage à Postgres

- Symptôme : les migrations SQLite et `play:sync` ne peuvent pas utiliser le provider Postgres.
- Cause : les migrations SQL sont propres au moteur ; Better Auth possède aussi son propre réglage de provider.
- Correctif : archiver le schéma et les migrations dans `prisma/sqlite/`, réserver `prisma.sqlite.config.ts` aux anciennes bases, créer une migration initiale Postgres et passer Better Auth à `postgresql`.
- Occurrences : 1.
- Complément du 2026-11-02 : `content:sync` transfère les quatre tables de contenu en transaction, avec aperçu annulé par défaut. Exclure `pullCount` des insertions comme des mises à jour évite d'importer les compteurs SQLite et de casser les numéros des cartes existantes ; préserver aussi `createdAt` à la mise à jour. Les bannières de test et travaux d'agents restent exclus.
- Statut : corrigé sur la branche de migration ; transfert du contenu distinct de `play:sync`, réservé aux anciennes bases SQLite.

## 2026-11-02 — Port du Postgres jetable

- Symptôme : Prisma échoue avec P1001 sur le port 55432 après un démarrage manuel via pg_ctl.
- Cause : pg_ctl reprend le port par défaut 5432 sans les options utilisées par embedded-postgres.
- Correctif : démarrer explicitement avec `-o '-p 55432 -h 127.0.0.1'`.
- Occurrences : 1.
- Statut : corrigé.

## 2026-11-02 — Branche main incomplète pour les contrôles globaux

- Symptôme : le typecheck d'un worktree propre créé depuis d72a203 échoue sur DUNGEONS, les statuts earth et les champs de statistiques de combat.
- Cause : des consommateurs sont déjà commités tandis que leurs dépendances font partie des changements non commités d'autres agents dans le worktree principal.
- Contournement : ne pas incorporer ces changements à la migration Postgres ; distinguer les erreurs de base des régressions de migration. Générer les types de routes avec `next typegen` dans un worktree neuf.
- Occurrences : 1.
- Résolution : reprise autorisée par l’utilisateur des ajouts combat/donjons présents dans le worktree principal, sans modifier celui-ci.
- Statut : corrigé sur migration/postgres ; TypeScript et build de production passent.

## 2026-11-02 — SQL brut non recensé par le plan Postgres

- Symptôme : le check des succès échoue avec `relation "card" does not exist` sur Postgres.
- Cause : contrairement au plan, `src/lib/leaderboard.ts` utilise du SQL brut sans guillemets sur les noms camelCase/PascalCase ; Postgres les convertit en minuscules. Le script historique migrate-artifact-substats possède le même défaut.
- Correctif : citer les noms de tables, colonnes et alias concernés dans les deux requêtes.
- Occurrences : 1.
- Statut : corrigé sur la branche de migration.

## 2026-11-02 — Concurrence et JSONB sur Postgres

- Symptôme : deux lectures d'Arpenteur créent le même objectif ; deux défis dépassent le quota journalier lors du changement de date ; les comparaisons de replay par JSON.stringify échouent.
- Cause : Postgres autorise les transactions concurrentes que SQLite sérialisait ; JSONB ne conserve pas l'ordre des propriétés.
- Correctif : verrouiller la ligne du joueur avant les lectures/écritures de ces deux transactions ; comparer structurellement les objets JSON dans les checks de replay.
- Occurrences : 1.
- Statut : corrigé sur la branche de migration, checks dédiés relancés.

## 2026-11-02 — Entiers des fixtures et upsert concurrent

- Symptôme : les checks équipement/armes dépassent la plage INTEGER ; le check histoire crée deux fois StoryStageStar.
- Cause : les fixtures utilisent Date.now() comme numéro de carte (SQLite acceptait 64 bits) ; un upsert avec update vide peut être émulé par Prisma et entrer en concurrence.
- Correctif : attribuer les numéros des fixtures via pullCount ; remplacer l'upsert vide par createMany avec skipDuplicates avant l'amélioration conditionnelle des étoiles.
- Occurrences : 1.
- Statut : corrigé sur la branche de migration.

## 2026-11-02 — Statuts VFX incomplets et scénario Makima non déterministe

- Symptôme : check-combat-vfx échoue dès counter ; check-kits ne voit aucun cas d'exécution du dernier ennemi contrôlé.
- Cause : dix statuts moteur n'ont pas de correspondance dans STATUS_FX ; le scénario Makima repose sur trente combats automatiques sans garantir que l'ultime soit prêt avant la mort de l'unique ennemi.
- Correctif : réutiliser les effets existants pour les dix statuts ; créer une situation déterministe avec jauge chargée puis vérifier contrôle, K.-O. et victoire dans cet ordre.
- Occurrences : 1.
- Statut : corrigé et checks dédiés réussis.

## 2026-11-02 — Double clic manuel après une première écriture

- Symptôme : check-battles observe parfois deux actions acceptées et un journal incomplet.
- Cause : le verrou compare le compteur lu par chaque requête ; la seconde peut lire la ligne après la première écriture et être prise pour une nouvelle action.
- Correctif : transmettre le compteur affiché dans BattleView et le vérifier avant le rejeu puis à l'écriture. Les Server Actions exigent un compteur entier positif ou nul.
- Occurrences : 1 (intermittent).
- Statut : corrigé et checks dédiés réussis.

## 2026-11-02 — Publication et protection du dépôt privé

- Symptôme : GitHub Free ne permet pas les protections de branches d'un dépôt privé personnel ; `gh` n'est pas installé dans l'environnement local.
- Cause : limitation du forfait, distincte de la CI ; l'authentification Git SSH ne donne pas accès à l'API privée.
- Contournement : commande Node de publication utilisant l'API Actions (jeton Actions en lecture pour un dépôt privé) et Git SSH pour le push. Aperçu par défaut, CI du SHA exact de main exigée et publication en avance rapide seulement.
- Limite : un push direct contourne ce contrôle local. GitHub Pro permettrait une protection côté serveur. La visibilité du dépôt reste inchangée.
- Occurrences : 1.
- Validation : check dédié réussi (CI rouge/absente/ignorée, erreur API, branches mobiles, aperçu sans écriture, push sur dépôt Git jetable, divergence). TypeScript et lint réussis. Aperçu réel refusé pour main@d72a203 sans CI. Aucun push vers production ni test du site déployé ; hébergement non configuré.
- Décision utilisateur : publication réservée à l’humain ; commande interdite aux agents même en aperçu, ainsi que toute fusion ou tout push vers production.
- Statut : implémenté sur migration/postgres ; restriction des agents promue en règle dans AGENTS.md le 2026-11-02, sur demande explicite de l’utilisateur.

## 2026-11-02 — Scripts tsx CommonJS

- Symptôme : un nouveau check avec await au niveau module échoue à la transformation (« Top-level await ... cjs output format »).
- Cause : le package n'est pas déclaré ESM ; tsx exécute les scripts TypeScript en CommonJS.
- Correctif : encapsuler le check dans main async et utiliser require.main === module pour le point d'entrée de publication importable.
- Occurrences : 1.
- Statut : corrigé pendant le développement.

## 2026-11-02 — Connexions Supabase dans deux worktrees

- Symptôme : les modifications utilisateur du .env ne sont pas prises en compte par les commandes de migration ; puis Supabase renvoie 28P01.
- Cause : fichier modifié dans anime_master alors que la migration s’exécute depuis anime_master-postgres ; identifiants de connexion corrigés ensuite par l’utilisateur.
- Correctif : recopier uniquement DATABASE_URL et DIRECT_URL entre les fichiers locaux, sans afficher les secrets ni remplacer les autres variables. Connexions vérifiées en lecture seule après correction.
- Validation dev : migration 20261102160000_init_postgres appliquée à la cible dev indiquée par l’utilisateur ; import depuis data/app.db SQLite en lecture seule : 3 411 Media, 4 717 Character, 14 934 CharacterMedia et 1 SpellOverride. Aperçu annulé avant application ; second import appliqué : zéro écriture dans les quatre tables. User, Session et Card restent à zéro.
- Limites : aucun import prod, aucune publication, aucun parcours navigateur vérifié pendant cette opération. Les anciens fichiers SQLite sont conservés.
- Occurrences : 1.
- Statut : contourné ; configuration locale non versionnée.

## 2026-11-02 — Illustrations locales après import du catalogue Supabase

- Symptôme : pendant le test navigateur dev, /api/illustrations/character-88572 renvoie 404 après l’import du catalogue.
- Cause : content:sync copie les URLs des illustrations mais pas les fichiers data/illustrations ; le worktree Postgres ne possède pas ces fichiers locaux.
- Contournement local : copie sans écrasement des 74 fichiers (environ 9 Mo) depuis anime_master/data/illustrations vers le worktree Postgres ; stockage persistant encore à traiter avant Vercel.
- Occurrences : 1.
- Validation : après copie locale, les images du booster chargent dans le navigateur. Le problème Vercel reste ouvert.
- Correctif Vercel : export validé des images vers public/illustrations avec noms SHA-256 et manifeste versionné ; redirection des anciennes URLs, ressources sans lecture de data en production, éditeur et écritures bloqués hors développement.
- Piège de vérification : un refus notFound dans le contenu suspendu peut envoyer d’abord une réponse HTTP 200 et le squelette de l’éditeur ; placer le refus de production au début de la page.
- Validation : 37 images exportées (63 références avec les SVG), tests des signatures/empreintes et du rejeu de l’export, refus des chemins invalides. Build de production réussi ; ancienne URL redirigée (307) vers un fichier image 200 et cache immutable ; catalogue de 39 ressources disponible pendant le retrait temporaire du dossier local (rétabli ensuite). Navigateur : images chargées, page éditeur 404, POST et DELETE 403 avec session connectée.
- Statut : corrigé sur migration/postgres ; déploiement Vercel non effectué.

## 2026-11-02 — Navigation débordante sur mobile

- Symptôme : test navigateur Supabase dev à 390 × 844 ; la navigation principale dépasse la largeur et le bouton JOUER est hors écran.
- Contexte : écran /combat ; contenu principal lisible mais barre supérieure non adaptée à cette largeur.
- Cause : les styles imposaient une navigation de 760 à 850 px dans une barre mobile, avec logo et compte fixes.
- Correctif : navigation partagée repliable sous 1 100 px, liens secondaires visibles au toucher, fermeture après choix ou avec Échap et retour du focus au bouton. Styles regroupés dans reference.css ; barre desktop conservée.
- Validation : navigateur connecté et invité, largeurs 320, 390, 768, 1024 et 1280 px ; liens du compte dans l’écran, ouverture de Jouer, navigation vers Squads, fermeture automatique et clavier. TypeScript et lint ciblé réussis.
- Occurrences : 1.
- Statut : corrigé sur migration/postgres.

## 2026-11-02 — Désactivation Vercel des branches avec barre oblique

- Contexte : seuls les pushes humains sur production doivent déclencher un déploiement Git automatique.
- Piège : git.deploymentEnabled utilise minimatch ; une étoile seule ne couvre pas tous les noms contenant /, tels que migration/postgres. Une règle true l’emporte si plusieurs règles correspondent.
- Correctif : vercel.json avec **: false et production: true. Ce fichier doit être présent dans chaque branche concernée ; il ne modifie pas globalement les réglages du projet Vercel.
- Occurrences : 1.
- Statut : configuration préparée sur migration/postgres, vérification du comportement Vercel distant non accessible depuis la session.

## 2026-11-03 — Outils de sauvegarde PostgreSQL absents

- Symptôme : pg_dump et pg_restore sont absents ; le paquet binaire embedded-postgres contient uniquement postgres, initdb et pg_ctl.
- Cause : les binaires nécessaires aux tests embarqués ne couvrent pas les outils clients de sauvegarde.
- Contournement : récupérer les paquets clients PostgreSQL officiels dans un dossier temporaire, sans modifier les dépendances du projet ; utiliser le serveur embarqué pour vérifier une restauration locale.
- Occurrences : 1.
- Complément : avec --ignore-scripts, exécuter le script hydrate-symlinks.js du paquet embarqué avant de lancer son serveur (liens libpq/ICU manquants sinon).
- Validation : clients officiels 17.11 extraits sans installation globale ; sauvegardes initiale et catalogue restaurées sur un serveur local 17.11 jetable, arrêté et supprimé après les contrôles.
- Statut : contourné ; sauvegardes privées conservées dans data/backups, hors Git.

## 2026-11-03 — Droits API Supabase hérités sur les tables Prisma

- Symptôme : après la migration initiale, User, Account, Session et Card ont RLS désactivé et les rôles anon/authenticated possèdent SELECT.
- Cause : les privilèges par défaut Supabase s’appliquent aux tables Prisma créées dans public ; l’application utilise Better Auth et Prisma, pas l’API de données Supabase.
- Correctif : migration complémentaire activant RLS sans politique publique et révoquant les droits des rôles API Supabase présents, y compris les privilèges par défaut du rôle de migration. Les rôles propriétaires utilisés par Prisma conservent leur accès.
- Occurrences : 1.
- Validation : migration appliquée sur dev et prod ; check-database-access réussit sur les deux, lecture Prisma conservée et aucun privilège direct pour les rôles API. Rejeu de synchronisation après protection : zéro écriture. Reconnexion navigateur dev et équipe conservée après migration. Sauvegarde du catalogue restaurée en local avec RLS préservé et comptes/cartes toujours à zéro.
- Statut : corrigé avant ouverture ; publication du site toujours réservée à l’utilisateur.
