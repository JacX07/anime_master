# Anime Masters — Social et succès

[← Index des specs](README.md)

## Étape 5 — Social

### Objectif
Faire jouer les joueurs ensemble : profils publics, amis, guildes, messagerie.

### Décisions validées
- Album **public** par défaut (option « privé » envisageable plus tard).
- Guildes : création à 1 000 Ryō, 20 membres maximum, une seule guilde par joueur.
- Chat : messages privés entre amis, chat de guilde et **chat général** (décidé le 2026-11-04, remplace « pas de chat global »). Un seul **widget de chat en bas à droite** de toutes les pages, avec trois onglets : Guilde, Général, Privé.
- Temps réel : **polling toutes les 3 secondes** en local, vrai temps réel à la mise en ligne.

---

### 1. Profils publics et vitrine
- `/u/[pseudo]` : pseudo, date d'inscription, Elo, score Collection, nombre de personnages uniques, succès, guilde.
- **Vitrine** : jusqu'à 6 cartes épinglées, affichées en haut du profil. Une carte vendue ou échangée disparaît de la vitrine.
- **Album public** : consultable par tous, avec les mêmes filtres que son propre album, sans les actions (vendre, verrouiller…).

### 2. Amis
- Demande → acceptée / refusée ; suppression possible des deux côtés. Maximum 100 amis.
- Statut : « en ligne » si activité dans les 5 dernières minutes, sinon « vu il y a X » (`lastSeenAt`, mis à jour au plus une fois par minute).
- Raccourcis : défier, proposer un échange, voir le profil, envoyer un message.
- **Blocage** : un joueur bloqué ne peut plus envoyer de demande d'ami, de message, de défi ni d'offre d'échange. Bloquer supprime l'amitié existante.

### 3. Guildes
- Création : 1 000 Ryō (ligne `GUILD_CREATE` dans le journal).
- Nom unique, tag unique de 2 à 4 caractères (lettres et chiffres) affiché à côté du pseudo, description (500 caractères maximum), emblème du sprite héraldique (direction artistique du site). Nom de 3 à 40 caractères, unicité sans distinction de casse ; tag normalisé en majuscules.
- 20 membres maximum.
- **Rôles** :
  | Rôle | Droits |
  |---|---|
  | Chef | Tout : modifier la guilde, nommer ou retirer des officiers, transmettre le rôle de chef, supprimer des messages, dissoudre la guilde |
  | Officier | Accepter ou refuser les demandes, expulser des membres (pas les officiers ni le chef) |
  | Membre | Discuter, quitter la guilde |
- **Entrée** : guilde ouverte (entrée directe) ou sur demande (validation par un officier ou le chef).
- Une seule guilde par joueur ; délai de 24 h après un départ ou une expulsion avant de créer une guilde ou d’en rejoindre une autre. Le délai est vérifié aussi à l’acceptation d’une demande.
- Le chef ne peut pas partir sans transmettre son rôle, sauf s'il est seul (la guilde est alors dissoute).
- **Classements des guildes** (deux onglets dans `/leaderboard`) :
  - **Collection** : somme des scores Collection des membres.
  - **Duels de la semaine** : nombre de victoires en duel des membres actuels depuis lundi 0 h (fuseau Europe/Paris).

Les demandes en attente sont annulées lorsque le joueur rejoint une guilde. Une demande refusée peut être renvoyée ; une demande peut être annulée par son auteur. La dissolution libère tous les membres avec le même délai de 24 h, sans remboursement. Les opérations d’adhésion, de rôles et de paiement sont transactionnelles, avec verrou sur la guilde et le joueur, pour respecter les limites même en concurrence.

