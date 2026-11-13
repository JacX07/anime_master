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
- Occurrences : 5 (récompenses/filtres, bouton d’ouverture, actions de préparation histoire, emplacements sans carte le 2026-11-03, cartes de version du changelog le 2026-11-13).
- Validation : doré calculé #c4a76d et fond transparent sur « Récupérer » ; commandes ×5/×10 dans la largeur à 390 px ; contours des pastilles présents. Corrigé.

- Complément : `identity.css` redessinait un encadrement via `::after` et `controls.css` ajoutait un fond via `::before`. L’ouverture reçoit désormais un style textuel partagé, assez spécifique pour neutraliser ces deux couches ; son prix reste dans le sélecteur. Le même style partagé `text-action` est réutilisé pour les actions histoire. Les emplacements vides, sans image ni SVG, étaient aussi capturés par le sélecteur des boutons textuels : affichage horizontal et proportions cassées. Le sélecteur explicite `button.hs-card-choice` dans le shell doit rester prioritaire, y compris sans carte.
- Complément du 2026-11-13 : les cartes de version du changelog, sans image, étaient prises pour des contrôles textuels ; leur fond de sélection disparaissait. Exclusion explicite de `.release-version` du sélecteur des contrôles, comme pour les autres sélecteurs de contenu, avec focus clavier conservé. Proposition de règle, non appliquée à `AGENTS.md` : « Lorsqu'un bouton représente un contenu sélectionnable sans image, vérifier qu'il n'est pas capturé par les contrôles textuels partagés ; conserver un focus clavier visible. »

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

## 2026-11-04 — Tutoriel : menu JOUER hors écran sur téléphone

- Symptôme : à 375 px, la présentation des modes place menu et bulle sous la fenêtre.
- Cause : `reference.css` applique `inset-block-start: 100%` au menu JOUER fixe ; cette valeur désigne la hauteur de la fenêtre, contrairement au menu de navigation positionné sous l’en-tête. Le suivi du tutoriel ne recadre pas une cible inchangée après redimensionnement.
- Correctif : réserver `100%` à la navigation, conserver le décalage existant de JOUER et recadrer la cible lors du redimensionnement ; borner la position de la bulle.
- Autre cible absente constatée au parcours : les paramètres sont désormais une roue dentée `.mq-gear` dans l’en-tête, et non un onglet `.mq-game-nav`. Le tutoriel cible ce contrôle existant.
- Contexte de reprise : worktree `/home/jxu002/anime_master-tuto`, branche `chantier/tutoriel`. Port 3013 et `BETTER_AUTH_URL=http://localhost:3013` pour isoler les tests ; ne pas modifier le checkout social. Migration tutoriel déjà appliquée à la base dev par la session précédente. Turbopack exige ici un vrai dossier `node_modules`, pas un lien symbolique hors racine.

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

## 2026-11-04 — Vérifier un widget global : hors `AppShell`, et inscription en `next start`

- Symptôme 1 : le widget de chat monté dans `AppShell` perdait ses couleurs (onglet actif gris, boutons sans style) : `controls.css` restylise tous les `button` de `.mq-app-shell`. Correctif : monter les widgets globaux dans `layout.tsx` après `AppShell`, sous leur propre `Suspense`.
- Symptôme 2 : en `next start`, l'inscription renvoie `INVALID_INVITE_CODE` (en production, sans `INVITE_CODE`, elle est fermée). Contournement pour les tests : lancer `INVITE_CODE=localtest npx next start -p 3012` et envoyer `inviteCode: "localtest"` dans le corps de `/api/auth/sign-up/email`.
- Un `next start` après `npm run build` évite les rechargements en boucle de `next dev` observés pendant les vérifications du social.

## 2026-11-04 — Branche changée sous les pieds par une autre session (worktree partagé)

- Symptôme : un `git commit` suivi de `git push` échoue (« no upstream ») ; le commit est arrivé sur `chantier/outils-dev` au lieu de `main`.
- Cause : une autre session a fait `git checkout -b chantier/outils-dev` dans le même dossier `anime_master-postgres` pendant le travail (reflog : « moving from main to chantier/outils-dev »).
- Correctif : `git push origin <sha>:refs/heads/main` (avance rapide vérifiée avec `git merge-base --is-ancestor`), puis `git branch -f main <sha>` sans toucher à la branche extraite de l'autre session.
- Prévention : vérifier `git branch --show-current` juste avant chaque commit ; pour un long chantier, travailler dans un worktree dédié.
- Occurrences : 1.

## 2026-11-04 — Outils de dev : imports et numéros de cartes

- Symptômes : liste des matériaux indisponible au chargement puis Cœur de brèche en double ; dons de cartes attribuant un numéro sans avancer le compteur utilisé par les boosters.
- Causes : lecture de constantes pendant un import circulaire, ressource de raid déjà dans RESOURCE_NAMES ; numéro calculé seulement depuis les cartes existantes.
- Correctifs : calcul différé et dédoublonnage des matériaux ; allocation du numéro sous verrou du personnage et synchronisation de pullCount, en conservant les dons hors des statistiques d'ouvertures (lotSize 0).
- Validation : outils testés dans le navigateur sur compte jetable, desktop 1440 px et mobile 390 px ; recherche/don, lot, éveil, niveau, progression, ressources, retrait refusé, rechargement et redirection sans session.
- Occurrences : 1.
- Contrôles finaux : typecheck et ESLint ciblé, build Node 24, test de régression `scripts/check-dev-tools.ts` (dons concurrents, compteur, maintien du niveau 25, refus des mutations en production). En navigateur, `/dev` affiche bien 404 sur le build local en production même avec une session ; aucune publication distante.

## 2026-11-04 — `check-banners` instable sur la base de dev partagée

- Symptôme : `check-banners.ts` échoue environ une fois sur deux en local (`Unique constraint failed on Card_characterId_serial_key`), y compris sur `main`. `check-bulk.ts` a une vérification statistique (10ᵉ carte jamais N) qui échouait par intermittence tant que la règle de la 10ᵉ invocation existait ; elle est retirée avec la règle.
- Cause probable : numéros de série (`pullCount` des personnages) en collision avec des cartes laissées par d'autres sessions ou des runs interrompus sur la même base de dev. La CI part d'une base vide et n'est pas concernée.
- Contournement : relancer, ou lancer le check sur une base jetable (`CHECK_DATABASE_URL`). À corriger : attribuer les numéros de série de test sous verrou comme le fait la production.

## 2026-11-09 — Quotas gratuits dépassés : écritures ISR Vercel et egress Supabase

