# Journal des agents

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
