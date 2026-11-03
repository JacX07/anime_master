# Audit de sécurité — 3 novembre 2026

Audit ciblé terminé sur les chemins décrits ci-dessous, sans certification ni garantie de sécurité absolue. Les deux failles applicatives démontrées ont un correctif testé et versionné. Aucune publication, fusion ou poussée vers production ; aucun test intrusif sur Supabase ou autre service tiers. Les environnements distants n'ont pas reçu la nouvelle migration pendant cet audit.

## Correctifs

### Moyenne — cron accessible sans secret — corrigé

Avant : `/api/auctions/close` acceptait un appel anonyme lorsque `CRON_SECRET` manquait. Tout appelant pouvait déclencher le traitement global des enchères échues. L'idempotence et la vérification d'échéance limitent l'impact ; aucune clôture anticipée ni aucun vol démontré.

Après : secret absent ou incorrect → 403 avant traitement ; secret valide → traitement autorisé. Test `scripts/check-cron-access.ts`, avec clôture simulée et aucune connexion base : régression 200 avant / 403 après, puis cas autorisé. Navigateur privé : refus 403 confirmé avant et après push. Correctif : `88dcf2c`.

### Moyenne — limiteur HTTP absent sur les Server Actions auth — corrigé

Avant : `auth.api.signInEmail` / `signUpEmail`, utilisés par les formulaires, contournaient le hook du limiteur HTTP Better Auth. Reproduction indépendante `scripts/audit-auth-rate-limit.mjs` : cinq appels directs → `[401,401,401,401,401]`, cinq appels HTTP au handler → `[401,401,401,429,429]`. Ce script démontre la propriété de la bibliothèque ; il n'importe volontairement pas le correctif applicatif.

Après : `authThrottle` est un hook Better Auth commun aux chemins HTTP et directs. Les incréments sont atomiques dans PostgreSQL ; les instances partagent leurs compteurs. Politique : 10 tentatives par identité normalisée et par minute, plus 300 tentatives globales par minute. Les identités sont hachées dans les clés et les entrées expirées sont supprimées progressivement. Aucun en-tête IP fourni par un client n'est utilisé comme preuve d'identité. Table privée protégée par RLS et révocation des droits API. Panne du stockage → refus 503, sans détail de connexion. Les erreurs auth non reconnues ne sont plus journalisées intégralement.

Validation `scripts/check-auth-throttle.ts` : deux instances, vingt tentatives concurrentes, dix refus de connexion normaux et dix 429 ; HTTP/direct partagent la limite, normalisation, expiration et plafond global conformes, panne simulée refusée. Navigateur : inscription, connexion valide, rechargement avec session, déconnexion ; onze tentatives du formulaire sur une identité inconnue affichent le message de limitation à la onzième. Une autre identité reste utilisable. Correctif : `2ac58c2`.

**Application distante :** la migration `20261103020000_auth_throttle` doit être appliquée sur chaque base cible avant d'y utiliser le nouveau code. Sans cette table, l'authentification refuse de fonctionner. Cette étape distante et la publication restent hors des tests locaux réalisés ici.

**Compromis de disponibilité :** un attaquant peut consommer le quota d'une identité ou le plafond global ; ce dernier est calibré pour un petit jeu privé. Ce mécanisme ne remplace ni protection réseau contre le déni de service, ni supervision et adaptation des quotas. Une même personne utilisant deux identifiants de connexion différents peut disposer de deux quotas d'identité. Le plafond global reste partagé.

## Migration Supabase et contrôle des accès

La migration `20261103010000_private_game_tables` a été rejouée deux fois sur PostgreSQL jetable avec droits permissifs au départ, rôles anon/authenticated, table User et séquence. SELECT, TRUNCATE et nextval sont refusés sous les deux rôles (42501), accès propriétaire conservé, droits par défaut anon retirés pour une nouvelle table. Aucun contact Supabase pour ces tests.

Le check `scripts/check-database-access.ts` a été étendu : RLS de toutes les tables ordinaires/partitionnées public ; privilèges effectifs de table et colonne, PUBLIC/héritages, vues et vues matérialisées, séquences, fonctions public exécutables, appartenance au propriétaire et rôles superutilisateur/BYPASSRLS. Il vérifie aussi que Prisma lit toujours le catalogue.

`audit-database-access.ts` introduit puis retire des expositions sur le serveur jetable : TRUNCATE, SELECT de colonne, SELECT à PUBLIC, séquence, fonction SECURITY DEFINER, vue, groupe de rôles, BYPASSRLS et désactivation RLS d'AuthThrottle. Chaque exposition provoque un échec du check ; chaque restauration repasse au vert. Vérifications réussies avant et après le redémarrage de l'environnement (PostgreSQL 14.24 pour la dernière passe ; premier serveur embarqué distinct).

