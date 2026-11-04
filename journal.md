# Journal des agents

## 2026-11-03 — Ancien CSS servi après intégration du dos de carte

- Symptôme : sur le serveur dev 3012, le navigateur affiche encore le fond rayé malgré le nouveau CSS présent dans le worktree et l'image accessible en HTTP 200.
- Cause : état périmé du serveur de développement ; origine exacte non isolée. Toucher le fichier CSS ne suffit pas.
- Correctif : redémarrer Next dans `anime_master-postgres`, sous Node 24 sur le port 3012. Parcours navigateur desktop/mobile, retournement au clavier, révélation complète et rechargement ensuite réussis.
- Occurrences : 1.
- Statut : corrigé.

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

## 2026-11-03 — Base locale : dossier configuré absent

- Symptôme : l'inscription sur le serveur de développement échoue avec `Cannot open database because the directory does not exist`.
- Cause : le chemin fourni par la configuration locale `DATABASE_URL` ne correspond pas à un dossier présent dans cette session.
- Contournement : pour vérifier les dos de cartes sans modifier la configuration ni les comptes existants, créer une sauvegarde SQLite de `data/app.db` dans `/tmp/anima-card-back-test.db` et démarrer Next avec `DATABASE_URL=file:/tmp/anima-card-back-test.db`.
- Occurrences : 1.
- Statut : contourné pour la vérification ; configuration locale inchangée.

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

## 2026-11-03 — Audit : clôture cron ouverte sans secret

- Symptôme : POST /api/auctions/close retourne 200 sans authentification lorsque CRON_SECRET manque ; reproduit par appel du handler avec clôture simulée (aucune base contactée).
- Cause : contrôle conditionné à la présence du secret (fail-open).
- Correctif : refuser aussi les configurations sans secret ; check-cron-access couvre secret absent, incorrect et valide.
- Gravité : moyenne, déclenchement non autorisé d'un traitement global ; aucun vol démontré, seules les enchères échues sont clôturées.
- Occurrences : 1.
- Validation : régression 200 avant / 403 après ; secret invalide refusé et secret valide accepté avec dépendance simulée. Lint ciblé et TypeScript réussis. Navigateur local privé : POST sans autorisation 403. Aucune clôture réelle.
- Statut : corrigé localement.

## 2026-11-03 — Audit : CodeQL indisponible

- Symptôme : command -v codeql ne trouve aucun exécutable.
- Cause : CLI absente du PATH ; compétence lue, analyse CodeQL non exécutée. Ne pas interpréter cette absence comme zéro alerte.
- Résolution : CLI officielle 2.27.4 installée dans le dossier local ignoré ; packs JavaScript officiels téléchargés ; qualité de base validée, suite explicite de 224 requêtes et modèles complémentaires exécutés.
- Incidents : premier essai arrêté en 137 ; second en 99 (mémoire Java insuffisante). Réussite avec Next arrêté, un thread et 3 Go. Diagnostics complémentaires interrompus en 124 ou verrou de cache : exécuter les requêtes sur une même base séquentiellement.
- Occurrences : 1.
- Statut : résolu pour la suite statique ; détails et triage dans le rapport d’audit.

## 2026-11-03 — Audit : limiteur HTTP contourné par les Server Actions auth

- Symptôme : cinq appels directs signInEmail refusés en 401 sans 429, alors que le handler HTTP retourne 401,401,401,429,429 avec les mêmes règles.
- Cause : signIn et signUp appellent auth.api directement ; le limiteur est exécuté dans router.onRequest, pas dans toAuthEndpoints/dispatch.
- Reproduction : scripts/audit-auth-rate-limit.mjs, instance Better Auth en mémoire, aucune base ni service externe ; limiteur explicitement activé.
- Gravité : moyenne, défense anti-bruteforce absente sur le chemin du formulaire ; aucune prise de compte démontrée.
- Suite : ajouter une limitation atomique partagée aux chemins auth, puis tester par HTTP et Server Actions. Un compteur mémoire par instance ne couvre pas une flotte Vercel.
- Occurrences : 1.
- Correctif : hook Better Auth commun HTTP/direct, compteurs PostgreSQL atomiques et expirants (10 par identité/minute, 300 global/minute), sans confiance dans un en-tête IP client. Table privée avec RLS. Erreurs internes masquées.
- Validation : vingt appels concurrents sur deux instances, dix refus normaux puis dix 429 ; HTTP et direct partagent les compteurs ; expiration/plafond global conformes. Navigateur : onzième tentative bloquée, connexion valide d’un autre compte réussie. TypeScript et lint ciblé réussis.
- Statut : corrigé sur base jetable ; migration à appliquer par l’humain sur les environnements distants avant utilisation du nouveau code.

