# Plan de mise en production et CI/CD

Statut : **plan à valider**, rien n'est encore en place. Rédigé le 2026-11-02.

Contexte : un seul développeur humain, plusieurs agents qui poussent sur `main` en continu, base SQLite (`data/app.db`), fangame gratuit (aucun revenu, donc on vise le coût minimum).

## 1. Vocabulaire

- **CI (intégration continue)** : à chaque push, une machine GitHub installe le projet et lance les vérifications. Question posée : *le code est-il sain ?* Résultat : coche verte ou croix rouge sur le commit, mail en cas d'échec.
- **CD (déploiement continu)** : quand on le décide, le code vérifié est envoyé sur le serveur de prod. Question posée : *le code est-il en ligne ?*
- **Workflow GitHub Actions** : un fichier YAML dans `.github/workflows/` qui décrit quand et quoi exécuter.
- **Secret GitHub** : valeur sensible (clé SSH, mot de passe) stockée dans les réglages du repo, injectée dans les workflows, jamais écrite dans le code.
- **Migration** : modification du schéma de la base (Prisma). `migrate dev` sert en local et peut réinitialiser la base ; `migrate deploy` applique seulement les migrations en attente et sert en prod.

## 2. Le circuit cible

```
agents ──push──▶ main ──▶ CI : install, lint, typecheck, checks   (automatique, à chaque push)
                                   │ ✓
                                   ▼
                toi : « je publie »  (tag vX.Y ou bouton « Run workflow »)
                                   │
                                   ▼
          CD : SSH sur le VPS → sauvegarde base → git checkout du tag
               → npm ci → prisma migrate deploy → build → redémarrage
```

Principes :

- `main` reste la branche de développement. Les agents continuent comme aujourd'hui.
- **La prod ne change que sur décision humaine** (tag ou bouton). Pas de déploiement automatique à chaque push : avec plusieurs agents, la prod serait instable.
- On ne publie qu'un commit dont la CI est verte.
- Retour arrière = redéployer le tag précédent (et restaurer la sauvegarde si une migration a cassé la base).

## 3. Les étapes

Chaque étape est utilisable seule. On valide et on teste une étape avant de passer à la suivante.

### Étape 1 — `npm run check` en local

But : une seule commande qui dit si le projet est sain.

- Ajouter un script `typecheck` (`tsc --noEmit`).
- Ajouter un script `check` qui enchaîne : lint, typecheck, puis tous les `scripts/check-*.ts` (y compris les 10 qui n'ont pas d'entrée dans `package.json`), et affiche un résumé des échecs à la fin.
- Les checks tournent sur **une copie temporaire de la base** (`DATABASE_URL` pointé vers un fichier jetable), jamais sur `data/app.db`.
- Chaque check reste borné par un timeout (voir `AGENTS.md`).

À décider : quels checks sont trop lents ou dépendent de données absentes ; les marquer plutôt que les ignorer silencieusement.

### Étape 2 — Données de test versionnées

Problème : les checks ont besoin de personnages en base. L'import AniList complet prend ~6 min et dépend d'une API externe : inutilisable en CI.

- Créer un petit jeu de données fixe (~100 personnages, franchises, illustrations minimales ou placeholders) versionné dans le repo, par exemple `fixtures/`.
- Un script `db:seed-test` crée une base vide, applique les migrations (`migrate deploy`) et charge ces données.
- `npm run check` utilise cette base, en local comme en CI : mêmes résultats partout.

### Étape 3 — CI GitHub Actions

- Fichier `.github/workflows/ci.yml`, déclenché à chaque push et pull request.
- Étapes : Node 24 (lu depuis `.nvmrc`), `npm ci` avec cache, `db:seed-test`, `npm run check`.
- Résultat visible sur chaque commit dans GitHub. Activer les notifications mail d'échec.
- Gratuit pour un repo public ; quota mensuel gratuit pour un repo privé (largement suffisant ici).

Règle à proposer ensuite dans `AGENTS.md` (avec permission) : lancer `npm run check` avant chaque push et ne pas laisser la CI rouge.

### Étape 3 bis — Contenu reproductible depuis le repo

Problème : une partie du contenu du jeu vit dans la base (personnages, séries, sorts modifiés) et n'existe que dans `data/app.db` sur le PC de dev. La prod ne doit pas dépendre de ce fichier.

