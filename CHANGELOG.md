# Notes de mise à jour

Une section par version, la plus récente en haut. Chaque version correspond à un tag Git (`v0.2.0`…) posé sur `main`. Les migrations de base de données à appliquer avant la publication sont listées dans chaque section.

## v0.2.2 — Joueurs en ligne, tutoriel plus complet et pages de connexion

Une migration de données (sans suppression) est à appliquer avant la publication. Si la v0.2.0 n'a pas encore été publiée, ses migrations restent à appliquer aussi.

### Nouveautés
- **Joueurs en ligne** : un onglet « En ligne » dans le chat montre les joueurs vus depuis moins de 5 minutes, tes amis et ta guilde d'abord. Les joueurs bloqués n'y figurent pas. « Message » ouvre la conversation privée avec un ami, « Profil » ouvre la fiche des autres.
- **Étoiles du mode histoire** : le total est affiché en grand, avec une barre de progression marquée aux paliers de récompense (12, 24, 36 et 45) et le prochain objectif. Chaque combat terminé montre ses trois étoiles, plus grandes.
- **Tutoriel plus explicatif** : 28 étapes avec, pour chaque élément, une courte liste « à quoi ça sert ». Nouvelles étapes : cristaux, Ryō, bannières et taux, lot ×5 ou ×10, onglet Social, bouton JOUER, cloche, chat. Nouvelle phase « Le combat » : éléments et combos, dégâts physiques et magiques, saignement et altérations.
- **Guide du jeu** : 22 étapes, avec les ressources, les étoiles de l'histoire, les éléments et combos, physique et magique, saignement, le pilotage d'un combat et le chat.
- **Fenêtres** : un clic en dehors d'une fenêtre la ferme (squads, choix d'un compagnon, fiche personnage, fiche d'une carte, galerie).
- **Connexion et inscription** : pages remises dans le style du site.

### Préparé, pas encore actif
- **Mot de passe oublié et confirmation d'e-mail à l'inscription** : le code est en place (envoi par Resend, lien de réinitialisation valable 1 heure, lien de confirmation valable 24 heures, 1 e-mail par minute et par adresse). Il ne s'active que lorsque `RESEND_API_KEY` et `EMAIL_FROM` sont définies. Sans elles, l'inscription ouvre directement la session et le lien « Mot de passe oublié ? » n'apparaît pas.

### Migrations de base de données
`verify_existing_emails` : marque les comptes existants comme confirmés pour que la confirmation d'e-mail, une fois activée, ne bloque personne. Aucune donnée supprimée. Celles de la v0.2.0 restent à appliquer si elle n'est pas encore en production.

### À savoir
- Pour activer les e-mails : domaine vérifié dans Resend, puis `RESEND_API_KEY` et `EMAIL_FROM` dans Vercel (Production) et Redeploy (voir `docs/deploiement.md`).
- Les cadres de cartes ne changent pas dans cette version.

## v0.2.1 — Animations d'invocation, combat et corrections

Mise à jour sans nouvelle migration de base de données. Si la v0.2.0 n'a pas encore été publiée, ses migrations sont toujours à appliquer (voir plus bas).

### Nouveautés
- **Ouverture de booster** : nouvelle invocation « graduations » (astrolabe, cadran gradué et aiguille, dans le style du dos de carte) et nouvel éclat plein écran pour les SSR et UR (« constellation encadrée »), avec leurs sons. Un clic n'importe où ou Échap passe l'animation.
- **Retournement des cartes** : nouveau son de parchemin lourd, identique pour toutes les raretés.
- **Combat** : barre de contrôle centrale (Lecture/Pause, Fin, vitesse ×1 ×2 ×4, effets et musique), sans bouton « recommencer » ni barre de progression ; en combat réel, interrupteur Auto/Manuel et « Abandonner » dessous.
- **Menu mobile** : tiroir de navigation, profil au toucher, menu Social.
- **Sons** : curseur de volume général dans les Paramètres ; les sons du booster respectent « Effets ».
- **Inventaire** : les cases d'artefact prennent la couleur de leur rareté (fond teinté, losange, reflet sur SSR et UR), y compris dans la fiche personnage.
- **Profil** : boosters ouverts, étoiles de l'histoire et étage de la Tour.