- Symptôme : mails Vercel (200 000 écritures ISR atteintes, risque de pause) et Supabase (egress > 5,5 Go) avec 6 joueurs actifs.
- Cause : `revalidatePath("/", "layout")` dans les actions joueur invalidait les coquilles statiques de tout le site (`cacheComponents`). Côté base, des lectures complètes à chaque page ou action : puissance de collection (toutes les cartes et leurs personnages), `distinct` Prisma (fait en mémoire, relit toutes les lignes), catalogue des anime. Mesuré via `pg_stat_statements` sur la prod : plus de 100 M de lignes en 7 jours.
- Correctif : `refresh()` dans les actions ; agrégats SQL (`$queryRaw`, `groupBy`) ; `"use cache"` sur le catalogue ; sondage du chat ralenti (branche `perf/egress-isr`).
- À retenir : pour rafraîchir l'écran après une action, `refresh()` suffit (pages dynamiques) ; pas de `distinct` Prisma ni de `select` imbriqué sur une collection entière pour un simple total. La base Supabase dev (`.env`) compte aussi dans l'egress de l'organisation.
- Occurrences : 1.

## 2026-11-09 — Tiroir de menu mobile réduit à une bande de 32 px

- Symptôme : sur téléphone, « Menu » ne montrait qu'une bande avec le haut du bouton JOUER, pas le tiroir (capture de l'utilisateur sur Vercel).
- Cause : `.mq-topbar` avait `backdrop-filter: blur(20px)`, ce qui en fait le bloc contenant des descendants `position: fixed` : le tiroir (`inset: 68px auto 0 0`) prenait la hauteur de la barre (68 px) au lieu de l'écran. Lightning CSS a en plus laissé passer seulement `-webkit-backdrop-filter: none` dans un override, donc le `none` ne suffisait pas.
- Correctif : `backdrop-filter` retiré de `.mq-topbar` sous 1500 px (réservé au bureau, `maquette.css`), fond plus opaque sur mobile.
- À retenir : pas de `backdrop-filter`, `filter`, `transform` ni `contain` sur un ancêtre d'un élément `position: fixed` censé couvrir l'écran. Vérifier le tiroir ouvert, pas seulement fermé. Occurrences : 1.

## 2026-11-10 — Listes déroulantes invisibles dans les fenêtres modales
- **Symptôme** : dans la fiche d'un perso (Squads, `<dialog>` modal), un clic sur une liste déroulante ne montrait rien (filtres d'équipement, niveau visé, sauvegardes).
- **Cause** : `SelectMenu` remplace la fenêtre native des `<select>` par un menu rendu dans `document.body` ; un `<dialog>` ouvert en modal est dans la couche supérieure et passe par-dessus, le menu s'ouvrait derrière. Les tests par `dispatchEvent('change')` ne le voyaient pas.
- **Correctif** : le menu est rendu dans le `dialog[open]` le plus proche du `<select>` (`SelectMenu.tsx`). Tester les listes déroulantes avec un vrai clic, pas en changeant la valeur par script.

## 2026-11-10 — Reprise du lot 5 : règles partielles et anciens tests
- Symptôme : après interruption, les étoiles duo étaient stockées mais absentes de la carte et du résultat ; les tests attendaient encore le doublon obligatoire et 3★ en duo.
- Cause : interruption pendant l’intégration des appelants et affichages.
- Correctif : terminer carte, résultat, consignes et tests ; inclure les critiques d’éveil dans les statistiques détaillées. Conserver les anciennes étoiles via migration, sans recalcul des récompenses déjà réclamées.

## 2026-11-10 — Test histoire antérieur à l’énergie
- Symptôme : `check:story` échoue par intermittence sur deux démarrages simultanés (« Un autre combat vient de démarrer »).
- Cause : la garde optimiste d’énergie peut refuser le second démarrage ; le test supposait deux démarrages toujours acceptés. Son scénario de défaite visait aussi un niveau devenu plus facile après lissage.
- Correctif : accepter uniquement le conflit d’énergie identifié, vérifier le premier butin unique sur les combats acceptés et le rejeu ; placer le scénario de défaite au dernier combat.

## 2026-11-10 — Préparation duo avec moins de quatre personnages distincts
- Symptôme observé pendant les tests du lot 5 : « Composition automatique » ne remplit pas un duo sur un compte avec seulement trois personnages distincts.
- Cause : l’action partagée recherche toujours une équipe de quatre cartes, même en mode duo. Comportement préexistant, hors lot 5.
- Contournement validé : choisir manuellement deux compagnons dans la préparation ; le combat fonctionne. À corriger dans la composition automatique.

## 2026-11-10 — Mise à jour AST Graphify sans extracteur SQL
- Symptôme : `graphify update .` réussit mais signale 53 fichiers SQL ignorés (`tree_sitter_sql` absent) et recrée une vue agrégée au-delà de 5 000 nœuds.
- Cause : dépendance SQL optionnelle absente ; graphe antérieur moins complet que l’extraction AST actuelle.
- État : graphe TypeScript actualisé (5 423 nœuds). Les migrations restent couvertes par Prisma et les contrôles sur la base ; le graphe ne décrit pas leur SQL. Fichiers générés et sauvegarde automatique conservés hors commits de fonctionnalité, comme lors de la précédente reprise.
- Tentative suivante, après la correction du texte d’éveil : arrêt avec le code 143 après extraction AST ; la fin de la régénération du graphe n’est pas confirmée. La cause de cet arrêt n’a pas été identifiée. Le correctif applicatif a été vérifié indépendamment avant et après push.

## 2026-11-10 — Animation d’éveil après rafraîchissement serveur
- Point à préserver : la liste serveur retire une carte devenue maximale ; une animation portée uniquement par cette ligne disparaîtrait avant d’être visible.
- Intégration : garder le dernier résultat confirmé dans la liste, sans permettre un nouvel éveil maximal. La fiche et la liste partagent l’effet ; le son ne part qu’au succès.
- Audio : utiliser le bus et les préférences du site, avec un sous-bus annulable ; ne pas couper l’ambiance pour abréger une animation. Le bouton gère son propre son afin d’éviter le clic générique en plus du carillon.
- Retour utilisateur (2026-11-10) : le long récapitulatif de bonus ajouté au succès surcharge la colonne du portrait et décale les contrôles. Correctif : confirmation brève dans une ligne toujours réservée ; les détails restent dans les statistiques. Réserver aussi l’espace du prochain bonus pour éviter les sauts entre étoiles. La liste utilise la même confirmation compacte. Vérifié sur le serveur `next dev` à 1440 et 390 px : éveil réel 3★ → 4★, hauteur du bloc, hauteur de confirmation et position du bouton identiques avant/après (tolérance 1 px), statistiques détaillées actualisées. Dans la liste, la confirmation ne décale plus les cartes. Typecheck et ESLint ciblé réussis.

- Nouvelle occurrence avec Gojo (2026-11-10) : sur écran de 720 px de haut, le portrait de 352 px déborde de sa rangée rétrécie et recouvre les métadonnées puis les étoiles. La confirmation compacte ne corrigeait pas ce chevauchement. Correctif : réserver la hauteur intrinsèque des contrôles et laisser le portrait prendre la place restante, avec défilement de secours sur écran très bas. Validation navigateur sur Gojo UR : éveil réel 3★ → 4★, solde 0/240 et bouton désactivé ; aucun chevauchement portrait/métadonnées/étoiles, aucun contrôle hors de la colonne. Parcours après rechargement à 1440×900, 1440×720, 1024×600, 1280×450, 390×844 et 430×740 ; bouton accessible en défilant si nécessaire, aucune erreur JavaScript.

