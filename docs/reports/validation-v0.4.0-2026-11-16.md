# Validation avant publication de v0.4.0

Date : 16 novembre 2026. Dépôt `anime_master-postgres`, branche `feat/mobile-five-tabs`.
Référence initiale : `f35a3b7`. Aucune commande de publication, fusion, création de tag ou modification de la branche distante `production`.

## Résultat et correctifs

La suite exécutée passe après correction : **72 scripts de contrôle + lint + génération des types Next + TypeScript = 75 étapes réussies**. Le build final réussit également. Cela couvre les scénarios ci-dessous, sans garantir l’absence de tout bug.

| Défaut reproduit | Correctif | Vérification |
| --- | --- | --- |
| Six statuts des nouveaux kits sans correspondance VFX | Réutilisation des effets existants pour `susanoo`, `kannon`, `auraPierce`, `dread`, `puppet`, `godHand` | `check-combat-vfx`, contrôleur réel dans Chromium, pause, vitesses, nettoyage et réduction des animations |
| Retour d’une fiche vers Album effaçant recherche et filtres | Destination de retour locale transmise par les cartes, y compris celles chargées par pagination | Gojo puis retour à Satoru, UR/MAGIE/possédé ; destination externe ignorée |
| Tiroir Collections mobile fermé encore focalisable hors écran | Visibilité masquée à la fermeture, Échap et restauration du focus | 390 px au clavier ; panneau desktop toujours visible |
| Un autre exemplaire du même personnage proposé à un autre poste | Exclusion par personnage occupé, sans empêcher de remplacer le poste courant | Deux exemplaires Gojo bloqués au poste 2, disponibles au poste 1 |
| Défaite accompagnée du texte « équipe adverse à terre » | Texte déterminé par le vainqueur | Défaite réelle contre l’équipe d’essai, texte « Toute ton équipe est à terre » |

Les règles de combat, les probabilités, les récompenses et le schéma de données ne sont pas modifiés par ces correctifs. Les notes joueurs sont ajoutées à **À venir — v0.4.0** dans `CHANGELOG.md`, source de l’écran Actualités.

## Contrôles automatisés

- Node **v24.21.0**, Next **16.4.3**.
- Postgres 17 temporaire sur une instance locale indépendante, migrations appliquées et catalogue de 401 personnages chargé. Les contrôles métier ne s’exécutent pas sur les comptes dev ou production.
- Tous les scripts `scripts/check-*.ts` présents ont été exécutés, **sauf `check-publication.ts`** : ce script appelle la fonction de publication, interdite aux agents même en aperçu. Aucun équivalent n’a été lancé.
- Premier passage : 74/75 étapes réussies ; seul `check-combat-vfx.ts` échouait sur un statut manquant. Après ajout des six correspondances, ce contrôle passe. Les autres contrôles métier n’ont pas été modifiés et n’ont pas été relancés inutilement.
- Après les changements UI : ESLint ciblé et `npm run build` réussis, compilation et TypeScript compris. Après modification des notes : `check-changelog.ts` réussi.
- `npm audit --omit=dev --json` : **0 vulnérabilité signalée**. Ce résultat ne remplace pas un audit de sécurité manuel.
- `prisma migrate status` sur dev : **Database schema is up to date**. La production n’a pas été contactée pour ce contrôle.
- `graphify update .` exécuté. Les fichiers générés déjà sales au démarrage restent hors des commits de correction.

Domaines couverts par les 72 scripts : comptes et limitations d’authentification, invitations et tutoriel ; collection, invocations et bannières ; économie, inventaire, équipement, forge et éveil ; squads et budget ; moteur, replays (300 combats), sélection et inspection des sorts, kits uniques, passifs, dégâts magiques et Toji ; histoire, étoiles, boss et butin ; donjons, tour, raids et empereurs ; arène et duels ; quêtes, succès, expéditions, classements, amis, guildes, chat, échanges et enchères ; synchronisation de contenu, accès à la base et routes de développement.

## Parcours effectués dans Chromium

Site local lancé sur **http://localhost:3012**, build optimisé, compte dev `agenttest`. Les largeurs sont des fenêtres de navigateur, pas des appareils physiques.

### Navigation et affichage

25 destinations ouvertes en desktop **1440×900** et mobile **390×844** : `/`, `/jouer`, `/equipe`, `/album`, `/inventaire`, `/packs`, `/histoire`, `/donjons`, `/tour`, `/raid`, `/raid/empereurs`, `/arene`, `/expeditions`, `/eveil`, `/forge`, `/quetes`, `/achievements`, `/leaderboard`, `/friends`, `/guilds`, `/market`, `/menu`, `/parametres`, `/guide`, `/changelog`.

- Aucun débordement horizontal de document détecté sur ces vues ; `/raid` redirige normalement vers les empereurs.
- Accueil, Jouer, Album, Squads, Inventaire, Invocation, Menu et Paramètres également contrôlés à **320×568, 375×667, 430×932 et 768×1024**, après disparition des écrans de chargement.
- Combat contrôlé à **320×568, 375×667, 390×844, 430×932, 768×1024, 844×390 et 1440×900** : huit cartes présentes, pas de largeur débordante, commandes vitesse/pause et fiche d’inspection bornées à l’écran.
- Captures inspectées pour l’accueil à 320 px. Les alertes et erreurs JavaScript ont été surveillées pendant les parcours ; aucune erreur applicative relevée. Des avertissements Next sur des CSS préchargées non utilisées apparaissent lors des changements de route.

### Interactions et persistance