### 4. Messagerie
- **Widget de chat** *(2026-11-04)* : bouton en bas à droite de chaque page (hors combat plein écran), qui ouvre un panneau avec trois onglets **Guilde**, **Général**, **Privé**. Un pastille de non-lus par onglet ; panneau repliable, l'onglet et l'état ouvert/fermé sont mémorisés par navigateur. Les pages `/messages` et `/guilds/[tag]` ouvrent le même chat.
- **Messages privés** : uniquement entre amis.
- **Chat de guilde** : une conversation par guilde, ouverte à tous les membres.
- **Chat général** *(2026-11-04)* : une conversation unique pour tous les joueurs (`kind` GENERAL), en français, lecture des 50 derniers messages. Mêmes limites et même modération que le reste ; en plus, un joueur doit avoir atteint le niveau d'Arpenteur 3 pour y écrire (anti-spam), il peut masquer le général sans quitter les autres onglets, et le chef de guilde n'y a aucun droit particulier (la suppression de messages y est réservée à l'administration).
- **Polling** toutes les 3 secondes sur la conversation ouverte ; compteur de non-lus dans la cloche.
- Limites : 500 caractères par message, 1 message par seconde par joueur, messages conservés 90 jours.
- **Modération** : signalement d'un message, blocage, filtre de mots basique (liste configurable), suppression de messages par le chef dans le chat de guilde.

### 5. Modèle de données (ajouts)
- **User** : `lastSeenAt`, `showcase` (jusqu'à 6 `cardId`), `guildId`, `guildRole` (OWNER / OFFICER / MEMBER), `guildLeftAt`
- **Friendship** : `requesterId`, `addresseeId`, `status` (PENDING / ACCEPTED), `createdAt`
- **Block** : `blockerId`, `blockedId`, `createdAt`
- **Guild** : `id`, `name`, `tag`, `description`, `icon`, `joinMode` (OPEN / REQUEST), `ownerId`, `createdAt`
- **GuildJoinRequest** : `guildId`, `userId`, `status`, `createdAt`
- **ChatMessage** *(remplace Conversation et Message, 2026-11-04)* : `id`, `channel` (`general`, `guild:<id>` ou `dm:<idA>:<idB>` avec identifiants triés), `authorId`, `content`, `createdAt`, `deletedAt`
- **ChatRead** : `channel`, `userId`, `lastReadAt` (compteurs de non-lus ; aucune pastille tant que le général n'a jamais été ouvert)
- **ChatReport** : `id`, `reporterId`, `messageId`, `reason`, `status` (OPEN / DONE), `createdAt` (un signalement par joueur et par message)
- **CurrencyLedger.reason** : ajout de GUILD_CREATE

### 6. Pages
| Page | Contenu |
|---|---|
| `/u/[pseudo]` | Profil public, vitrine, album |
| `/friends` | Amis, demandes reçues et envoyées, joueurs bloqués |
| `/guilds` | Liste, recherche, création |
| `/guilds/[tag]` | Membres, chat, demandes, gestion |
| `/messages` | Conversations privées (même chat que le widget) |

### 7. Critères pour dire que l'étape 5 est finie
- [ ] Demandes d'ami, suppression et blocage fonctionnent ; un joueur bloqué ne peut plus rien envoyer.
- [ ] Création, entrée (ouverte ou sur demande), départ, expulsion, rôles et transmission du rôle de chef fonctionnent, avec les limites (20 membres, une guilde, délai de 24 h).
- [ ] Messages privés et chat de guilde fonctionnent, avec les limites de taille et de fréquence.
- [ ] Signalement, filtre de mots et suppression par le chef fonctionnent.
- [ ] Les classements de guildes s'affichent.

---

## Succès (venus de l'étape 4 §6)
Définis dans le code, vérifiés après chaque événement pertinent (tirage, duel terminé, vente aux enchères, échange accepté, cadeau de connexion réclamé, personnage ajouté à la collection). Chaque succès ne se débloque qu'une fois. **Le déblocage n'attribue rien** : le joueur récupère la récompense (Ryō et cristaux normaux) par l'action serveur `claimAchievement`, idempotente (une seule récupération, même en cas de double clic). Les Ryō sont inscrits au journal (`reason = ACHIEVEMENT`, `refId` = clé du succès). Un succès payé avant ce changement compte comme déjà récupéré. Les cristaux spéciaux ne sont plus offerts par les succès. Barème des cristaux : [economie.md](economie.md), § « Succès et quêtes périodiques ».

| Clé | Condition | Récompense (Ryō, sauf mention contraire) |
|---|---|---|
| `first_pack` | Ouvrir son premier paquet | 20 |
| `first_ssr` | Obtenir un premier SSR | 50 |
| `first_ur` | Obtenir un premier UR | 200 |
| `first_holo` | Obtenir une première Holo | 30 |
| `first_gold` | Obtenir une première Gold | 300 |
| `unique_100` / `500` / `1000` / `2500` | Posséder N personnages uniques | 100 / 300 / 800 / 2 000 |
| `series_complete_1` / `series_complete_5` / `series_complete_10` | Compléter 1 / 5 / 10 anime (tous les personnages présents dans la base ; seuls comptent les anime de l'album, soit au moins 5 personnages) | 150 / 500 / 1 500 *(provisoire, à équilibrer)* ; cristaux normaux selon le palier |
| `all_types` | Posséder au moins un personnage de chaque type | 50 |
| `login_streak_7` / `login_streak_30` | Réclamer les cadeaux de connexion 7 / 30 jours consécutifs | Ryō / cristaux, à équilibrer |
| `duel_win_1` / `10` / `50` | Gagner N duels | 30 / 150 / 500 |
| `first_auction_sale` | Première vente aux enchères | 30 |
| `first_trade` | Premier échange accepté | 30 |

### Succès et titres de puissance

La puissance de collection du profil (somme des puissances de base, doublons compris) débloque ces paliers. L’équipement et les synergies d’une squad ne comptent pas ici. Chaque succès et titre est acquis définitivement ; la récompense se récupère une fois (action `claimAchievement`). Une vente ne retire rien. Les vérifications utilisent les événements de gain existants et la protection transactionnelle contre les doublons.

| Puissance | Titre | Ryō |
|---|---|---|
| 100 000 | Aura naissante | 100 |
| 500 000 | Force montante | 250 |
| 1 000 000 | Puissance déchaînée | 500 |
| 5 000 000 | Briseur de limites | 1 000 |
| 10 000 000 | Colosse | 2 000 |
| 50 000 000 | Souverain de puissance | 5 000 |
| 100 000 000 | Force de la nature | 10 000 |

Les titres sont affichés dans Succès et équipables depuis le profil. Après déploiement ou recalcul de puissance, lancer `npx tsx scripts/sync-power-achievements.ts` pour débloquer les succès déjà atteints aux comptes existants. Le script réutilise la vérification normale des succès ; il ne verse aucune récompense, qui se récupère ensuite.