## 2026-11-10 — Cache Components conserve les effets ponctuels au retour
- Risque confirmé par les guides locaux Next (`cacheComponents.md`, « Navigation with Activity ») : les routes cachées gardent leur état, mais leurs effets sont recréés au retour. Un effet dépendant seulement de l’étoile gagnée peut donc rejouer un ancien carillon.
- Correctif pour l’éveil : mémoriser l’étoile après la première frame réellement affichée. Cela évite le rejeu au retour sans supprimer l’animation lors du double montage de développement. Les succès en mouvements réduits ou hors écran sont aussi mémorisés.

## 2026-11-10 — Donjons : butin et déblocage des univers de collision
- Contexte du lot 6 : Fairy Tail n’a pas d’univers d’histoire séparé ; ses personnages sont dans « La Grande Alchimie ». Le déblocage doit suivre cette progression, tout en gardant un set et une progression de donjon indépendants.
- Texte obsolète repéré : les règles de donjon annonçaient encore « pas de coût d’entrée » depuis l’introduction de l’énergie. Corriger pour annoncer 1 énergie, remboursée à la défaite ou à l’abandon.

## 2026-11-10 — Terminer pendant l’envoi d’une action manuelle
- Symptôme reproduit dans le navigateur : attaque, puis clic immédiat sur « Terminer » ; `finishAutoAction` reçoit encore le compteur 0 alors que l’action 1 vient d’être enregistrée. Erreur « Action déjà jouée », sans résultat.
- Cause : la requête différée repart dans une microtâche avant que React ait rendu le nouveau `view.steps`. Le verrou réseau protège les requêtes, mais pas cette lecture de l’ancien état.
- Correctif : synchroniser le compteur et le statut confirmés dans des références dès réception de la réponse ; « Terminer » utilise ces valeurs, y compris avant le prochain rendu.
- Validation : scénario reproduit puis corrigé sur mobile 390 px avec de vrais clics (sort, cible, « Terminer » immédiat). La victoire et les deux pièces apparaissent ; rechargement sans perte du butin ni erreur JavaScript.

## 2026-11-10 — Sans effets de sorts avant la première victoire en donjon
- Symptôme : la préférence globale `bt-fx=off`, choisie sur un autre combat, supprime aussi les effets lors de la première tentative d’une difficulté de donjon.
- Cause : le lecteur applique la préférence sans connaître les victoires précédentes ; le rafraîchissement de progression à la fin peut aussi transformer le premier passage en rejeu pendant sa lecture.
- Correctif : figer dans la copie serveur du combat si cette difficulté a déjà été vaincue avant le lancement. Le lecteur force les effets et verrouille leur bouton tant que cette autorisation manque, sans effacer la préférence. La case de rejeu reste verrouillée après une première défaite, devient disponible après une victoire ; la difficulté suivante reste indépendante.
- Validation : `check:dungeon`, typecheck et ESLint ciblé ; navigateur PC 1440 px et mobile 390 px avec préférence déjà désactivée : première victoire verrouillée, rejeu de la même difficulté déverrouillé, difficulté suivante et autre donjon verrouillés ; première défaite avec case désactivée/décochée, puis rechargement et nouvelle tentative toujours avec effets. Préférence conservée, aucune erreur JavaScript.

## 2026-11-10 — Budget d'équipe : fixtures à 4 UR refusées
- Symptôme : `check:story`, `check:dungeon`, `check:tower` échouaient avec « Budget d'équipe dépassé : 32/24 » après l'ajout du plafond.
- Cause : ces scripts construisent une équipe de 4 UR (32 points).
- Correctif : équipes de test en 2 UR + 1 SSR + 1 SR (24). `check:dungeon-universes` échoue déjà sur `/verrouillée/` (le message est « Donjon verrouillé », antérieur à ce chantier).
- Validation : navigateur PC (compte 4 UR + SSR/SR) : 32/24 bloque le lancement avec message, composition automatique 24/24, combat lancé, aucune erreur JavaScript.
- Piège : `pkill -f "next dev ..."` dans le même shell tue la commande en cours (code 144) ; arrêter le serveur dans un appel séparé.
\n
## 2026-11-11 — Combat en Auto interrompu quand on quitte la page
- Symptôme : le combat s'arrêtait en quittant la page ; relancer un combat l'abandonnait (compté perdu).
- Cause : l'Auto n'existait que dans le navigateur ; une requête serveur lancée pendant `pagehide` est annulée par le navigateur.
- Correctif : `setBattleAuto` mémorise l'Auto sur le combat ; `finishAutoBattles` le termine au lancement suivant (avant l'abandon). Fin immédiate aussi au démontage du lecteur.
- Validation : navigateur PC, compte jetable : combat en Auto laissé par rechargement, puis relancé : l'ancien est DONE (victoire), pas ABANDONED. Non vérifié : fermeture réelle de l'onglet, mobile, site après push.
- Piège : en test, « Combattre en manuel » démarre déjà en Auto ; cliquer sur l'interrupteur le désactive.

## 2026-11-11 — Arène live : socle serveur
- Décisions (utilisateur) : 4v4 en direct, sonde courte ~1,5 s (Vercel/Supabase, pas de websocket), chrono 20 s avec l'automatique en relais, file Elo avec fantôme après 30 s. Spec : `docs/specs/pvp.md` « Arène live ».
- Code : table `ArenaMatch` (migration `20261111100000_arena_live`, appliquée sur la base Supabase du `.env` avec accord explicite), `src/lib/arena.ts`, `scripts/check-arena.ts` (28 vérifications, `npm run check:arena`). Le moteur est inchangé ; le joueur B voit le journal inversé (`swapSides`).
- Piège : une ligne en file qui en rejoint une autre disparaît ; `arenaEnqueue` renvoie l'identifiant du match de l'adversaire, pas celui qu'il vient de créer.
- Page `/arene` ajoutée (lobby, file, match via `BattlePlayer`, résultat avec Elo) ; l'entrée « Arène Live » du menu Jouer est débloquée (« Arène PvP » reste verrouillée par `PVP_AVAILABLE`).
- Validation : deux comptes jetables dans deux navigateurs (PC 1440 px) : file, appariement, chrono, 6 actions croisées, rechargement en cours de match (reprise), abandon : défaite -13/-16 et victoire côté adversaire, aucune erreur JavaScript. Non vérifié : mobile, chrono qui expire à l'écran, fantôme à l'écran, site après push.
- Piège : un forfait n'écrit pas d'événement `end` dans le moteur ; `viewOf` l'ajoute pour que le lecteur affiche le résultat, et la sonde suit le match par identifiant (sinon un match terminé renvoie « aucun match » et l'écran retourne au lobby).
- Piège : les équipes fantômes viennent de vrais comptes de la base partagée (défense, puis attaque) ; `check:arena` ne suppose donc pas quel joueur sert de fantôme.

