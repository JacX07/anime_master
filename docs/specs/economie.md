# Anime Masters — Économie

[← Index des specs](README.md)

## Étape 3 — Économie

### Objectif
Donner de la valeur aux cartes : revente des doublons, échanges entre joueurs, enchères.

### Décisions validées
- Monnaie : **Ryō** (両).
- **Aucun achat avec de l'argent réel** : la monnaie se gagne uniquement en jouant.
- Prix de vente rapide : N 1 / R 3 / SR 10 / SSR 40 / UR 200 ; Holo ×3, Gold ×10.
- Bonus quotidien : 50 Ryō. Paquet supplémentaire : 100 Ryō, 5 par jour maximum.
- Taxe de 5 % sur les ventes aux enchères (détruite).
- Anti-abus : compte de plus de 24 h et au moins 20 paquets ouverts pour échanger ou utiliser les enchères.

---

### 1. Monnaie
- Chaque mouvement de Ryō est enregistré dans `CurrencyLedger`. Le solde (`User.balance`) doit toujours être égal à la somme du journal ; les deux sont mis à jour dans la même transaction.
- Un solde ne peut jamais devenir négatif.

### 2. Sources et dépenses
> **Évolue** : l'achat de paquets devient l'achat de cristaux (20 Ryō, 25 par jour) : voir « Étape 4 bis ».

| ➕ Sources | ➖ Dépenses |
|---|---|
| Vente rapide d'une carte au système | Achat de paquet : 100 Ryō, 5 par jour maximum (remise à zéro à minuit, heure du serveur) |
| Bonus quotidien : 50 Ryō, réclamé une fois par jour | Taxe de 5 % sur chaque vente aux enchères |
| Vente aux enchères | Achat aux enchères |
| *(Étape 4 : duels, succès)* | |

Un paquet acheté s'ajoute au stock et peut dépasser la limite de 10 (la limite ne concerne que la recharge automatique).

**Vente rapide**
| Rareté | N | R | SR | SSR | UR |
|---|---|---|---|---|---|
| Ryō | 1 | 3 | 10 | 40 | 200 |

- Multiplicateur de finition : Normal ×1, Holo ×3, Gold ×10.
- Prix basé sur la rareté **actuelle** du personnage.
- Repère : un joueur régulier (~40 paquets par jour) qui vend tous ses doublons gagne environ 1 000 Ryō par jour.

**Protections**
- **Vente rapide d'une carte précise** : n'importe quel exemplaire non verrouillé (pas seulement les doublons), après un message d'avertissement (retrait définitif, irréversible ; avertissement renforcé s'il s'agit du seul exemplaire du personnage).
- **Cadenas** (`locked`) : une carte verrouillée ne peut être ni vendue, ni échangée, ni mise aux enchères.
- **Vente groupée des doublons** : filtre par rareté ; conserve toujours, pour chaque personnage, l'exemplaire de meilleure finition (à finition égale, le plus petit numéro d'exemplaire). N'inclut jamais les cartes verrouillées, aux enchères ou en échange.
- Confirmation avec le total en Ryō avant toute vente.

### 3. Échanges directs
- Offre d'un joueur à un autre : cartes et/ou Ryō de chaque côté.
- Statuts : PENDING → ACCEPTED / REFUSED / CANCELLED / EXPIRED / INVALID. Expiration au bout de 48 h.
- Les cartes ne sont pas bloquées pendant l'attente. À l'acceptation, tout est revérifié (propriétaire, carte non verrouillée et pas aux enchères, soldes suffisants) ; sinon l'offre passe en INVALID.
- Exécution dans une seule transaction (tout ou rien), avec une ligne de journal par mouvement de Ryō.
- Maximum 10 offres envoyées en attente par joueur.
- **Tag « À échanger »** (`forTrade`) : la fiche d'un personnage liste les joueurs qui le proposent à l'échange.

### 4. Enchères
- Paramètres : carte, prix de départ (≥ 1 Ryō), durée (1 h, 6 h, 24 h ou 72 h), prix d'achat immédiat facultatif (> prix de départ).
- La carte est bloquée (`inAuction`) pendant toute l'enchère.
- Offre minimale : max(prix de départ, offre actuelle × 1,05 arrondi au supérieur, offre actuelle + 1).
- **Réservation** : le montant de l'offre est retiré du solde (BID_HOLD) ; l'enchérisseur dépassé est remboursé immédiatement (BID_REFUND).
- **Anti-sniping** : une offre placée dans les 2 dernières minutes repousse la fin à « maintenant + 2 minutes ».
- **Achat immédiat** : termine l'enchère sur-le-champ et rembourse l'éventuel meilleur enchérisseur.
- Interdits : enchérir sur sa propre enchère ; annuler une enchère qui a déjà une offre.
- **Clôture** : la carte passe au gagnant, le vendeur reçoit le montant moins 5 % (arrondi à l'inférieur). Sans offre, la carte revient au vendeur.
- **Déclenchement de la clôture** : à chaque consultation d'une enchère ou du marché, et par une tâche qui tourne toutes les minutes. Clôture idempotente (une enchère ne se clôture qu'une fois, même si deux déclenchements arrivent ensemble).
- Maximum 10 enchères actives par vendeur.