Principe : la prod est la seule source de vérité des **données joueurs** ; le **contenu** va du repo vers la prod, en ajout ou mise à jour, jamais en suppression.

- Structure : migrations Prisma (`migrate deploy`).
- Personnages et séries : scripts d'import rejouables (ajout ou mise à jour), lancés par le déploiement. Pour ne pas dépendre d'AniList à chaque déploiement, exporter le contenu dans un fichier versionné (ex. `content/characters.json`) et l'importer en prod.
- Corrections ponctuelles (rareté, stats d'un personnage) : migration de données dans le repo, pas d'édition à la main dans une base.
- Sorts modifiés (`SpellOverride`) : à exporter en fichier versionné, le Spell Builder étant un outil de dev.
- Bannières : déjà créées par le code (`ensureBanners`).

En attendant, `npm run play:sync` applique ce principe localement (copie `app.db` → `play.db` sans toucher aux joueurs).

### Étape 4 — Le VPS

Guide pas à pas à écrire dans ce fichier au moment de l'étape. Contenu prévu :

- Choix : Hetzner, OVH ou Scaleway, 2–4 vCPU, 4–8 Go RAM, ~5–10 €/mois. Préférer un hébergeur qui prévient avant de couper en cas de plainte (DMCA), le contenu étant de l'anime.
- Sécurité de base : utilisateur non-root, connexion SSH par clé uniquement, pare-feu (ports 22, 80, 443), mises à jour automatiques de sécurité.
- Node 24 via nvm ou paquet officiel ; **une seule version de Node** sur la machine (évite le bug `better_sqlite3`, voir `journal.md`).
- **Caddy** devant Next : HTTPS automatique avec le nom de domaine.
- **pm2** (ou systemd) : relance Next s'il plante et au redémarrage du VPS.
- **Litestream** : réplique `app.db` en continu vers un stockage objet (Cloudflare R2 ou Backblaze B2). Tester une restauration au moins une fois.
- `.env` de prod créé à la main sur le serveur, avec ses propres secrets (`BETTER_AUTH_SECRET` différent du local).
- Données non versionnées à transférer une fois : base initiale et `data/illustrations` (le dossier `data/` est ignoré par Git).
- Optionnel : Cloudflare devant le domaine (cache des images, protection).

### Étape 5 — CD (déploiement)

- Script `scripts/deploy.sh` sur le serveur, lisible et rejouable à la main :
  1. sauvegarde horodatée de `app.db` ;
  2. `git fetch` puis `git checkout <tag>` ;
  3. `npm ci` ;
  4. `npx prisma migrate deploy` ;
  5. `npm run build` ;
  6. `pm2 reload` ;
  7. vérification : `curl` sur la page d'accueil, sinon message d'erreur clair.
- Workflow `.github/workflows/deploy.yml`, déclenché par un tag `v*` ou manuellement (`workflow_dispatch`). Il se connecte en SSH (clé dans les secrets GitHub) et lance `deploy.sh`.
- Le workflow refuse de déployer si la CI du commit n'est pas verte.
- Premier déploiement fait à la main, en suivant le script, pour comprendre chaque étape.

### Étape 6 — Plus tard

- **Playwright** : 3–4 parcours rejoués automatiquement (inscription, ouverture de paquet, combat, échange).
- **Docker Compose** quand le serveur temps réel (chat, ranked, PvP) arrivera : Next + serveur WebSocket + Caddy + Litestream décrits dans un seul fichier.
- **Environnement de staging** (copie de la prod sur le même VPS, autre port et autre base) si les mises en prod deviennent risquées.
- Supervision : alerte si le site ne répond plus (UptimeRobot ou équivalent, gratuit).

## 4. Règles de prod à retenir

- Toujours `prisma migrate deploy` en prod, **jamais** `migrate dev` ni `db push`.
- Toujours une sauvegarde de la base avant une migration.
- Ne jamais committer `.env` ni `data/`.
- Les secrets vivent dans le `.env` du serveur et dans les secrets GitHub, nulle part ailleurs.
- On ne publie qu'un commit avec une CI verte, via un tag.
- Une restauration de sauvegarde non testée n'est pas une sauvegarde.

## 5. Questions ouvertes

- Repo GitHub public ou privé (impacte le quota CI gratuit et la visibilité du code) ?
- Nom de domaine ?
- Hébergeur du VPS ?
- Les comptes et collections du dev doivent-ils être repris en prod, ou la prod démarre-t-elle vide (seulement les personnages) ?
