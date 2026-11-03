# Administration et statistiques

> Statut : **lots 1 à 4 codés** (rôles, stats, événements, joueurs et actions). Reste le lot 5 (contenu).

## 1. Objectif
Un espace réservé à l'équipe pour :
- **lire** des statistiques claires (boosters, combats, économie, joueurs) ;
- **agir** sur les comptes et le contenu (corriger, rembourser, bannir, activer une bannière) ;
- tout **tracer** dans un journal d'audit.

## 2. Sécurité (priorité absolue)
Cacher l'URL ne protège pas. La protection est faite côté serveur :
1. `User.role` : `player` (défaut), `moderator` ou `admin`. Jamais modifiable depuis l'interface ; le premier admin est promu par un script en ligne de commande (`npm run admin:promote -- <pseudo>`), les suivants par un admin.
2. Un helper unique `requireAdmin()` lit la session côté serveur et lit le rôle **en base** (pas dans un cookie ni dans le client). Il est appelé :
   - dans `src/app/admin/layout.tsx` (chaque page) ;
   - au début de **chaque** server action et route API `/admin`.
3. Un non-admin (ou un visiteur) reçoit un **404**, pas un 403 ni une redirection vers la connexion : la page n'a pas l'air d'exister.
4. Aucun lien vers `/admin` dans la navigation pour les non-admins.
5. Les actions sensibles (ajuster la monnaie, bannir, promouvoir) demandent une confirmation et un motif obligatoire.
6. Limite de débit sur les actions admin ; tout est écrit dans `AdminAudit`.
7. Un admin ne peut pas se retirer le rôle s'il est le dernier ; un admin ne peut pas en bannir un autre.
8. Une compte banni voit sa session invalidée et ne peut plus se connecter.

### Rôles
| Droit | moderator | admin |
|---|---|---|
| Voir stats et fiches joueurs | oui | oui |
| Bannir / débannir un joueur | oui | oui |
| Notifications à un joueur | oui | oui |
| Ajuster monnaie, cartes, pity | non | oui |
| Bannières, notification globale | non | oui |
| Changer les rôles, voir tout l'audit | non | oui |

`requireRole('moderator')` / `requireRole('admin')` remplace `requireAdmin()` ; un modérateur ne peut pas sanctionner un admin ni un autre modérateur.

## 3. Collecte de données : `GameEvent`
Les tables actuelles gardent surtout l'état. Pour des stats fines, on ajoute une table d'événements en ajout seul :

| Champ | Contenu |
|---|---|
| `id`, `createdAt` | identifiant, horodatage (indexé) |
| `userId` | joueur (nullable, indexé) |
| `type` | `login`, `pack_open`, `battle_end`, `purchase`, `trade`, `auction_end`, `achievement`, `error`… (indexé) |
| `data` | JSON : bannière, raretés tirées, mode, victoire, tours, durée, montants… |

- Helper `track(type, userId, data)` appelé depuis le code serveur existant ; il ne doit **jamais** faire échouer l'action du joueur (try/catch, silencieux).
- Une première version peut aussi lire les tables existantes (`PackOpening`, `Battle`, `CurrencyLedger`…) sans attendre `GameEvent`.
- Pas de données personnelles dans `data` (pas d'email, pas d'IP en clair). Les stats sont agrégées par défaut.
- Rétention à fixer (ex. 180 jours pour les événements bruts, agrégats gardés).

## 4. Pages et statistiques

### 4.1 Tableau de bord
- Joueurs actifs sur 1, 7 et 30 jours ; nouveaux comptes par jour ; rétention J1, J7, J30.
- Boosters ouverts par jour ; combats par jour et par mode.
- Alertes : pics anormaux, erreurs récentes.

### 4.2 Boosters
- Taux de rareté **observés** contre **théoriques**, par bannière (contrôle du tirage).
- Pity : distribution des compteurs, nombre de déclenchements.
- Persos les plus et les moins tirés ; doublons ; cristaux dépensés.

