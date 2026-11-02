<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Git workflow

- Commit after every feature or small piece of functionality, even a minor one. Don't let several unrelated changes pile up in one commit.
- Push right after each commit (`git push`), so the remote stays in sync.
- Keep commit messages short and descriptive. Don't commit secrets (`.env`) or the local database (`data/`).

## Command timeouts and resource limits

- `yield_time_ms` only controls when tool output is returned; it is not a process timeout.
- Wrap diagnostic commands in `timeout --kill-after=2s 15s`, checks and browser test scripts in `timeout --kill-after=5s 60s`, and builds in `timeout --kill-after=5s 180s`. Report exit code 124 (deadline) or 137 (forced kill); do not retry unchanged indefinitely.
- `npm run build` enforces the build deadline itself. This project uses GNU `timeout` in its Linux/WSL development environment.
- Run builds, typechecks, and browser suites sequentially. Stop the development server before a production build, then restart it for browser verification. Never run `next build` alongside `next dev` or multiple browser suites.
- Browser scripts must also set navigation and interaction deadlines (15 seconds each), close their browser in `finally`, and use a process timeout for the whole suite. Avoid waiting for `networkidle` on the development server; wait for the relevant visible UI instead.
- Keep server startup checks bounded (15 seconds). A persistent development server is the only intentional long-running process; redirect its output to a log and probe it separately with `curl --connect-timeout 2 --max-time 5`.

## Style des boutons

- Tous les boutons d’action textuels et onglets suivent `src/app/controls.css` : fond transparent, aucun encadré rectangulaire, soulignement doré au survol ou pour l’état actif, focus clavier visible et état désactivé distinct.
- Réutiliser les classes partagées existantes ou `ui-button` pour les nouveaux boutons et liens d’action. Ne pas recréer de boutons pleins ou encadrés dans une feuille locale.
- Les cartes et objets sélectionnables conservent leur présentation visuelle de contenu ; les champs de saisie restent identifiables comme champs.

## Vérification sur le site

- Pour chaque fonctionnalité développée, vérifier dans le navigateur sur le site en cours d’exécution que le parcours utilisateur fonctionne réellement et que les changements sont visibles. Les tests automatisés, le typecheck et le lint ne suffisent pas.
- Vérifier avant le commit et le push, puis confirmer après le push que le site testé utilise bien la version poussée. Corriger les problèmes constatés et refaire le parcours avant d’annoncer la fonctionnalité terminée.
- Tester les interactions concernées et les états pertinents (succès, erreur, persistance après rechargement), sur les vues et tailles d’écran affectées.
- Si l’accès au site, l’authentification ou le déploiement bloque cette vérification, indiquer précisément ce qui n’a pas été vérifié. Ne jamais présenter une fonctionnalité comme validée sur le site sans l’avoir testée.
- Cette exigence s’applique aussi aux sous-agents : l’inclure dans leurs consignes et leur demander les parcours testés et les résultats.

## Session handoff

- At a completed task boundary, when the conversation is getting long, or when the user is switching topics, offer a concise handoff for a fresh session.
- Keep it under 10 lines: goal, decisions, current task/status, changed files and Git state, next step, and unresolved questions.
- Do not repeat the conversation history or claim to create/switch sessions. The user starts the fresh session and can provide the handoff.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

## Token-efficient defaults

- At session start, invoke `caveman` if available and keep it active until the user asks for normal mode.
- For coding tasks, use `ponytail` if available.
- Use `context-engineering` when starting a session, switching tasks, or changing project instructions/context; do not load it for unrelated prompts.