### Équilibrage et corrections
- Taux de SSR abaissé de 2,5 % à 2 % (la différence va aux cartes N).
- La règle de la 10ᵉ invocation boostée est retirée (trop de SSR) : plus de compteur ni d'affichage.
- « Tout révéler » ne rejoue plus l'éclat d'une SSR ou UR déjà retournée.
- Une carte SSR ou UR ne glisse plus sous sa case à l'ouverture.
- Éveil : la fiche se met à jour après un éveil et un double clic ne paie plus qu'une étoile.
- Ambiance de couleur par mode et ornements d'horlogerie brisée.
- Menu mobile : le tiroir s'ouvre de nouveau sur tout l'écran (il se réduisait à une bande de quelques pixels sur téléphone).

### Technique et exploitation
- **Quotas gratuits** (Vercel et Supabase, alertes du 9 novembre) :
  - les actions des joueurs rafraîchissent l'écran avec `refresh()` au lieu de `revalidatePath`, ce qui évite des centaines de milliers d'écritures ISR ;
  - la puissance, les succès et les modes de combat de l'Arpenteur sont calculés par la base (agrégats SQL) au lieu de charger les collections entières ;
  - le catalogue des anime est mis en cache côté serveur ;
  - le chat interroge le serveur toutes les 5 s quand il est ouvert et toutes les 60 s quand il est fermé.

### Migrations de base de données
Aucune nouvelle. Celles de la v0.2.0 restent à appliquer si elle n'est pas encore en production.

### À savoir
- Les cadres de cartes ne changent pas dans cette version.

## v0.2.0 — Social, retours de la bêta et refonte du combat

Gros lot de retours de la bêta. Les comptes existants sont conservés.