## 2026-11-03 — Audit : artefacts CodeQL et surveillance Next

- Symptôme : pendant l'analyse, Turbopack attend sans cesse que les fichiers cessent de changer ; requêtes navigateur retardées.
- Cause : les journaux et bases CodeQL sont générés dans un répertoire non ignoré du worktree.
- Correctif : exclure static_analysis_codeql_*/ de Git et de la surveillance habituelle ; conserver les résultats locaux hors commits.
- Occurrences : 1.
- Statut : corrigé ; éviter les analyses lourdes pendant les parcours navigateur.

## 2026-11-03 — Audit : dates du limiteur et horloge PostgreSQL

- Symptôme : le test du plafond global autorise une tentative après injection d'une date d'expiration depuis Prisma.
- Cause : mélange de timestamp sans fuseau, de session Europe/Paris et de dates UTC dans les fixtures ; le compteur applicatif doit dépendre uniquement de l'horloge SQL.
- Correctif : colonne timestamptz, calculs atomiques par clock_timestamp ; tests d'expiration et plafond avec cette même horloge.
- Validation : deux instances, vingt requêtes concurrentes, normalisation, chemins HTTP/direct et expiration réussis sur base locale jetable.
- Occurrences : 1.
- Statut : corrigé. Prisma a refusé migrate reset ; ancienne base conservée, nouvelle base vide créée pour tester la migration corrigée sans réinitialisation.

## 2026-11-03 — Audit : manifeste des Server Actions en développement

- Symptôme : les sondes d'une action existante répondent 409 « Failed to find Server Action ».
- Cause : le test lisait .next/server (ancien build), tandis que Next 16 dev écrit .next/dev/server ; l'action doit aussi être appelée sur un worker qui l'importe.
- Correctif : lire le manifeste dev et appeler /character/[id] pour toggleLockAction ; ne lire ni afficher la clé de chiffrement du manifeste.
- Validation : action étrangère refusée, action propriétaire acceptée, origine hostile refusée ; changements vérifiés en base.
- Occurrences : 1.
- Statut : corrigé dans le script de pentest local.


## 2026-11-03 — Audit : évaluation des privilèges PostgreSQL sur les catalogues

- Symptôme : has_sequence_privilege signale qu’un objet pg_toast n’est pas une séquence, malgré le filtre relkind.
- Cause : l’optimiseur peut réordonner les évaluations de conditions ; le filtre WHERE seul ne protège pas l’appel de fonction sur un autre type d’objet.
- Correctif : CASE gardant l’appel has_sequence_privilege ; check étendu aux tables partitionnées, vues, colonnes, droits PUBLIC/hérités, séquences, routines et rôles BYPASSRLS.
- Validation : expositions artificielles détectées puis protection restaurée sur base jetable (y compris vue et héritage de rôle).
- Occurrences : 1.
- Statut : corrigé.

## 2026-11-03 — Audit : mises à jour transitives et alertes de développement

- Symptôme : npm audit signale initialement 5 dépendances à gravité haute et 17 modérées.
- Correctif : npm audit fix sans force, scripts d’installation désactivés, puis génération Prisma et vérifications. Lockfile actualisé dans les plages compatibles (Prisma CLI 7.10.1, deepmerge-ts, fast-uri, mysql2, zod).
- Validation : npm audit --omit=dev ne signale aucune vulnérabilité ; suite globale 54/54 réussie sur base jetable.
- Limite : 16 alertes modérées minimatch de l’outillage restent sans mise à jour compatible. Les consommateurs utilisent l’ancienne API ; ne pas imposer minimatch 11 ou rétrograder ESLint avec --force. Aucun motif glob de joueur n’alimente ces outils ; périmètre et risque résiduel décrits dans le rapport.
- Occurrences : 1.
- Statut : dépendances d’exécution corrigées ; alertes de développement documentées.

