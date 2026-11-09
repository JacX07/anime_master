# Journal des agents

Bugs et manques de contexte rencontrés une fois. Voir la section « Journal et promotion en règle » de `AGENTS.md`.
Format : `## AAAA-MM-JJ — titre` puis symptôme, cause, correctif, occurrences, statut (ouvert / promu en règle).

## 2026-11-09 — Serveur actif dans un autre checkout

- Symptôme : le serveur Next déjà actif sur le port 3012 utilise `anime_master-postgres`, pas ce dépôt `anime_master` ; les nouvelles maquettes de ce dépôt n'y sont pas visibles.
- Cause : plusieurs checkouts partagent l'environnement ; un port ouvert ne prouve pas quel arbre est servi.
- Contournement : vérifier le chemin du processus avant les tests, puis démarrer ce checkout avec Node 24 sur un port libre (3013 pour la preview Megumin).
- Occurrences : 1.
- Statut : contourné.

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
