# Vérifications complètes

## GitHub Actions

Le workflow `.github/workflows/ci.yml` lance le job **Checks** sur les pushes de `main` et `production`, et sur les pull requests vers ces branches. `migration/postgres` est aussi activée temporairement pour valider la CI avant toute fusion.
Un nouveau run annule les anciens runs du même workflow pour la même branche (`concurrency`, `cancel-in-progress: true`). Push et pull request d'une même branche partagent le groupe pour éviter deux vérifications concurrentes du même changement.

Le runner Ubuntu 24.04 installe Node depuis `.nvmrc` (24), restaure le cache de téléchargement npm, puis lance `npm ci` (qui génère Prisma via `postinstall`). Un service Postgres 17 temporaire, vérifié par `pg_isready`, fournit le serveur de test. `npm run check` applique les migrations et charge le catalogue dans sa propre base jetable : ces opérations ne sont pas dupliquées dans le YAML.

Limites : installation 180 secondes, suite 300 secondes, job complet 10 minutes. Les délais par check restent ceux du lanceur. Un run annulé ne conserve pas d'artefact ; un run en échec conserve les journaux `check-logs-*` pendant trois jours. Les résultats et codes de chaque étape apparaissent aussi dans le journal GitHub du job.
Les actions sont épinglées par SHA ; le token du workflow a seulement `contents: read`. Aucune clé Supabase, aucun secret Vercel et aucun déploiement ne font partie de ce workflow. La protection de `production` par le statut **Checks** reste une configuration GitHub distincte.

Références : [annulation des runs concurrents](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency), [service Postgres](https://docs.github.com/en/actions/tutorials/use-containerized-services/create-postgresql-service-containers).

Validation préalable au premier push : `actionlint` 1.7.12 accepte le workflow ; `npm ci --no-audit --no-fund` réussit sous Node 24 avec dotenv neutralisé et sans URL applicative ; la commande CI limitée à 300 secondes réussit localement, 50/50 étapes, avec ses journaux dans le dossier temporaire prévu pour les artefacts. Le service local de cette vérification était Postgres 18 ; le service Postgres 17 du YAML est vérifié par le run GitHub après push.

## Lancer la suite

```sh
nvm use 24
# Fournir CHECK_DATABASE_URL via l'environnement du terminal ou le gestionnaire de secrets.
npm run check
```

`CHECK_DATABASE_URL` désigne une connexion directe à un **serveur Postgres de test**, avec permission `CREATE DATABASE`. Cette URL ne doit pas pointer vers Supabase dev ou prod. Elle doit être fournie explicitement par l'environnement : le lanceur ne la lit pas dans `.env` et ne se rabat jamais sur `DATABASE_URL`. Les URLs des sous-processus sont imposées sur la base jetable et le chargement automatique de dotenv est neutralisé.
Le serveur doit être démarré avant la commande. La commande crée une base indépendante `am_check_<UUID>`, sans réutiliser la base indiquée dans l'URL.

## Déroulement

1. ESLint sur le code du dépôt (fichiers générés, dépendances vendues, outils tiers et données locales exclus).
2. Génération des types de routes Next, puis TypeScript sans émission ni cache incrémental.
3. Création d'une nouvelle base, application des migrations Prisma et chargement du catalogue fixe versionné.
4. Découverte de tous les fichiers `scripts/check-*.ts`, triés par nom, puis exécution séquentielle. Les checks sans alias dans `package.json` sont inclus automatiquement.
5. Suppression des bases temporaires, puis résumé et code de sortie non nul en cas d'échec, de délai, d'interruption ou de nettoyage incomplet.

Chaque sous-processus a un délai de **60 secondes**, suivi de SIGTERM puis SIGKILL après cinq secondes supplémentaires. Les codes 124 (délai) et 137 (arrêt forcé) apparaissent dans le résumé. Les requêtes d'administration ont un délai de 15 secondes après connexion.
Les délais s'appliquent **par étape** : la suite complète prend plus d'une minute. Pour un superviseur imposant une borne globale, prévoir la somme des délais des étapes (actuellement 50 étapes), plus le nettoyage ; une borne de 3 300 secondes couvre cette version.

Le lanceur poursuit après un échec de lint, de TypeScript ou d'un check et récapitule tous les échecs. Si les migrations ou le catalogue échouent, les checks ne sont pas lancés et sont comptés comme non exécutés.
SIGINT et SIGTERM déclenchent le nettoyage. Un SIGKILL du lanceur ou une perte de connexion peut l'empêcher : le préfixe précis à nettoyer est affiché dès le début. Ne jamais supprimer d'autres bases.

Les journaux de chaque étape et `summary.json` sont conservés dans un dossier temporaire `anime-check-*`, dont le chemin est affiché. Ils ne sont pas ajoutés au dépôt.
Les warnings ESLint restent visibles dans le journal et ne rendent pas l'étape rouge ; les erreurs la font échouer.

## Catalogue de test

`scripts/fixtures/catalogue.json` contient un extrait fixe du contenu local au 2 novembre 2026 : **368 personnages, 178 séries**, leurs relations et aucun compte, aucune carte ni override de sort. Les descriptions longues sont retirées. Aucun appel à AniList n'est nécessaire.

Le catalogue conserve les personnages nommés par les checks de kits/Gojo, les boss des donjons et de l'histoire, plusieurs raretés et les univers joués. Il contient plus de 100 personnages de chaque genre pour respecter le contrôle des bannières existant, sans réduire ses assertions.

`check-check-runner.ts` couvre la découverte des fichiers, la conservation d'un code d'échec, le délai 124, la poursuite après échec et le refus de se rabattre sur `DATABASE_URL`.
`check-content-sync.ts` crée deux bases supplémentaires avec le même préfixe que le lanceur ; celui-ci les nettoie aussi si ce check est interrompu.

## Validation locale du 2 novembre 2026

Sous Node 24 et Postgres local : 50/50 étapes réussies, dont les 45 checks découverts, en environ 86 secondes. Zéro check omis ; toutes les bases des suites ont été supprimées. Les comptages de comptes, cartes, personnages et overrides de la base initiale sont restés identiques.
Une interruption globale à 60 secondes a aussi confirmé l'arrêt du sous-processus en cours, le résumé des checks non exécutés et le nettoyage des bases.
Dans le navigateur, sur une autre base jetable chargée avec le même catalogue : inscription, ouverture/révélation de cinq cartes et collection persistante après rechargement, à 1 280 px et 390 px. Le build applicatif précédent a été réutilisé ; cette tâche ajoute des outils administratifs et une annotation de lint, sans changement du comportement applicatif.