## 2026-11-03 — Audit : validation finale locale

- Validation : 54/54 étapes de la suite globale ; build de production sous Node 24 réussi. Pentest à deux joueurs réussi sur Next dev puis sur le build local en mode production. Tests navigateur desktop/mobile : inscription/session, déconnexion, limite à la onzième tentative, persistance après rechargement. CodeQL officiel+Community : 245 requêtes, qualité d'extraction validée, modèles supplémentaires, sources/sinks inventoriés ; triage dans docs/audit-securite-2026-11-03.md. Gitleaks : zéro alerte sur l'historique des sources avec exclusions explicites.
- Environnement : après redémarrage, /tmp a disparu ; résultats persistants conservés, outils réinstallés dans data/audit-tools, dernière base jetable PostgreSQL 14.24. pg_ctl nécessite -k /tmp en utilisateur non privilégié (socket /var/run/postgresql inaccessible).
- Limites : aucune migration distante ni publication pendant cet audit. Migration AuthThrottle indispensable avant utilisation distante du code ; 16 alertes modérées minimatch de développement documentées, zéro alerte npm sur les dépendances d'exécution. Pas de test de charge ou de garantie de sécurité absolue.
- Statut : audit ciblé et correctifs applicatifs validés localement ; publication réservée à l'utilisateur.

## 2026-11-03 — Pas de compte pour tester dans le navigateur

- Symptôme : `/histoire` redirige vers `/login` ; impossible de vérifier une fonctionnalité sur le site sans identifiants.
- Correctif : compte de test créé sur la base dev, identifiants dans `docs/compte-test.md`.
- Piège : l'inscription par API exige `username` et l'en-tête `Origin` doit valoir `BETTER_AUTH_URL` (port 3012), pas le port du serveur de dev.
- Occurrences : 1.
- Statut : résolu.

## 2026-11-03 — check-content-sync cassé par une nouvelle migration

- Symptôme : `npm run check` en CI : seul `check-content-sync.ts` échoue (code 1), les 54 autres étapes passent.
- Cause : ce check créait ses bases jetables avec la seule migration initiale (`20261102160000_init_postgres`) puis utilisait le client Prisma courant ; la colonne `User.role` (migration `admin_roles`) manquait. Le découpage naïf sur « ; » aurait aussi coupé les blocs `DO $$ … $$` des migrations suivantes.
- Correctif : appliquer toutes les migrations dans l'ordre, avec un découpeur qui respecte les blocs `$$`. Piège à retenir : toute nouvelle migration qui touche `User`, `Card`, `PackOpening` ou `Character` casse ce check si la liste est figée.
- Non vérifié en local : pas de Postgres de test avec `CREATE DATABASE` (CHECK_DATABASE_URL absent). Le découpeur a été validé sur les 5 migrations ; le check complet reste à confirmer par la CI.
- Occurrences : 1.
- Statut : corrigé, à confirmer par la CI.

## 2026-11-03 — Site entier en erreur après publication : migrations non appliquées à la prod

- Symptôme : toutes les pages connectées échouent (« This page couldn't load », « Une erreur est survenue » à l'inscription). Logs Vercel : `Failed to get session` puis `The column User.role does not exist in the current database` (P2022).
- Cause : `production:publish` a mis en ligne du code qui attendait les migrations `20261103030000_admin_roles` et `20261103040000_game_events`, jamais appliquées à la base prod. Le même piège était déjà arrivé pour `auth_throttle` (inscription en « Authentification temporairement indisponible »).
- Correctif : `npm run db:deploy` sur la prod, avec `DATABASE_URL` et `DIRECT_URL` fixées ensemble (`prisma.config.ts` lit `DIRECT_URL` en premier et le `.env` local la pointe vers dev). Procédure ajoutée dans `docs/deploiement.md` §10.
- Piège connexe : le Session pooler Supabase est limité à 15 clients (`EMAXCONNSESSION`) ; pool réduit à 2 par instance et session en cache cookie. Un premier essai du Transaction pooler avait échoué parce qu'il avait lieu pendant une saturation ; à froid, il tient 10 utilisateurs simultanés sans échec (DATABASE_URL en 6543, DIRECT_URL en 5432). Ne jamais conclure sur un pooler juste après une rafale de tests.
- Occurrences : 2 (auth_throttle, puis admin_roles et game_events). À proposer en règle dans AGENTS.md avec l'accord de l'utilisateur.
- Statut : correctif de doc fait, migration prod à confirmer.