Limites : ces tests ne sont pas un nouvel inventaire du Supabase distant. Les futures tables doivent activer RLS explicitement ; les privilèges par défaut dépendent du rôle créateur. Propriétaire, superutilisateur et BYPASSRLS restent privilégiés. Le check refuse conservativement toute fonction public accessible aux rôles API, même si une extension en fournit une sans accès aux données du jeu ; un éventuel échec distant nécessite un examen, pas une désactivation aveugle du contrôle. Les autres schémas Supabase/Storage ne sont pas couverts.

## Pentest dynamique local

Serveur Next sous Node 24, catalogue de fixtures et comptes jetables. Les deux joueurs créés par `scripts/audit-local-security.ts` sont retrouvés dans la base locale pour confirmer que le serveur testé utilise bien la même cible. Délais de chaque requête : 15 s ; borne du script : 60 s. Le script refuse une base qui n'est pas locale et nommée am_pentest*.

| Domaine | Scénarios et résultat |
| --- | --- |
| Auth/permissions | Album sans session → 401 ; builder sans session → 404 ; cron anonyme → 403. Inscription/connexion testées. Après sign-out, l'ancien cookie ne restitue plus de session. |
| SQLi | Charges `' OR 1=1 --` et `'; DROP TABLE User; --` sur la recherche authentifiée : réponses 200 sans erreur SQL, catalogue et comptes conservés. SQL brut applicatif relu : paramètres Prisma, pas de concaténation d'entrée utilisateur démontrée. |
| IDOR | Joueur A tente de verrouiller, vendre, proposer à l'échange et inclure dans une squad les cartes de B : refus et propriétaire inchangé. Server Action toggleLockAction : A refusé, B accepté, persistance constatée en base. |
| CSRF | API signup avec origine hostile → 403, aucun compte créé. Server Action avec session valide et origine hostile → refus Next (500), carte inchangée ; même action propriétaire de même origine acceptée. Suppression d'illustration d'origine hostile → 403. |
| Uploads | SVG présenté comme PNG refusé 400 ; corps de 7 Mio refusé 413 ; clé invalide → 404 ; code relu pour validation des signatures, taille de flux bornée, clés bornées, CSP sandbox/nosniff et refus en production. Check illustrations existant réussi. Aucun upload valide utilisé pour écraser un asset existant. |
| XSS | Charges stockées dans le nom et la description d'un personnage du catalogue jetable. Dans le navigateur, la charge du nom apparaît en texte ; aucun img avec onerror injecté, aucun marqueur JS exécuté. Valeurs d'origine restaurées. Charge réfléchie dans q également testée. |

Les checks existants trades, auctions, squads, battles et illustrations ont aussi réussi sur la base jetable. Les tests sont des échantillons ciblés : ils ne couvrent pas toutes les combinaisons d'actions, de joueurs, de concurrence et de payloads.

## CodeQL

CLI officielle 2.27.4 ; pack officiel JavaScript 2.5.0 ; suite explicite security-and-quality + security-experimental, complétée par githubsecuritylab/codeql-javascript-queries 0.9.0 : 245 requêtes résolues (224 officielles et 21 Community). Trail of Bits ne fournit pas de pack JavaScript dans le catalogue de la compétence. Contrôle qualité de la base réussi, zéro erreur d'extraction. Comparaison de l'archive source avec le dépôt : les 229 fichiers applicatifs TS/TSX attendus sont présents. La seconde extraction inclut aussi des fichiers internes de l'outil local, identifiés séparément dans le triage.

Diagnostics complémentaires exécutés séquentiellement : 84 sources reconnues et 19 sinks SQL/fichier/commande recensés, CSV conservés dans diagnostics/. Les premiers essais de compilation ont dépassé 60 s ; réussite avec 3 Go et une borne de compilation de 180 s.

Modèles supplémentaires : paramètres des modules Server Actions importés par alias et sinks SQL bruts du wrapper Prisma. Ils complètent les modèles standards sans garantir une compréhension complète des conventions Next 16, du plugin username, du stockage JSON ou de Better Auth.

Résultats officiels avec modèles : huit alertes applicatives, toutes revues ; aucune exploitation supplémentaire établie. La dernière passe ajoute une alerte use-before-declaration dans l'outil CodeQL lui-même, hors application.

| Alertes | Triage |
| --- | --- |
| 3 untrusted-data-to-external-api | signIn/signUp transmettent volontairement les identifiants à l'instance Better Auth locale ; PASSWORD_MIN est une constante. Pas d'API distante d'exfiltration sur ces flux. |
| XSS album/items.tsx :14 | albumHref produit un chemin interne /album et encode les paramètres via URLSearchParams ; pas de schéma javascript contrôlé par l'entrée. |
| XSS album/items.tsx :17 | URL de catalogue utilisée dans img.src, pas dans du HTML exécuté ; texte React échappé. Pas de XSS démontrée par ce sink. |
| 2 XSS illustrations/Editor.tsx | Images du catalogue/manifest dans img.src ; pas d'insertion HTML. Éditeur indisponible en production. Tests des charges stockées et uploads décrits plus haut. |
| log-injection sound.ts :128 | Console navigateur sur erreur de chargement d'un son dont le chemin est construit à partir du catalogue statique des éléments. Pas de journal serveur ou de commande injectée démontré. |

