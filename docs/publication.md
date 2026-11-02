# Publier vers production

La publication reste une action humaine. Une fois la migration intégrée à `main` et sa CI verte :

```bash
nvm use 24
npm run production:publish
# Après relecture de l'aperçu et décision de publier :
npm run production:publish -- --apply
```

La commande récupère `origin`, lit les SHA distants de `main` et `production`, puis exige le dernier run du workflow `.github/workflows/ci.yml` pour un **push de ce SHA exact sur main**, terminé avec succès. Le job `Checks` doit lui aussi avoir réussi : un job ignoré ne suffit pas. Aucun résultat sur la branche de migration ou sur une PR ne remplace celui de `main`.

L'aperçu ne pousse rien. `--apply` pousse ce SHA vers `production`, sans changer la branche locale ni les fichiers des autres agents. Si `production` n'existe pas encore, cette opération la crée. Si elle contient des commits absents de `main`, la commande refuse : réintégrer d'abord ces commits à `main` et attendre sa CI. Aucun merge commit non testé n'est créé, aucun push forcé n'est utilisé. Si les branches bougent pendant la vérification, relancer l'aperçu.

Une erreur d'API, une CI absente, rouge, annulée ou en cours interrompt la publication. Pas d'attente automatique ni d'option pour ignorer la CI. Les requêtes API et commandes Git ont un délai de 15 secondes chacune. Après une erreur réseau pendant le push, vérifier le SHA distant avant de réessayer : le serveur peut avoir accepté le push.

## Accès GitHub

Git utilise l'accès existant à `origin` (SSH ou HTTPS). Pour l'API d'un dépôt privé, fournir `GH_TOKEN` (ou `GITHUB_TOKEN`) dans l'environnement : jeton finement limité au dépôt avec **Actions: read** et Metadata: read. Aucun droit API d'écriture n'est nécessaire ; le push utilise Git. Ne jamais coller ce jeton dans une commande versionnée ou dans les logs. Le script ne charge pas `.env`.

Sans jeton, l'API reste utilisable tant que le dépôt est public, dans les limites de débit GitHub. La visibilité n'est pas modifiée par ce script.

## Limite du contrôle local

[GitHub réserve la protection des branches privées aux forfaits payants](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches). Pour un dépôt personnel privé, GitHub Pro permettrait d'imposer `Checks`, d'exiger la mise à jour avec la branche cible et d'appliquer la règle aux administrateurs.

Sur GitHub Free privé, **un push direct ou une fusion depuis GitHub contourne cette commande**. Tous les agents doivent donc passer par elle pour publier. Ce n'est pas une protection serveur équivalente à GitHub Pro.

## Périmètre et vérification

Cette étape configure seulement la promotion de code. Elle ne configure pas Vercel ou Supabase, n'applique pas de migration à une base et ne crée pas de tag ni de GitHub Release. Avant une vraie publication : sauvegarde, migrations compatibles et déploiement doivent être prêts selon [le plan](deploiement.md).

`npm run check:publication` vérifie les refus, l'aperçu et le push du SHA exact avec API simulée et Git simulé puis réel sur un dépôt jetable ; il est aussi découvert par `npm run check`. Le parcours du site après une vraie publication reste à tester : inscription, connexion, tirage, collection, équipe, combat et rechargement.
