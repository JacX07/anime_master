# Compte de test pour les agents

Créé le 2026-11-03 sur la base **dev** (celle du `.env`), jamais sur la prod. À utiliser pour les vérifications dans le navigateur (`/login`).

- Email : `agent-test@anime-masters.test`
- Mot de passe : `AgentTest-2026!`
- Pseudo : `agenttest`

Notes :
- Compte sans privilège : ne pas l'utiliser pour des actions d'administration, et ne pas le créer sur la prod.
- Si le compte a disparu (base dev réinitialisée), le recréer : `POST /api/auth/sign-up/email` avec `email`, `password`, `name` **et `username`** (obligatoire), en-tête `Origin: http://localhost:3012` (valeur de `BETTER_AUTH_URL` dans `.env`, sinon `INVALID_ORIGIN`).
- Sa progression (cartes, étoiles du mode histoire) peut être modifiée par d'autres agents.