### 5. Marché et liste de souhaits
- **Marché** : enchères en cours, filtres (rareté, type, série, finition, prix) et tri (fin la plus proche, prix, plus récentes).
- **Historique des prix** : sur la fiche d'un personnage, les dernières ventes aux enchères et le prix moyen, par finition.
- **Liste de souhaits** : personnages (avec ou sans finition précise). Notification quand l'un d'eux est mis aux enchères ou tagué « À échanger ».

### 6. Notifications
Dans le site uniquement (cloche, pas d'email) : offre dépassée, enchère gagnée, carte vendue, enchère terminée sans offre, échange reçu / accepté / refusé / invalide, carte souhaitée disponible.

### 7. Anti-abus
- Échanges et enchères réservés aux comptes de plus de 24 h ayant ouvert au moins 20 paquets.
- Tout est historisé (journal des Ryō, échanges, offres) pour permettre des enquêtes.
- À envisager si des abus apparaissent : plafond de Ryō par échange.

### 8. Modèle de données (ajouts)
- **User** : `balance`, `lastDailyBonusAt`, `packsBoughtToday`, `packsBoughtDate`
- **CurrencyLedger** : `id`, `userId`, `amount` (±), `reason` (QUICK_SELL, DAILY, PACK_BUY, BID_HOLD, BID_REFUND, AUCTION_SALE, AUCTION_FEE, TRADE_IN, TRADE_OUT), `refId`, `createdAt`
- **Card** : ajout de `locked`, `forTrade`, `inAuction`
- **Trade** : `id`, `fromId`, `toId`, `fromCurrency`, `toCurrency`, `status`, `createdAt`, `expiresAt`, `resolvedAt`
- **TradeItem** : `tradeId`, `cardId`, `side` (FROM / TO)
- **Auction** : `id`, `sellerId`, `cardId`, `startPrice`, `buyNowPrice`, `currentBid`, `currentBidderId`, `endsAt`, `status` (ACTIVE / SOLD / UNSOLD / CANCELLED), `createdAt`
- **Bid** : `id`, `auctionId`, `bidderId`, `amount`, `createdAt`
- **WishlistItem** : `userId`, `characterId`, `finish` (facultatif)
- **Notification** : `id`, `userId`, `type`, `payload` (JSON), `readAt`, `createdAt`

### 9. Pages
| Page | Contenu |
|---|---|
| `/market` | Enchères en cours, filtres |
| `/market/[id]` | Détail d'une enchère, offres, compte à rebours |
| `/trades` | Échanges reçus, envoyés, historique |
| `/trades/new?to=pseudo` | Composer une offre |
| `/wishlist` | Liste de souhaits |
| Album, fiche perso | Actions : vendre, verrouiller, « À échanger », mettre aux enchères ; solde et bonus quotidien dans l'en-tête |

### 10. Critères pour dire que l'étape 3 est finie
- [x] Le solde de chaque joueur est toujours égal à la somme de son journal, et n'est jamais négatif (`npm run check:economy`).
- [x] La vente rapide respecte les prix ; la vente groupée ne touche ni aux cartes verrouillées, ni aux cartes en échange ou aux enchères, ni au meilleur exemplaire de chaque personnage (cartes en échange / aux enchères : à vérifier quand ces fonctions existeront).
- [x] Un échange accepté transfère tout ou rien ; une offre devient invalide si un élément n'est plus disponible (`npm run check:trades`).
- [x] Impossible de gagner une enchère sans les Ryō ; l'enchérisseur dépassé est remboursé immédiatement.
- [x] L'anti-sniping prolonge l'enchère ; la clôture n'a lieu qu'une seule fois.
- [x] Les limites (5 paquets achetés par jour, 10 offres, 10 enchères, ancienneté du compte) sont respectées. *(paquets : fait, `npm run check:economy` ; 10 offres et ancienneté du compte : faits, `npm run check:trades` ; 10 enchères : fait, `npm run check:auctions`)*