## 2026-11-11 — Empereurs, étape 1 : armes légendaires dans le moteur
- Fait : quatre armes dédiées (`griffon`, `murakumogiri`, `hassaikai`, `napoleon`) dans `weapons.ts`, nouveaux passifs et statistiques dédiées dans `battle.ts` (statut `fear`, coup doublé, garde cumulable, foudre/feu). Aucun tirage aléatoire ajouté sans l'arme : `check:battle`, `check:weapons`, `check:battles` inchangés. Nouveau `check:emperor-weapons`.
- Pas encore branché : fabrication (forge), ressources, boss, passages, Hardcore, interface. Les armes ne sont donc pas encore obtenables.
- Piège : `forge.ts` choisit l'arme d'une carte par `WEAPONS.find(type)` ; les armes dédiées sont placées après les génériques pour ne pas les remplacer, mais la forge devra les traiter à part.

## 2026-11-11 — Empereurs, étape 2 : mécaniques de boss et kits dans le moteur
- Fait : statuts `sleep` (Haki des rois, ATK inférieure à celle du lanceur, un coup réveille, boss immunisés) et `devour` (marque : libérée si Big Mom subit assez de dégâts ou meurt, sinon la cible est avalée et Big Mom gagne son sort en tertiaire), âmes de Big Mom (`soulPocket`, +10 % PV max et +25 % de dégâts finaux par âme), phases (`phase`, Kaido sous 50 % de PV), jauge de départ (`startGauge`). Kits des quatre empereurs dans `boss-skills.ts`. `npm run check:emperors`.
- Décisions provisoires : dégâts critiques +50 % de Shanks remplacés par rien (pas de statistique de sort pour cela) ; saignement de Kaido remplacé par du poison ; Barbe Blanche sans bouclier sur mort d'allié. À reprendre à l'équilibrage.
- (Résolu plus bas) Big Mom n'était pas dans la base ; l'identifiant provisoire 5 était celui d'Ichigo.
- Piège (corrigé) : la marque se libère par les dégâts subis par **Big Mom**, pas par la marquée ; la spec disait « de la marquée » pour le seuil seulement.
- Reste : vagues d'équipage dans un même combat (le lecteur suppose huit cartes fixes), passages quotidiens, Hardcore, forge, interface.