## 2026-11-03 — Écritures qui se figent (combat, booster, équipe) : verrou `User` laissé par une transaction orpheline

- Symptôme : « Ouverture… » ou boutons de combat grisés indéfiniment, puis `57014 canceling statement due to statement timeout` (ex. `StoryStageStar.createMany`). Les pages en lecture restent rapides.
- Cause : `getAdventure` (appelé par l'en-tête de chaque page) ouvrait une transaction avec `SELECT … FOR UPDATE` sur `User` même sans rien à écrire. Si la requête était interrompue en cours de route, la session restait « idle in transaction » avec le verrou et bloquait toutes les écritures du joueur (`pg_stat_activity` : `pg_blocking_pids` pointe la session orpheline).
- Correctif : lecture seule d'abord, transaction uniquement s'il y a des objectifs ou niveaux à enregistrer (`adventure-state.ts`, commit 3badae7). Dépannage en attendant : `pg_terminate_backend` des sessions `idle in transaction` > 10 s.
- À envisager : `idle_in_transaction_session_timeout` côté base en filet de sécurité.
- Occurrences : 1 (plusieurs sessions orphelines le même jour).
- Statut : corrigé dans main, à publier et à confirmer en prod.

## 2026-11-03 — Son de projectile limité à deux exemples de sorts

- Symptôme : le son descendant ne jouait que pour Zoltraak et Kamehameha, alors que la demande portait sur tous les projectiles magiques non élémentaires sans son dédié.
- Cause : les exemples avaient été traités comme une liste exhaustive ; le seul événement de lancement ne permet pas de distinguer une attaque générique d'un buff/debuff seul.
- Correctif : pour le style projectile magique non élémentaire, attendre le premier événement de dégâts ou d'esquive pour jouer le son à l'impact, une fois par action. Conserver le lancement anticipé des rayons explicitement identifiés et la priorité des éléments.
- Occurrences : 1.
- Validation : cas positifs génériques et rayons nommés, exclusions des cibles alliées, soins et debuffs seuls, priorité élémentaire et absence de doublon en zone.

## 2026-11-03 — Inscription locale refusée (« Invalid origin ») sur un autre port que 3012

- Symptôme : `POST /api/auth/sign-up/email` renvoie `INVALID_ORIGIN` quand le serveur de dev tourne sur le port 3100.
- Cause : `BETTER_AUTH_URL` vaut `http://localhost:3012` dans `.env` ; Better Auth n'accepte que cette origine.
- Contournement : lancer `next dev -p 3012` pour les vérifications avec connexion (et envoyer `Origin: http://localhost:3012`).
- Occurrences : 1.

## 2026-11-03 — Sept sessions en parallèle saturent la machine

- Symptôme : load average ≈ 38, mémoire presque pleine, `npm install` de 20 min, première compilation de 10 min, deux sessions en échec (« timed out while registering its MCP tools »).
- Cause : chaque session avait son worktree, son `npm install`, son `next dev` et son navigateur headless.
- Contournement : une seule branche, un seul serveur à la fois, arrêté après chaque vérification.
- Occurrences : 2 (sept sessions le 2026-11-03 ; serveurs de deux checkouts et rechargements en boucle le 2026-11-04).
- Complément du 2026-11-04 : pendant la vérification des guildes, `next dev` recharge `/guilds` en continu (compilations 1–3 ms) et les champs sont détachés pendant la saisie. Un autre checkout exécutait aussi son serveur. Cause exacte de la boucle non établie ; arrêt de notre serveur et vérification du build local avec `next start`, sans toucher à l’autre session.

## 2026-11-03 — En-tête des ressources : navigation et XP masquées aux largeurs intermédiaires

- Symptôme : après ajout des Ryō et de l’XP, les liens de navigation se chevauchent à 1280 px ; l’XP est masquée sous 1500 px.
- Cause : la navigation complète conserve trop de colonnes et les anciens seuils cachaient le bloc joueur.
- Correctif : réutiliser le menu compact sous 1500 px, garder ressources et XP visibles et répartir l’en-tête sur deux rangées sur téléphone.
- Occurrences : 1.
- Validation : ressources et XP visibles à 1440 et 390 px, aucun débordement horizontal ; menu mobile, verrous et lien Paramètres testés.

## 2026-11-03 — Styles des contrôles prioritaires sur les nouveaux composants

- Symptôme : « Récupérer » reste gris et le choix du lot déborde à gauche sur téléphone. Les pastilles des filtres perdent leur contour.
- Cause : spécificité du sélecteur partagé des boutons, grille d’ouverture à deux colonnes trop large, suppression globale des bordures.
- Correctif : sélecteurs des récompenses dans le shell, une colonne pour les contrôles sur téléphone, contour des pastilles avec outline.
- Occurrences : 4 (récompenses/filtres, bouton d’ouverture, actions de préparation histoire, puis emplacements sans carte le 2026-11-03).
- Validation : doré calculé #c4a76d et fond transparent sur « Récupérer » ; commandes ×5/×10 dans la largeur à 390 px ; contours des pastilles présents. Corrigé.

- Complément : `identity.css` redessinait un encadrement via `::after` et `controls.css` ajoutait un fond via `::before`. L’ouverture reçoit désormais un style textuel partagé, assez spécifique pour neutraliser ces deux couches ; son prix reste dans le sélecteur. Le même style partagé `text-action` est réutilisé pour les actions histoire. Les emplacements vides, sans image ni SVG, étaient aussi capturés par le sélecteur des boutons textuels : affichage horizontal et proportions cassées. Le sélecteur explicite `button.hs-card-choice` dans le shell doit rester prioritaire, y compris sans carte.

## 2026-11-03 — Reprise des quatre visuels validés (feedback Lester)

- Branche : `chantier/feedback-lester`, checkout `anime_master-postgres`. Travail séquentiel, un seul Next dev sur 3012.
- Vérifications navigateur : Ryō/XP/engrenage, menu compact et verrous ; succès individuel puis tout récupérer (versements et persistance) ; quête quotidienne après trois ouvertures (+2 cristaux, persistance), onglet hebdomadaire et exclusion des quêtes inaccessibles ; booster gratuit ×10 unique sans débit ; deux ×5 faisant avancer le boost ; choix ×10 ; animations SSR et UR (UR déclenchée par une fixture de pity sur le compte jetable uniquement) ; album Tous, filtres SSR+Combat, compteur 1/2, effacement, largeurs 1440/390.
- Vérifications techniques : typecheck, ESLint ciblé, check-achievements et check-periodic-quests réussis.
- Suite : refonte des cadres reportée à la demande de l’utilisateur ; conserver les cadres actuels du site. Les propositions dans `docs/maquettes/cadres-personnages.html` sont archivées, non validées et ne doivent pas être intégrées. Carte histoire, combat, sons et social restent à traiter avec maquette préalable. Aucun autre agent à relancer ; ne pas publier en production.
- Complément du 2026-11-03 : quêtes principales Histoire/Découverte rétablies à la demande de l’utilisateur (XP automatique conservée), en plus des périodiques ; filtres, pagination, état accompli après rechargement et lien Histoire testés à 1280/390 px. Bouton d’ouverture transparent et prix uniquement dans le sélecteur, ouverture ×10 et état désactivé pendant la révélation vérifiés, puis reconfirmés après push. Typecheck et lint ciblé réussis. La maquette des cadres est vérifiée à 728/390 px, simulation des cinq raretés et bascule petit/grand testées.

- Itération des cadres : l’utilisateur demande davantage de noir, nuances, textures légères, reflets et contrastes. Maquette révisée avec grain fixe, métal sombre et éclairage des arêtes ; sprite héraldique et couleurs de rareté conservés. Vérifiée à 728/390 px, cinq raretés et bascule petit/grand. Intégration toujours en attente du choix utilisateur.

- Nouvelle itération des cadres : DA sombre appréciée, rareté jugée trop discrète. Sceau héraldique agrandi, libellé de rareté renforcé et conservé à 120 px, arêtes davantage teintées. Simulation des cinq raretés et absence de chevauchement avec le type vérifiées ; maquette seule, en attente du choix A/B avant intégration.

- Itération suivante : noir encore trop dominant selon l’utilisateur. Cadre et cartouche éclaircis et teintés par la rareté ; sceau plein coloré avec emblème et texte foncés. Nuances, grain et reflets conservés. Vérification HTML 728/390 px, cinq raretés et mode compact sans chevauchement réussie ; intégration en attente de validation.

- Décision finale utilisateur sur les cadres (2026-11-03) : « laisser comme avant », propositions non retenues, sujet reporté. Aucune modification des cadres n’a été intégrée à l’application ; conserver son rendu existant et ne pas reprendre cette refonte sans nouvelle demande.

## 2026-11-03 — Reprise histoire : prévisualisation sans nouveau moteur

- Contexte utile : `storyEnemies(universe, level)` produit déjà les quatre ennemis de façon déterministe avec une graine par univers/combat ; Rob Lucci (10) et Doflamingo (15) sont imposés. Réutiliser cette fonction pour le futur écran VS, sans lancer de combat pour obtenir un aperçu.
- Carte existante : `StoryMap.tsx`, illustrations `public/story-map/`, `StoryDrops` et `StarRewards` réutilisables. L’équipe quatre cartes est déjà enregistrée via `setAttackTeam`. Le duo existe et doit rester accessible depuis la préparation.
- Maquette dans `docs/maquettes/histoire-parcours.html` : carte ascendante, paliers et objets sous la carte ; clic sur un jalon ouvrant une préparation quatre contre quatre avec puissances, changement de compagnon, composition conservée, duo et aperçu de transition. Données de personnages et ennemis exportées en lecture seule depuis la base dev ; progression d’exemple et aucun combat réel lancé.
- Validation : aperçu HTML à 728/390 px, sens du chemin et jalons verrouillés, quatre emplacements par camp, sélection sans doublon, retour carte/préparation conservant l’équipe, duo et réserves, entrée/sortie de transition, absence de débordement. Les animations prennent en compte `prefers-reduced-motion`.
- Statut : parcours validé par l’utilisateur le 2026-11-03 (« je valide »). Intégration en cours ; les cadres restent inchangés.

- Pour l’intégration des puissances : `Character.power` représente la popularité. Réutiliser le calcul du moteur (`equippedCards` / `combatPowers`, avec équipement, éveil et synergies) pour le total réel ; les valeurs de la maquette sont un échantillon de démonstration.

- Intégration histoire : la transition de départ doit passer à l’état visible avant `startTransition` ; à l’intérieur, React peut différer son affichage jusqu’à la fin de l’action serveur et la rendre imperceptible. État urgent avant l’action, durée minimale 550 ms, sans délai si réduction des animations.

- Intégration du parcours validé terminée sur `chantier/feedback-lester` : carte par acte ascendante, récompenses/objets dessous, préparation avec vrais ennemis et puissances du moteur, choix sans doublon, sauvegarde serveur des remplacements à quatre et brouillon/duo par compte dans le navigateur, transition et retour à la carte.
- Vérifications avant commit : navigateur 1440/1024/390 px ; remplacement, retour carte/préparation et rechargement ; duo/réserves, composition automatique, lancement réel quatre/duo, transition normale et animations réduites, victoire et progression persistée, abandon, erreur d’une carte devenue indisponible ; récompense d’étoiles réclamée puis persistée, navigation des trois actes, Lucci au combat 10 et Doflamingo au 15, fermeture du sélecteur avec Échap, reprise dans Naruto après One Piece.
- Contrôles : typecheck et ESLint TypeScript réussis, `check-story-map.ts` et nouveau `check-story-preparation.ts` réussis (aperçu sans écriture, verrous, parité des ennemis et puissances avec le moteur, éveil/artefact, quatre/duo), build complet réussi sous Node 24. `graphify update .` réussi ; ses fichiers déjà modifiés avant reprise restent hors du commit de fonctionnalité.
- Détail de catalogue pour les tests : les noms en base sont « Lucci Rob » et « Doflamingo Donquixote » ; les noms d’affichage des jalons sont dans `STORY_BOSSES`. Identifier les boss par leur `characterId` dans les assertions de données.
- Suite : maquette du visuel de combat, puis audio, donjons, social et tutoriel, un lot à la fois. Les cadres restent inchangés. Aucun serveur supplémentaire et aucune publication en production.

## 2026-11-03 — Contraste de la carte histoire signalé par l’utilisateur

- Symptôme : « Grand Line » et les légendes des jalons se perdent sur les nuages blancs. Le jalon courant paraît trop simple.
- Cause : titre blanc sans protection de contraste locale ; légendes posées directement sur l’image claire.
- Correctif : ombre sombre localisée derrière le titre, texte ivoire/doré ; jalons héraldiques avec sceau intérieur, épées du sprite, numéro et libellés sur fond sombre. Emplacements vides également corrigés à partir des captures utilisateur.
- Validation : navigateur à 1440/390 px sur compte neuf sans cartes : titre, cinq jalons, verrous, préparation au clic, quatre emplacements verticaux au ratio des cartes et libellés dessous, sélection vide, fermeture Échap, focus clavier et légende du jalon courant non coupée. Typecheck, ESLint ciblé, contrôle de carte et actualisation Graphify réussis. Build complet non relancé pour cette retouche visuelle.

## 2026-11-04 — Server Actions déclarées en `export const` : `tsc` ne les voit pas, Next les refuse

- Symptôme : `/friends` affiche « Build Error : Server Actions must be async functions » (aucune erreur au typecheck) ; l'overlay de dev provoque des rechargements en boucle, le serveur monte à 2 Go et 180 % de CPU, et l'onglet de prévisualisation ne répond plus.
- Cause : `export const uneAction = (x) => run(...)` dans un fichier `"use server"`. Seules les `export async function` sont acceptées.
- Correctif : déclarer chaque action avec `export async function`. Après un nouveau fichier d'actions, ouvrir la page dans le navigateur avant de conclure : `tsc` et ESLint ne suffisent pas.
- Aggravant : une autre session lançait `tsc` en même temps (charge > 30). Attendre qu'elle ait fini avant de rouvrir l'onglet.

## 2026-11-04 — Reprise du social : étape guildes

- État retrouvé : amis poussés dans `f343375`, branche `chantier/social`. L’utilisateur a validé l’étape guildes ; la précédente tentative n’avait fait que lire le schéma, sans code de guilde.
- Réutilisation : formule Collection de `leaderboard.ts`, boutons/panneaux de la direction artistique, emblèmes du sprite. Le chat est réservé à l’étape suivante ; ne pas réintroduire les emojis prévus par l’ancienne spec, contraires à `docs/direction-artistique.md`.
- Point sensible : ajouter `GUILD_CREATE` au ledger et protéger débit, unicité d’appartenance, capacité et transmission du chef par transaction. Tester les accès par rôle et les doubles clics, pas seulement le chemin nominal.

## 2026-11-04 — Lint React Compiler et heure courante dans un composant serveur

- Symptôme : `react-hooks/purity` refuse `Date.now()` dans les pages serveur des guildes, malgré le typecheck et le build réussis.
- Cause : l’évaluation du délai de réadhésion était faite pendant le rendu React.
- Correctif : calculer cet état dans les lecteurs de données (`listGuilds`, `getGuild`) puis transmettre le résultat au rendu. La garde transactionnelle côté serveur reste la référence pour les mutations.