### Nouveautés
- **Booster de bienvenue** : un booster ×10 offert, une seule fois, avec un SSR ou un UR garanti (n'importe quel anime), mis en avant à l'ouverture.
- **10ᵉ invocation boostée** : une carte sur 10 est boostée, en ×5 comme en ×10, avec un compteur qui suit ta progression.
- **Tutoriel en infobulles** : trois actions guidées, présentation des modes et des onglets. La page « Guide du jeu » (16 étapes) est dans le menu Quêtes.
- **Social** :
  - amis (demandes, blocage, statut en ligne) ;
  - guildes (création pour 1 000 Ryō, jusqu'à 20 membres, rôles chef, officier et membre, entrée ouverte ou sur demande) ;
  - chat en bas à droite de chaque page, avec trois onglets : guilde, général, privé. Limites de taille et de fréquence, filtre de mots, signalement, suppression par le chef de guilde.
- **Classements** : nouveaux onglets Puissance, Histoire (étoiles) et Tour ; podium 1-2-3 ; nombre de personnages par rareté pour chaque joueur ; barre « Ton rang » fixée en bas de l'écran quand tu es hors du top 100 ; classements de guildes (collection et duels de la semaine).
- **Donjons par univers** : chaque donjon s'ouvre quand tu gagnes le combat 10 de l'histoire du même univers.

### Économie et progression
- **Cristaux spéciaux supprimés** : ils sont convertis en cristaux normaux, et les bannières d'événement coûtent des cristaux normaux.
- **Succès** : cristaux normaux selon la difficulté (5 · 10 · 25 · 50), récupération manuelle avec un bouton « Récupérer » bien visible.
- **Quêtes** : uniquement quotidiennes et hebdomadaires, avec « Tout récupérer ».
- **Verrous de niveau** : Raids niveau 15, Tour universelle niveau 20, Expéditions niveau 25 ; l'Arène PvP et l'Arène Live sont marquées « pas encore disponibles ».
- **Histoire** : carte ascendante par acte, récompenses et butin sous la carte, écran de préparation « VS » avec la puissance des ennemis, composition automatique et équipe mémorisée.

### Combat
- Écran de combat aux couleurs du site (pierre sombre, or, biseaux), sans historique des tours.
- Nouvel écran de résultat : ton équipe, la défense adverse, statistiques et étoiles (victoire, aucun allié à terre, 8 tours ou moins).
- Musique dark fantasy à 152 BPM, effets sonores sombres et jingles courts ; sons de mort et de projectiles complétés.
- Sorts compacts sur mobile.

### Interface
- En-tête : Ryō, cristaux, barre d'XP et accès aux paramètres ; bouton JOUER centré ; menus verrouillés grisés.
- Boutons d'action plus visibles (fond or plus marqué, filet inférieur) ; sélecteur d'invocation ×5 gris / ×10 jaune ; emplacements de squad cliquables.
- Avatars et emblèmes de guilde en « anneau gravé ».
- Album : « Tous » affiche tous les personnages, possédés ou non ; filtres plus lisibles.
- Inventaire en cases de taille égale ; collection visible sous les squads ; fiche personnage plus compacte sur téléphone.
- Nouveau logo Anima Clash et dos de carte Anima Clash.

### Technique et exploitation
- Inscription sur invitation (code `INVITE_CODE` vérifié côté serveur).
- Administration : rôles, joueurs, actions (Ryō, cristaux, cartes, bannissement), journal d'événements et statistiques.
- Sécurité : tables du jeu fermées à l'API publique (RLS), dépendances vulnérables mises à jour.
- Performances : connexions à la base réglées pour la production, session mise en cache 5 minutes, délais des actions longues allongés.
- Sauvegardes quotidiennes de la base de production vers un stockage externe chiffré.
- Intégration continue : nouveaux contrôles pour le social, les classements et les donjons par univers.

### Migrations de base de données (à appliquer avant la publication)
`welcome_booster`, `remove_special_crystals` (**destructive** : convertit puis supprime les cristaux spéciaux), `boost_counter`, `friends_blocks`, `guilds`, `chat`, `tutorial_step`, `rls_social`. `npm run db:deploy` n'applique que celles qui manquent à la base visée, y compris les migrations d'administration et de sécurité de la veille (`private_game_tables`, `auth_throttle`, `admin_roles`, `game_events`, `admin_players`) si la prod ne les a pas encore.

### À savoir
- Le chat général demande le niveau d'Arpenteur 3 pour écrire ; la liste des mots filtrés est courte et sera complétée.
- Les signalements de messages sont enregistrés mais n'ont pas encore d'écran de traitement dans l'administration.
- Les cadres de cartes ne changent pas dans cette version.

## v0.1.0 — Première bêta

Première version ouverte à quelques amis. Les comptes démarrent de zéro.

### Collection
- Plus de 4 700 personnages tirés d'AniList, répartis par rareté (jusqu'à SSR et UR), avec leurs statistiques et leur type.
- Ouverture de cristaux en 3D (1 carte par cristal), lots ×5 et ×10, finitions Holo et Gold, carte garantie et pitié sur les raretés les plus hautes.
- Bannières spéciales et tirages de bienvenue.
- Album : filtres par rareté, type et possession, recherche, progression globale et par rareté.
- Fiche personnage avec description, exemplaires possédés et séries.

### Combat et aventure
- Équipe de personnages, combats animés avec bilan des dégâts en fin de combat.
- Synergies de franchise, sorts personnalisés pour les SSR et UR, effets visuels et sonores par type.
- Mode Histoire en univers progressifs, donjons, raids et expéditions (le jeu continue de rapporter hors ligne).
- Artefacts, inventaire, forge et éveil pour renforcer les personnages.

### Économie et social
- Monnaie Ryō, vente rapide d'exemplaires, achat de cristaux.
- Marché aux enchères, échanges entre joueurs, liste de souhaits et notifications.
- Succès, quêtes, duels et classement.

### Interface
- Nouvelle identité visuelle sombre et dorée, adaptée aux téléphones.

### À savoir
- Bêta : des bugs sont possibles. Les données des joueurs seront remises à zéro à la sortie officielle, avec une sauvegarde préalable.