## 2026-11-11 — Empereurs : import de Big Mom, raretés SSR, écarts de spec comblés
- Import : Big Mom = AniList **54495**, nommée « Linlin Charlotte » (216 favoris, hors du top 5 000 de l'import de masse, d'où l'absence). Script `scripts/import-character.ts <ids>` (importe si absent, applique `RARITY_OVERRIDES`, recalcule seulement ces personnages). Exécuté sur la base Supabase à la demande de l'utilisateur : Linlin, Shanks (727), Newgate (2751) et Kaido (46109) passent en SSR ; stats recalculées ; `RARITY_OVERRIDES` mis à jour pour survivre aux réimports.
- Piège : l'identifiant 5 est **Ichigo** (`BLADE_USERS`) ; ne jamais utiliser un identifiant sans l'avoir vérifié dans la base. `EMPEROR_IDS.bigMom = 54495`.
- Comblé : dégâts critiques +50 % (nouvelle statistique de sort `critDamage`), saignement de Kaido (`BLADE_USERS`, seulement avant sa phase Dragon), réduction de Kaido sous 70 % et de Barbe Blanche au-dessus de 50 % (`guard`), bouclier de Barbe Blanche à la mort d'un allié (`allyDeathShield`).
- Effets de bord : la carte Kaido de la collection saigne aussi (il est dans `BLADE_USERS`) ; Newgate (1 carte possédée) et les trois autres changent de rareté dans les collections et les tirages.
- `scripts/seed-checks.ts` échoue avec « Chargement du catalogue de test impossible » avec ou sans ces changements (non lié).

## 2026-11-11 — Empereurs, étape 3 : vagues et serveur du Défi
- Moteur : événement `wave` (le camp B est remplacé par la vague suivante, mêmes emplacements B1 à B4), option `waves` et `maxRounds` (90 tours pour trois phases), lecteur et bilan adaptés. Le combat d'un empereur = équipage 1, équipage 2, empereur + 3 membres d'équipage.
- Serveur (`src/lib/emperors.ts`, `battles.ts`) : clés `emperor:<empereur>:<difficulté>` et `emperor:hardcore:<difficulté>` (mode `RAID`, énergie 1, cœurs comme au raid, difficultés débloquées comme au raid). Une victoire par jour et par empereur (enregistrement `emperor-clear:<clé>:<date>` dans `AdventureRecord`, une défaite ne le consomme pas). Victoire : clé + ressource légendaire (Normal 1, Difficile 1 à 2, Cauchemar 2 à 3). Hardcore : une clé de chaque consommée à la victoire, deux ressources légendaires différentes.
- Donjon One Piece : le matériau (`materiau-donjon-one-piece`) ne tombe plus qu'au niveau 10, 10 % par victoire (avant : de façon garantie dès le niveau 7).
- Noms provisoires des ressources : mèche de Big Mom, écaille de Kaido, moustache de Barbe Blanche (Shanks : cheveux roux, choisi par l'utilisateur).
- `npm run check:emperor-raid` (22 vérifications, en conditions réelles sur la base).
- Reste : forge des quatre armes, page du Défi, aperçu des ennemis, équilibrage.

## 2026-11-11 — Empereurs, étape 4 : forge et page du Défi
- Forge : `forgeEmperorWeapon` (3 ressources de l'empereur + 5 éclats du Trône, n'importe quelle carte 5★ sans arme) ; page `/forge` listant les quatre armes dédiées. Page `/raid/empereurs` (quatre empereurs, trois difficultés, Hardcore, résultats avec ressources gagnées), lien depuis `/raid`. Aperçu des ennemis (`getBattlePreview`) = dernière vague.
- Validation : navigateur PC 1440 px et mobile 390 px, compte jetable (tutoriel fini, 4 UR 5★) : liste, préparation, combat à trois phases (équipage vu à l'écran), « Terminer », résultat, rechargement (« Vaincu aujourd'hui », clé et ressource affichées), pas de débordement mobile, aucune erreur JavaScript. Non vérifié : le changement de vague à l'écran image par image, le Hardcore à l'écran, la forge à l'écran (testée côté serveur), le site après push.
- Écran de victoire : « Ennemis vaincus » compte maintenant toutes les vagues (12 / 12 au lieu de 12 / 4).
- Équilibrage : équipage et empereurs utilisent les moyennes SR/SSR × échelle du raid ; à régler avec de vraies équipes.

## 2026-11-11 — Shanks : Duel de l'empereur
- Nouveau statut `duel` et effet de sort `{ k: "duel", turns }` : le lanceur n'est atteignable que par l'ennemi désigné (`reachableFoes`) ; les autres ennemis passent leur tour s'ils n'ont personne d'autre à viser (`cutOffByDuel`). Fin du duel si l'adversaire tombe. Fusionné avec la Voix de l'empereur dans le sort tertiaire de Shanks (pas de quatrième emplacement de sort).
- Piège corrigé : un premier essai avec repli « atteindre quand même si personne n'est atteignable » faisait fuir les coups contre un boss seul ; il faut faire passer le tour.

## 2026-11-11 — Empereurs : équilibrage « vraiment dur »
- Avant : avec les réglages du raid (échelle 0,85 / 1,15 / 1,5), quatre UR 5★ sans équipement battaient les quatre empereurs à 78-100 % au Normal et 75-100 % au Cauchemar. Après : échelle 2,5 / 3,2 / 3,7, coefficients par empereur, Hardcore ×0,58 (voir la spec).
- Outil : `npm run simulate:emperors` avec `--scale`, `--per`, `--boss`, `--crew1`, `--crew2`, `--hardcore-scale`, `--teams`, `--bosses`, `--hardcore`.
- `check:emperor-raid` fixe des ennemis faibles pour tester butin et accès (la difficulté réelle est simulée à part).
- Hypothèse : le niveau d'équipement des joueurs (moyen / fort) est estimé à la main ; à recaler quand on aura de vraies données.

## 2026-11-11 — Musiques du jeu
- Fichiers fournis par l'utilisateur, copiés dans `public/audio/music/` (31 Mo, MP3 tels quels, ffmpeg absent) : `soliloquy.mp3` (thème principal), `combat.mp3` (battleThemeA : combats en général), `raid.mp3` (Heroic Demise : raid et Défi des empereurs), `pvp.mp3` (Battle in the winter : arène live). `CREDITS.txt` : auteurs et licences **à renseigner** (inconnus).
- Code : `src/lib/track-music.ts` (lecture en flux par un élément `<audio>` branché sur WebAudio, reprend où elle s'est arrêtée, pas de décodage complet en mémoire). `BattleAudio(track)` remplace la boucle générée `combat.ogg` ; prop `music` sur `BattlePlayer`/`LiveBattle`. Le thème principal remplace l'ambiance synthétisée de `pack-audio.ts` (même préférence `am-packs-ambience`, mêmes règles : démarre au premier geste, s'efface quand un combat est à l'écran). Réglage « Musique » dans Paramètres.
- Validation : navigateur PC (autoplay autorisé), compte jetable : thème en lecture à l'accueil ; raid : thème coupé et `raid.mp3` en lecture ; donjon : `combat.mp3` ; retour à l'accueil : thème repris ; aucune erreur JavaScript. Non vérifié : `pvp.mp3` à l'écran (même chemin de code), le niveau sonore des morceaux (gain 1,0 × niveau musique des combats), la lecture avec le blocage d'autoplay réel, le site après push.
- Ancien `BattleMusic` (boucle générée) et `public/audio/battle/combat.ogg` : plus utilisés, laissés en place.

## 2026-11-11 — Quitter un combat n'abandonne plus
- Demande : « je ne veux pas que ça abandonne quand je quitte la page, ça doit tourner même sur un autre onglet ».
- Changements : la croix termine le combat en automatique au lieu de l'abandonner ; fermer/quitter la page déclenche la fin automatique pour tous les combats (plus seulement ceux en Auto) ; en manuel, onglet masqué 15 s → l'automatique prend le relais ; `finishAutoBattles` termine tous les combats ouverts du mode avant d'en lancer un autre. « Abandonner » reste un vrai abandon.
- Validation : navigateur, compte jetable, donjon : croix → DONE (victoire) ; onglet masqué 18 s → DONE ; page quittée puis nouveau combat → l'ancien DONE ; « Abandonner » → ABANDONED ; aucune erreur JavaScript. Non vérifié : fermeture réelle de l'onglet, mobile, site après push.
- Effet de bord : la croix ne montre plus le résultat (le combat se joue en coulisses) ; il est dans l'historique et le butin est versé.

## 2026-11-11 — Musiques compressées, images d'items, fond d'accueil
- ffmpeg 7.0.2 statique installé dans `~/.local/bin` (sans sudo, via le paquet npm `ffmpeg-static` téléchargé hors du projet). Musiques : MP3 (31,7 Mo) → AAC 128 kb/s en `.m4a` (14,3 Mo), niveau égalisé à environ -16 LUFS (`loudnorm`, les quatre morceaux entre -15,3 et -15,9). Pièges : `soliloquy.mp3` et `raid.mp3` contenaient une pochette (flux vidéo) : il faut `-vn`. Les MP3 d'origine sont retirés du dépôt (ils restent dans les pièces jointes de la conversation).
- Images d'items (20 PNG de ChatGPT dans `/home/jxu002/anime_master-postgres/img/`, 1254×1254) : 16 pièces d'artefacts (casque, plastron, gants, bottes) pour One Piece, Naruto, Jujutsu Kaisen et Dragon Ball → `public/images/artifacts/sets/<set>/<emplacement>.webp` (640 px, ~75 Ko) ; noms de pièces dans `SET_ARTIFACTS` (`artifact-display.ts`). Les anciennes images One Piece (`one-piece-*-anime.png`) ne sont plus utilisées, laissées en place.
- Quatrième image de chaque set, interprétée comme la ressource du donjon : sabre One Piece → Éclat du Trône (`materiau-donjon-one-piece`), kunai → `metal-a-chakra`, lame maudite → `outil-maudit` (`MATERIAL_ART` dans `published-art.ts`, indépendant du manifeste généré). **Bâton rouge Dragon Ball : non rattaché** (`public/images/materials/baton-de-combat.webp`), la ressource du donjon Dragon Ball étant `armure-saiyan`.
- Fond d'accueil : `public/images/backgrounds/accueil.webp` (91 Ko), appliqué à `.mq-app-shell:has(.mq-home-main)` avec un dégradé sombre.
- Validation : navigateur PC et mobile : accueil (visiteur et connecté) avec le fond, texte lisible ; inventaire avec les quatre sets et trois ressources illustrées. Non vérifié : la lecture des `.m4a` en navigateur réel (testé avec les MP3 avant compression), le site après push.

## 2026-11-11 — Arène : changer d'onglet ne fait plus perdre
- Symptôme : « dès que je change d'onglet ou de fenêtre, ça fait abandonner ». Cause : en arène live, l'onglet masqué ne sondait plus le serveur et l'automatique jouait à la place du joueur ; au bout de 3 expirations (60 s) le serveur déclarait **forfait**. (Le PvE n'était pas en cause : testé avant, onglet masqué → combat terminé par l'automatique, pas abandonné.)
- Correctif : plus de forfait pour absence ; après 2 expirations de suite le chrono du joueur absent tombe à 4 s (`ARENA_AWAY_AFTER`, `ARENA_AWAY_MS`) ; l'onglet masqué sonde toutes les 5 s. Seul « Abandonner » donne une défaite.
- Validation : `check:arena` (53 actions jouées par l'automatique sur un joueur absent, 24 expirations, aucun forfait) ; navigateur, deux comptes : onglet masqué 16 s → 2 sondes ; deux onglets masqués 75 s → match toujours en cours, pas de forfait. Non vérifié : le site après push.

## 2026-11-11 — Changer d'onglet : les animations continuent (rectificatif)
- Précision de l'utilisateur : « ça ne fait pas abandonner, ça skip le combat, tout se calcule côté serveur ; je veux que les animations continuent ». Cause : `LiveBattle` terminait le combat côté serveur (`finishAutoAction`) dès que l'onglet était masqué (auto) ou après 15 s (manuel), ce que j'avais ajouté à la demande « que ça continue de tourner » en le comprenant mal. Retiré.
- Les navigateurs bornent les `setTimeout` d'un onglet masqué (≥ 1 s, puis 1/min) : l'animation aurait rampé. `BattlePlayer` utilise maintenant `backgroundTimeout` (`src/lib/background-timer.ts`, minuterie dans un Worker, repli sur `setTimeout`).
- Gardé : quitter la page / fermer l'onglet / croix → l'automatique termine côté serveur ; arène : plus de forfait pour absence (entrée précédente).
- Validation : navigateur (visibilité simulée par `document.hidden`), donjon : 4 s « masqué » → combat toujours RUNNING (pas expédié), un Worker créé, le combat se joue puis se termine à l'écran (DONE). **Non vérifié : le vrai bridage d'un onglet en arrière-plan** (le navigateur de test ne bride pas) ; à confirmer en changeant vraiment d'onglet. L'audio est coupé quand l'onglet est masqué (`suspendWhenHidden`).

## 2026-11-12 — Fond d'accueil sur d'autres pages, tutoriel qui ne mène pas à l'accueil
- Symptôme : le fond de l'accueil apparaissait parfois sur les autres pages ; les étapes « L'accueil » du tutoriel (Ryō, Cristaux…) ne menaient pas à la page quand on était ailleurs (sous 1500 px la cible est le bouton Menu, qui n'ouvre qu'un tiroir).
- Cause : la règle CSS `.mq-app-shell:has(.mq-home-main)` ; avec Cache Components l'accueil reste caché dans le DOM après navigation, donc `:has()` matche encore. Côté tutoriel, seule la cible entourée ramenait à la page.
- Correctif : fond piloté par `.mq-app-shell[data-page="home"]` (URL) ; la bulle affiche un bouton « Y aller » (router.push) quand l'étape est hors de sa page. À retenir : ne pas utiliser `:has()` sur le contenu d'une page pour piloter l'habillage global.

## 2026-11-13 — CI v0.3.0 : schémas et contrôles restés sur les anciennes règles
- Symptôme transmis : 11 checks en échec sur le catalogue jetable de GitHub Actions (`5f7163f`). Corrections de l’éditeur et des VFX commencées avant interruption, encore non commitées à la reprise.
- Causes déjà identifiées : bouclier de base de Gojo à 8 % rejeté par le validateur de l’éditeur ; champs `silence.count`, `damage.hpPct` et `damage.perHitTaken` absents du schéma ; statuts des empereurs et nouveaux kits sans alias VFX.
- Reproduction : Postgres 17 est installé dans `/usr/lib/postgresql/17/bin` ; un cluster jetable peut être initialisé par l’utilisateur courant dans `/tmp` et limité à `127.0.0.1`, sans sudo ni accès aux bases Supabase. La suite complète et ses migrations peuvent donc être reproduites localement avec `CHECK_DATABASE_URL` explicite.
- Reproduction Postgres 17 : `ArenaMatch` est la seule table sans RLS ; le catalogue fixe manque les boss Demon Slayer/Fairy Tail et les membres d’équipage des empereurs. D’autres assertions attendent encore quatre raretés d’équipement, les anciennes images SVG de ressources et les anciens kits de Killua/Mob ainsi que le soin total d’Eren (plafonné à 35 %).
- Classements : le check Node importe indirectement `server-only` via les avatars/profils ; le lancer sous la condition `react-server`, comme `check-dev-tools`, préserve la barrière du code applicatif. Le test de frappes supplémentaires de Yuuji doit empêcher la cible de mourir avant la quatrième frappe.
- Délais locaux : premier passage du lanceur interrompu à la borne globale de 300 s (check histoire en cours, code 143) ; lint a dépassé sa borne de 60 s (124). Les erreurs fonctionnelles et les journaux déjà produits restent exploitables. Les migrations et le catalogue ont bien été créés puis la base jetable supprimée.
- Correctifs : schéma et limites du builder alignés sur les sorts existants, huit alias VFX réutilisés, migration additive RLS pour `ArenaMatch`, catalogue de test complété (401 personnages, dont quatre minimum par donjon), assertions des kits/raretés/images actualisées et check classements lancé sous `react-server`.
- Validation finale : 72/72 étapes réussies sous Node 24 et Postgres 17 (324 s cumulées localement, borne globale 600 s, borne de 60 s par étape conservée). Rapport `/tmp/anime-check-D0POhI/summary.json`, nettoyage de la base confirmé. Migration aussi éprouvée avec les rôles `anon` et `authenticated` préalablement dotés de droits : accès retiré après application. Aucune migration ni donnée joueur modifiée sur les bases partagées.
- Navigateur sur `next dev :3012`, avec compte et base jetables : Gojo accepte 8 %, refuse 8,1 %, conserve 8 % après rechargement et reste identique en simulation ; Rukia conserve `silence.count = 1`, Mob conserve `perHitTaken = 0.1` après sauvegarde/rechargement. Vues 1440 px et 390 px sans erreur JavaScript. Les huit alias VFX sont animés via le vrai contrôleur dans une preview isolée sur le site local ; disparition des overlays, démontage et mouvement réduit vérifiés. Aucun combat joueur réel exécuté pour ces VFX.

## 2026-11-13 — Préparation de la version v0.3.0
- Contexte manquant à la fin des correctifs : `main` et sa CI étaient à jour, mais le changelog et la version du paquet restaient à 0.2.2 ; aucun tag v0.3.0 local ou distant.
- À la demande de l'utilisateur : notes v0.3.0 rédigées depuis les commits livrés et les règles implémentées, versions de `package.json` et du verrou alignées à 0.3.0, préparation d'un tag annoté sur le commit de release de `main`.
- Le changelog liste les sept migrations ajoutées depuis v0.2.2, dont le recalcul des artefacts et la reprise des étoiles duo. La migration du schéma ne synchronise pas les personnages et raretés du catalogue. La publication vers `production` reste une action humaine distincte du tag.

## 2026-11-13 — Historique des mises à jour et annonce à l'arrivée
- Contexte : les notes sont versionnées dans `CHANGELOG.md`, mais aucun onglet du jeu ni suivi de lecture par joueur ne les expose. Demande utilisateur : consulter toutes les mises à jour et voir automatiquement la nouvelle version à l'arrivée.
- Préparation : spécification dans `docs/specs/changelog.md`, maquette autonome avec les cinq versions réelles et une fenêtre de nouveautés dans `docs/maquettes/changelog.html`. Les notes de déploiement restent hors de la lecture joueur.
- Accord reçu le 13 novembre (« je valide »), après la maquette imposée par `docs/direction-artistique.md`, section 8. Intégration de `/changelog`, lien de navigation et annonce connectée ; lecture par compte et par version, migration additive `changelog_read`. Le tag v0.3.0 existant reste inchangé.
- Maquette vérifiée à 728 et 390 px : sélection de chacune des versions, ouverture de l'annonce, lien vers l'historique, fermeture par Échap et « C'est lu, jouer », sans débordement horizontal ni erreur JavaScript. Il s'agit d'une preview autonome, pas d'une validation du parcours sur le site ; persistance et affichage automatique restent à implémenter après accord.
- Le build inclut explicitement `CHANGELOG.md` dans ses traces pour que les notes restent disponibles sur Vercel. Le conflit de sélection des cartes de version complète l'entrée « Styles des contrôles prioritaires sur les nouveaux composants » du 2026-11-03.
- Validation de l'intégration : contrôles ciblés, TypeScript et build de production réussis ; historique des cinq versions, annonce automatique, erreur réseau avec nouvelle tentative, persistance après rechargement et reconnexion dans un autre contexte navigateur, indépendance des comptes, compte ayant lu une ancienne version, lien vers l'historique et fermeture par Échap vérifiés sur le build local. L'annonce attend la fin du tutoriel et n'interrompt pas la page de combat ; vues 1440 et 390 px sans débordement ni erreur JavaScript. Base de vérification jetable supprimée après les parcours. Migrations RLS arène et lecture du changelog appliquées sur la base de développement du `.env`, distincte de la production selon `docs/compte-test.md` et `docs/preparation-prod.md` ; aucune migration en production.
- Vérification finale sur `next dev :3012`, remis sur sa base habituelle : historique public, sélection conforme à la maquette sur ordinateur/téléphone, connexion du compte de test dev, annonce fermée avec « Fermer », persistance après rechargement et lien réel du menu vers le changelog. Aucun débordement ni erreur JavaScript. Les nouveautés de cette fonctionnalité sont consignées sous « À venir », non annoncées comme une nouvelle version déjà taguée.
- Vérification à 1600 px : le lien Changelog tient dans la navigation déployée sans chevaucher le compte, mais la mini-barre avait un libellé vide pour la nouvelle route. Ajout de `changelog` à sa table de libellés, sans changement du comportement de la barre.

## 2026-11-13 — Densité mobile et visuels Fairy Tail, Bleach et DBZ
- Symptômes constatés sur le site dev : ressources de l'inventaire sur une seule colonne, filtre et recyclage repoussant les objets vers le bas ; collection sur deux colonnes. Le compteur d'énergie existe dans le compte, mais manque de visibilité sur téléphone.
- Préparation demandée : maquette autonome `docs/maquettes/mobile-compact.html`, spécification `docs/specs/mobile-compact.md`, huit images d'équipements et trois fonds DBZ préparés depuis les pièces jointes. Propositions : quatre objets carrés ou trois personnages par ligne sur mobile, filtres regroupés, énergie nommée dans l'en-tête, logos retirés. Accord visuel encore attendu, aucune intégration au jeu.
- Vérification de la maquette : Chromium 390, 768 et 1440 px ; filtres, recherche vide, détails, Échap et décors fonctionnent. Les contrôles de grille ont détecté puis permis de corriger une collision entre `.grid` et `.characters` au breakpoint PC ; sélecteur `.grid.characters` utilisé. Aucune image manquante, erreur JavaScript ou largeur débordante sur la version corrigée.
- Accord utilisateur reçu : « oui c mieux ». Interface intégrée : logos retirés, énergie et recharge partagées avec la préparation de combat, cases carrées et filtres mobiles regroupés, trois colonnes de personnages. Décisions consignées dans la direction artistique. Sur PC, le lien Changelog rejoint le groupe de gauche pour éviter le chevauchement entre les cinq anciens liens de droite et le compte ; réserve de largeur et onglets ajustés au breakpoint 1500–1699 px.
- Vérification sur le build de production local, avec un compte temporaire dédié : inventaire carré à 320, 390, 768, 1440 et 1600 px, filtres et recherche vide ; équipement et amélioration persistants après rechargement, erreur réseau et nouvelle tentative réussie ; collection à trois colonnes et filtres URL persistants ; compteur et gain d'énergie sans rechargement, navigation PC sans chevauchement. Lint ciblé, TypeScript, build et check inventaire réussis. Aucun changement de règle d'énergie, d'inventaire ni de progression.
- Lors des modifications à chaud, un ancien HTML d'artefact (sans nom) a été reçu avec un nouveau composant client (avec nom), provoquant une erreur d'hydratation ; cause précise du cache dev non établie. Le serveur de développement a été arrêté avant le build ; les mêmes parcours sur le build final ne produisent aucune erreur JavaScript ni d'hydratation.
- Visuels intégrés aux chemins publics : quatre pièces de Fairy Tail, quatre de Bleach ; fonds DBZ déterministes par acte d'histoire et palier de donjon, sans modification du moteur. Les huit images et les limites du choix de décor sont couvertes par `check-battle-background.ts`. Vrais combats manuels aux niveaux d'histoire DBZ 1, 6, 11 et difficultés de donjon 1, 4, 7 : chaque fond est chargé, sortie du combat correcte ; Namek également vu sur PC. Combat One Piece : fond habituel conservé. Aucun combat sur les comptes joueurs existants.

## 2026-11-13 — Combat mobile recouvert et commandes hors écran
- Symptômes signalés sur Vercel : panneau des effets/sorts trop haut, vitesse inaccessible, en-tête et pied de page superposés au combat et au titre « Victoire ».
- Causes : la règle mobile du lecteur rétablissait deux lignes `auto` et retirait la limite du panneau des sorts. Le combat monté dans la page animée restait prisonnier de son contexte d'empilement ; son z-index local ne le plaçait pas devant toutes les couches du site.
- Correctif : portail de combat sous `body`, enveloppe conservant les styles partagés, montage du lecteur après celui du portail pour préserver l'initialisation et le nettoyage des VFX. Plateau et dock tiennent dans la hauteur disponible ; sorts limités à 30dvh avec défilement propre, actions avant le tableau des effets, disposition en colonnes sur paysage court. Dock compact sous 360 px.
- En-tête : suppression des logos et déplacement du Changelog déjà livrés dans `f862718`. Lecture distante au moment du signalement : `main` pointe vers `f862718`, `production` vers `5ceb1ee`, qui contient encore l'ancien en-tête. Aucune publication exécutée par l'agent.
- Première validation sur dev : tailles 320×568, 390×680, 390×844, 430×740, 844×390 et 1440×900, vitesse visible et cliquable et titre de victoire au premier plan ; vrai combat sur compte temporaire : choix du sort et de la cible, commandes après défilement des effets, victoire, accès aux récompenses et retour à la carte avec libération du défilement. Aucun message d'erreur JavaScript. TypeScript et lint ciblé réussis.
- Build de production réussi ; mêmes tailles vérifiées avec toutes les icônes du dock dans l'écran. Vrai combat manuel et récompenses également vérifiés sur ce build ; vitesse conservée après rechargement, résultat visible en portrait/paysage/PC, sortie et retour navigateur sans surimpression ni verrouillage de défilement résiduel. En-tête sans logo et Changelog sans chevauchement à 1500, 1536, 1600 et 1920 px, navigation mobile fonctionnelle. Check Doflamingo (dont rendu des sorts) réussi.

## 2026-11-13 — Fond commun pour tous les combats
- Nouvelle demande explicite : appliquer l'image d'arène fournie à tous les combats. Image convertie en WebP (1672×941, 356398 octets), sans recadrage, dans `public/images/battle/citadelle.webp`.
- Fond défini dans le style du lecteur partagé : histoire, donjons, raids, tour, arène et démonstration passent par ce même plateau. Retrait de la sélection de fond par univers et de la prop associée ; DBZ utilise désormais ce fond commun. Les anciens fichiers DBZ restent conservés. Palette, commandes et présentation du résultat inchangées.
- Validation : TypeScript, lint ciblé, check des images et build réussis. Sur le lecteur de démonstration du build local : fond chargé en WebP, affichage en couverture à 320×568, 390×680, 844×390 et 1600×900, vitesse cliquable, résultat visible et fond conservé après rechargement ; aucune erreur JavaScript. Les modes réels n'ont pas été rejoués séparément pour ce remplacement de fond CSS commun.

## 2026-11-13 — Propositions de disposition du combat
- Demande : réduire les sorts, agrandir l'espace des personnages et organiser les deux équipes en diagonales face à face. Préparation uniquement, sans intégration au jeu avant choix utilisateur (direction artistique, §8).
- Maquette autonome `docs/maquettes/combat-dispositions.html` : A, quatre sorts sous l'arène ; B, panneau latéral de 265 px limité à sa hauteur de contenu. Fond, portraits, polices et icônes existants réutilisés. Détails dans `docs/specs/combat-dispositions.md`.
- Piège de la maquette : transposer les longues diagonales PC sur téléphone superpose les PV et réduit l'écart central. Variante mobile corrigée : deux rangées de quatre cartes légèrement décalées, portraits et PV sans superposition. Largeur des cartes PC plafonnée pour contenir la formation dans la hauteur du plateau.
- Validation navigateur : deux variantes à 1600, 728, 390 et 320 px ; sélection de sort/cible, dépliage des effets, Échap, vitesse, auto, résultat et retour ; aucune image manquante, erreur JavaScript, carte hors plateau ou largeur débordante. Consultation autonome vérifiée, pas d'intégration ni de VFX du lecteur réel testés pour cette proposition.

- Accord reçu : variante A retenue, avec nouvelle référence mobile fournie par l’utilisateur (ennemis en haut à droite, alliés en bas à gauche). La disposition mobile en rangées de la première proposition est remplacée par ces deux diagonales. Intégration dans le lecteur partagé, moteur et règles de ciblage conservés.
- Intégration validée : quatre sorts en bandeau, une description sélectionnée, détails dépliables avec descriptions complètes, affinités, effets et statistiques ; fermeture par Échap. File de tours horizontale et commandes sous les sorts. Portraits dimensionnés par la hauteur disponible ; PV alignés à gauche sur téléphone pour ne pas être masqués par la carte suivante.
- TypeScript, lint ciblé, check Doflamingo et build réussis. Site dev vérifié à 320×568, 390×680, 390×844, 430×932, 768×1024, 844×390, 1280×800 et 1600×900 : huit cartes dans le plateau, pas de largeur débordante, vitesse accessible y compris avec les détails ouverts. Vrai combat manuel sur compte temporaire : sort, cible, lecture, victoire, récompenses et retour à la carte réussis ; persistance de la vitesse après rechargement vérifiée. Pas de nouveau parcours de raid ni de duel live pour ce changement du lecteur commun.

- Retour sur grand écran : positions horizontales calculées sur toute la largeur tandis que la taille des cartes est plafonnée ; les diagonales s’aplatissent et les équipes s’éloignent. Correction : formation interne centrée, ratio 9:5 conservé sur les arènes larges, dimensions maximales 1440×800 ; fond toujours plein écran et disposition mobile conservée. Vérification sur site à 1920×1080, 2000×950, 2560×1440, 3440×950 et 3840×2160 : ratio 9:5 conservé, formation plafonnée et centrée ; mêmes dimensions à 2000 et 3440 px pour une hauteur identique. Mobile 320×568, 390×680, 390×844, tablette et paysage court également vérifiés : cartes contenues, sélection, détails et vitesse accessibles. TypeScript et lint ciblé réussis.

## 2026-11-13 — Combat : zones réordonnées, diagonales pleine largeur sans superposition
- Demande : croix tout en haut, ordre sous le titre, commandes au-dessus des sorts, sorts tout en bas ; trop de vide sur les côtés ; plus de cartes superposées.
- Cause du vide et des superpositions : le plafonnement 9:5 / 1440 px de la formation (commit 8d57eaa) resserrait les cartes (14cqw de large pour un pas de 10 %).
- Correctif : plafond relevé à 3,6:1, carte limitée à 9,4 % de la largeur de la formation (inférieur au pas), disposition portrait par requête de conteneur. Détail dans `docs/specs/combat-dispositions.md`.

## 2026-11-13 — Quitter un combat enregistrait une victoire
- Symptôme : quitter un combat (croix, autre page, fermeture) donnait une victoire au serveur sans que le joueur l'ait finie.
- Cause : fonctionnalité du 2026-11-11 (« quitter n'abandonne pas ») : `LiveBattle` appelait `finishAutoAction` à la sortie, et `startBattle` faisait jouer en automatique tous les combats ouverts (`finishAutoBattles`) avant de lancer le suivant.
- Correctif : plus aucune résolution automatique à la sortie ; panneau de confirmation, puis abandon (défaite, énergie rendue). `finishAutoBattles` supprimée. Vérifié en base : combat `ABANDONED`, vainqueur B, énergie 20/20.