Le pack Community ajoute 42 points d'audit et 377 lignes d'inventaire de sources/sinks, pas 419 exploits prouvés : 38 occurrences code-injection/using-eval sont des timers avec callbacks fonctionnels, 2 processus enfant passent des tableaux d'arguments sans shell et sont accessibles seulement au builder hors production, 1 champ nommé query est le corps d'une requête GraphQL AniList, et 1 dangerouslySetInnerHTML utilise les fragments SVG statiques STATUS_FX. Les 84 sources reconnues (dont 76 liées aux actions) et 293 sinks sont conservés comme inventaire. Aucun nouveau flux exploitable établi par cette passe. Les routines du builder exécutent volontairement des outils de développement : ne pas exposer un serveur de développement à des utilisateurs non fiables.

Bases, journaux, suite, modèles et SARIF bruts conservés dans `static_analysis_codeql_1/`, ignoré par Git. Le triage ne supprime pas les alertes brutes. Les arrêts d'essai 137, 99 (mémoire insuffisante) et 124 (diagnostic dépassant le délai) sont conservés ; l'analyse officielle réussie utilise un thread et 3 Go, Next arrêté. Graphify query et update exécutés ; SQL lu directement, car tree_sitter_sql n'est pas installé.

## Dépendances et secrets

Mises à jour compatibles du lockfile : correctifs transitifs pour deepmerge-ts, fast-uri, mysql2 et zod, notamment via Prisma CLI 7.10.1. `npm audit --omit=dev` : **zéro vulnérabilité signalée** à la date du test. Cela dépend de la base d'avis npm et ne prouve pas l'absence de faille inconnue.

`npm audit` complet conserve **16 alertes modérées de l'outillage autour de minimatch**. Les consommateurs historiques appellent l'ancienne API fonctionnelle ; imposer minimatch 11 ou le downgrade d'ESLint proposé par audit serait une rupture de compatibilité. Ces chemins de lint utilisent les configurations du dépôt, pas des motifs glob fournis par les joueurs ; délais déjà bornés. Risque résiduel de l'outillage documenté, pas présenté comme corrigé. Ne pas lancer ces outils sur des configurations non fiables.

Gitleaks 8.30.1 sur l'historique Git des sources : aucune alerte. Scan explicitement exclu des assets public, fichiers graphify et compétences .agents/.claude ; les .env non versionnés n'ont pas été affichés. Rapports expurgés et résultats npm conservés dans `data/audit-evidence/`, hors Git. Ce périmètre ne couvre pas les secrets hébergés chez les fournisseurs, les objets de stockage ni l'ensemble de l'historique des assets.

## Validation et limites finales

Suite globale locale : **54/54 étapes réussies**, zéro échec, zéro check ignoré, nettoyage réussi ; elle comprend lint, TypeScript, migrations et 49 checks. Résultats conservés dans data/audit-evidence/full-check.log. La CI était verte sur e955f78 au début de l'audit, puis sur 2ac58c2 et sur les commits intermédiaires d'autres agents ; cela ne vaut pas validation d'un SHA ultérieur.

Aucun test de charge volumétrique, de services tiers, de contournement des protections du fournisseur, de récupération de mot de passe non configurée ou de navigateur exhaustif n'a été réalisé. Aucune vulnérabilité découverte n'est automatiquement déclarée exploitable en production ; les preuves locales et les observations statiques sont distinguées ci-dessus. La nouvelle migration et les parcours publics restent à appliquer/vérifier par l'humain avant publication.


Validation finale du build local : `npm run build` réussi sous Node 24, avec connexion uniquement à am_pentest_final (PostgreSQL jetable). Le même build a ensuite passé `AUDIT_NEXT_MODE=production node --import tsx scripts/audit-local-security.ts` : deux joueurs, contrôles auth/SQLi/CSRF/IDOR et révocation réussis ; toutes les écritures d’illustration refusées 403 en production. Lint complet : zéro erreur (15 avertissements préexistants). TypeScript et les 54 étapes de la suite globale passent. Le code applicatif et le lockfile du build correspondent aux fichiers poussés sur main@77354bf, vérifiés après push ; les seules modifications restantes à ce moment concernent les scripts de test, ce rapport et graphify.

Navigateur sur ce build local (1280 × 800 puis 390 × 844) : inscription d'un compte jetable et session reconnue, déconnexion, limitation du formulaire à la onzième tentative, message intégralement visible à 390 px et limitation conservée après rechargement. Contrôles rejoués après push des fichiers applicatifs et du lockfile. Aucun parcours sur un domaine public distant.