- **Connexion** : redirection d’un visiteur non connecté vers `/login`, erreur pour un mot de passe incorrect, puis connexion valide dans un profil privé.
- **Accueil** : choix de Light Yagami, rechargement avec choix conservé, retour à Gojo. Ouverture et fermeture du chat sans envoyer de message.
- **Collection** : pagination 60 → 120 cartes ; recherche sans résultat, puis Satoru ; consultation de Gojo et retour avec filtres ; panneau mobile ouvert/fermé au clavier. Les cartes obtenues par invocation sont retrouvées dans la collection après navigation.
- **Squads** : création d’une squad temporaire, choix de Gojo, sauvegarde et rechargement ; vérification des deux exemplaires dans le sélecteur après correction.
- **Inventaire** : recherche Acier écarlate, ouverture du détail et accès à la forge ; pas de fabrication destructrice d’objets sur le compte partagé.
- **Invocation** : consultation des taux, invocation ×5, passage de l’introduction, révélation de toutes les cartes, retour Album et recherche d’une nouvelle carte obtenue. Les cinq cristaux ont été consommés sur le compte de test.
- **Quêtes** : affichage de la progression et changement quotidien/hebdomadaire. Aucun objectif prêt à réclamer dans ce parcours ; les réclamations sont couvertes par les scripts métier.
- **Combat d’essai** : aucun sort armé initialement ; appui prolongé au clavier ouvrant une fiche persistante après relâchement ; Échap ; survol PC sans sélection ; choix d’attaque, quatre cibles ennemies surlignées puis confirmation ; pause/reprise, Skip désactivé, Auto activé puis désactivé, abandon avec confirmation. Une partie Auto est allée jusqu’à une défaite réelle et au récapitulatif corrigé.
- **Histoire** : préparation du combat 1 du Grand Concert, composition automatique, victoire, butin, retour carte et rechargement. Trois étoiles et combat 2 débloqué sont conservés ; +55 Ryō et +1 cristal affichés.
- **Réglages** : effets coupés, rechargement conservant ce choix, puis réactivation.
- **Actualités** : v0.4.0 toujours En préparation ; cinq nouveaux points de correction visibles à 320 et 1440 px.

Pour l’appui prolongé, les événements clavier et leur durée ont été exercés dans le navigateur ; aucun véritable geste de doigt sur appareil tactile n’a été simulé ni revendiqué.

### Effets visuels et nettoyage

Un bundle temporaire des modules réels `CombatVfx` et `STATUS_FX` a été exécuté dans le navigateur, sans ajouter de route ni dépendance au projet. Chacun des six statuts produit son SVG et ses animations. Les animations passent en pause à ×2, reprennent à ×4 après engagement par le navigateur, puis le SVG disparaît naturellement. `dispose()` ne laisse ni canvas, ni nœud d’effet, ni animation dans la racine de test. Avec la préférence de réduction des animations activée pour ce test isolé, aucun effet n’est créé. Aucune mesure de FPS ou de consommation mémoire sur matériel mobile n’a été effectuée.

## Nettoyage et traçabilité

- Squad `Audit v040 temporaire` supprimée uniquement sur le compte dev identifié ; disparition confirmée dans l’interface.
- Base jetable supprimée et instance Postgres locale temporaire arrêtée.
- Les résultats d’invocation et de l’histoire restent sur le compte partagé de test ; aucune donnée de production touchée.
- Journaux bruts conservés pour cette session dans `/tmp/anime-v040-audit-GFHQWr/` : `summary.json`, logs par contrôle, `build-final.log`, `migrate-status-dev.log`, `npm-audit.json`, `graphify-update.log`.
- Build testé : `IIkrM8INC9_xL4RsQmx3z`. Les correctifs source sont committés et poussés ; les parcours corrigés ont été vérifiés sur ce build. Les notes sont lues depuis le fichier via `getReleases` avec un cache de plusieurs heures ; terminer leur modification avant le build, puis vérifier le build reconstruit.

## Limites avant la publication humaine

- Pas de partie PvP avec deux joueurs réels dans le navigateur : arène et duels sont couverts par les contrôles automatisés, leurs pages sont ouvertes.
- Pas d’achat réel, d’envoi de chat, d’échange ni d’enchère entre comptes réels. Pas de parcours administratif de production.
- Pas d’iPhone/Android physique, Safari ou Firefox ; safe areas matérielles, clavier virtuel et qualité sonore à l’écoute restent à vérifier sur appareil.
- Pas de test de charge, de déconnexion réseau ni d’endurance prolongée. Les suites ne prouvent pas l’équilibrage statistique de toutes les compositions possibles.
- Les fonctionnalités secondaires listées ont une couverture navigateur de consultation ; leurs mutations et validations reposent sur les scripts de contrôle.
- Les procédures de sauvegarde, déploiement, migrations de production et smoke test du domaine public restent réservées à l’utilisateur. `check-publication.ts` n’a pas été exécuté.
- v0.4.0 reste une version **en préparation** ; aucun tag ni annonce de publication n’a été créé. Le manifeste du package reste à v0.3.0 jusqu’à l’étape de versionnement choisie par l’utilisateur.

## Promotion en règle après validation

Le 16 novembre, l’utilisateur a explicitement demandé d’ajouter les règles de prévention dans `AGENTS.md`. La proposition concernant les statuts VFX est donc promue en règle, ainsi que la prévention des doublons de personnage, des retours sans filtres, du focus dans les tiroirs fermés et des textes de résultat incohérents. La règle de vérification navigateur précise aussi l’attente du contenu visible pendant le streaming Next. Les entrées existantes de `journal.md` portent la mention « promue en règle » ; les résultats de la passe restent inchangés.
