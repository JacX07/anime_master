# Transfert et synchronisation du contenu

Sous Node 24, depuis la branche Postgres. `npm run content:sync -- --help` affiche les options.
Cet outil ne publie rien, ne migre aucun schéma et ne copie aucune donnée joueur.

## Préparer la cible

Appliquer les migrations avec `npm run db:deploy` en réglant `DIRECT_URL` sur la cible.
Pour une base existante, faire une sauvegarde restaurable avant toute application.
Utiliser une connexion directe ou un pooler session pour cet outil administratif.
Fournir les URLs par l'environnement du terminal ou un gestionnaire de secrets ; ne pas les écrire dans Git ni dans l'historique du shell.
Le script ne charge volontairement pas `.env` et n'utilise jamais implicitement `DATABASE_URL`.

## SQLite → Postgres

Régler `TARGET_DATABASE_URL` sur la base Postgres de destination, puis :

```sh
npm run content:sync -- --sqlite /chemin/vers/app.db
npm run content:sync -- --sqlite /chemin/vers/app.db --apply
```

SQLite est ouvert en lecture seule dans une transaction cohérente. La première commande exécute les écritures puis annule toute la transaction : les contraintes sont donc vérifiées sans conserver les changements.
Le tableau indique le nombre de lignes source et le nombre d'insertions/mises à jour effectives (`written`).
Vérifier cet aperçu avant de lancer `--apply`.

## Dev → prod

Régler explicitement `SOURCE_DATABASE_URL` sur dev et `TARGET_DATABASE_URL` sur prod.
Sauvegarder prod, vérifier les destinations dans le gestionnaire de secrets, puis :

```sh
npm run content:sync -- --postgres
npm run content:sync -- --postgres --apply
```

La source Postgres est lue dans une transaction `REPEATABLE READ`, en lecture seule.
Chaque lancement relit la source : si elle change après l'aperçu, refaire l'aperçu avant l'application.
La décision de publication du site reste séparée et humaine.

## Garanties et limites

- Seules `Media`, `Character`, `CharacterMedia` et `SpellOverride` sont lues et synchronisées, dans l'ordre de leurs dépendances.
- Ajouts et mises à jour seulement. Les lignes absentes de la source restent dans la cible, y compris les anciennes relations et les anciens sorts. Pour retirer un personnage, utiliser `disabled` dans la source.
- `Character.pullCount` commence à zéro pour un nouveau personnage et reste inchangé pour un personnage existant. `createdAt` reste aussi inchangé pour les personnages existants.
- Comptes, sessions, cartes, monnaies, inventaires, historiques et progressions ne sont ni lus ni copiés. Les bannières restent gérées par le code de chaque environnement.
- Les sorts en attente sont copiés comme dans l'ancien `play:sync` ; les travaux d'agents `MechanicJob` ne le sont pas. Les sorts et mécaniques versionnés dans le code sont publiés avec le code.
- Les URLs d'illustrations sont copiées, aucun fichier image n'est transféré. Le choix du stockage reste ouvert.
- Une transaction englobe toutes les écritures : erreur de format, clé étrangère ou délai dépassé annule tout. Les synchronisations concurrentes de cet outil sont sérialisées par verrou transactionnel.
- À contenu identique, le rejeu ne modifie aucune ligne ni son `updatedAt`.
- Limites : lots de 500 lignes, transaction de 60 secondes, instruction SQL de 30 secondes et attente de verrou de 10 secondes. Si le catalogue dépasse ces limites, mesurer avant de les adapter ; ne pas répéter un lancement inchangé indéfiniment.

## Contrôle automatisé

`npm run check:content-sync` utilise `DATABASE_URL` pour créer deux bases temporaires sur un **serveur de test** autorisant `CREATE DATABASE`. Elles sont supprimées en fin de contrôle, même en cas d'échec.
Le contrôle couvre conversion SQLite (JSON, dates, booléens), aperçu annulé, transfert Postgres, rejeu sans écriture, préservation des joueurs/cartes/compteurs, absence de suppression et annulation de toute la transaction sur erreur de référence.