### 4.3 Combats
- Taux de victoire par perso, par sort, par équipe type, par boss.
- Durée moyenne, nombre de tours, abandons.
- Histoire : taux de réussite et étoiles par niveau ; Tour : étage atteint (distribution) ; donjons, raid.
- Persos jamais joués ou toujours joués (équilibrage).

### 4.4 Économie
- Ryō et cristaux créés et dépensés, par source (depuis `CurrencyLedger`).
- Masse monétaire, plus gros soldes, inflation.
- Échanges et enchères : volume, prix médians par rareté.

### 4.5 Joueurs
- Liste avec recherche (pseudo), tri (dernière connexion, solde, progression).
- **Fiche** : inventaire, historique de monnaie, derniers boosters et combats, progression par mode, succès, notes internes.

### 4.6 Journal d'audit
Qui, quand, quelle action, quelle cible, motif, valeurs avant et après. Non modifiable.

## 5. Actions (écriture)
Toutes : admin requis, confirmation, motif, écriture dans `AdminAudit`.
- **Joueur** : ajuster Ryō / cristaux / cristaux spéciaux (via le journal comptable existant, jamais en modifiant directement le solde), offrir ou retirer une carte, rembourser un tirage, réinitialiser un compteur de pity, bannir / débannir, changer le rôle.
- **Contenu** : créer, activer ou désactiver une bannière et ses dates ; envoyer une notification à tous ou à un joueur ; (plus tard) sorts surchargés (`SpellOverride`).
- **Lecture seule** par défaut : les actions viennent après les stats.

## 6. Affichage
- Style existant (`reference.css`, `controls.css`, `PageHeading`), thème sombre/or, boutons sans cadre.
- Graphiques simples et lisibles : courbes (évolution), barres (classements), tableaux triables, filtres de période (7 j / 30 j / tout). Chaque graphique a un tableau de chiffres en dessous ou au survol.
- Agrégats quotidiens précalculés (`DailyStat`) si les requêtes deviennent lentes.

## 7. Plan en lots
1. **Rôle + garde** : `User.role`, `requireAdmin()`, script de promotion, layout `/admin` en 404 pour les autres, `AdminAudit`. Tests : joueur, visiteur, admin.
2. **Stats sur l'existant** : tableau de bord, boosters, combats, économie à partir des tables actuelles.
3. **`GameEvent` + `track()`** : branchement dans boosters, combats, achats, connexion.
4. **Joueurs** : liste, fiche, actions monnaie / carte / bannissement.
5. **Contenu** : bannières, notifications.

## 7 bis. Écarts du lot 4
- Fait : liste (recherche, tri, pagination), fiche, ajustement Ryō / cristaux / cristaux spéciaux, pity, offrir / retirer une carte, bannir / débannir, changer un rôle, journal d'audit (admin : tout ; modérateur : ses actions). Motif obligatoire, confirmation en deux temps, limite de 30 actions par minute.
- Non fait : « rembourser un tirage » (= retirer les cartes + rendre les cristaux, faisable à la main) ; notes internes sur la fiche ; notifications (lot 5).
- Ban : les sessions sont supprimées et aucune session ne peut être recréée ; le cache de session en cookie (5 min) peut laisser un joueur déjà connecté actif jusqu'à 5 minutes.
- Une carte offerte est rattachée à un tirage vide (`lotSize = 0`) ignoré par les statistiques.
- Nouvelle migration `20261103050000_admin_players` : à appliquer en prod (`npm run db:deploy`) avant la publication.

## 8. Décisions
- Deux niveaux : admin et modérateur (voir §2).
- Rétention des événements bruts : 180 jours ; agrégats gardés.
- Pas de stats publiques pour les joueurs (à rouvrir si besoin).
- Graphiques : bibliothèque légère (choix précis au lot 2).
