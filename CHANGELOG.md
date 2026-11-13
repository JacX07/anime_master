# Notes de mise à jour

Une section par version, la plus récente en haut. Chaque version correspond à un tag Git (`v0.2.0`…) posé sur `main`. Les migrations de base de données à appliquer avant la publication sont listées dans chaque section.

## À venir

### Nouveautés
- **Fond de combat commun** : la citadelle et son arène habillent tous les combats, y compris Dragon Ball.
- **Combat mobile** : commandes de vitesse toujours accessibles, panneau des sorts défilant et résultat au premier plan ; l'en-tête et le pied de page ne recouvrent plus le titre de victoire.
- **Interface mobile compacte** : énergie visible sans ouvrir le profil, compte à rebours de recharge, collection sur trois colonnes, inventaire en cases carrées sur quatre colonnes et filtres regroupés. Les logos quittent la barre du haut sur PC et mobile.
- **Illustrations** : quatre pièces dédiées pour chacun des sets Fairy Tail et Bleach.
- **Changelog dans le jeu** : un onglet présente l'historique de toutes les versions publiées. À la connexion, une fenêtre présente la dernière version non lue ; sa fermeture est mémorisée sur le compte, y compris sur les autres appareils. L'annonce attend la fin du tutoriel et ne recouvre pas un combat.

### Migration de base de données
`20261113020000_changelog_read` : dernière version lue par compte. À appliquer avant de publier ce code. Cette section reste hors des annonces en jeu jusqu'à son intégration dans une nouvelle version ; le tag v0.3.0 existant est conservé.

## v0.3.0 — Arène live, Défi des empereurs et progression repensée

Mise à jour du 13 novembre 2026. Les comptes et les récompenses déjà réclamées sont conservés. Sept nouvelles migrations sont à appliquer avant la publication.

### Nouveaux défis

- **Arène live** : affronte un autre joueur en combat manuel 4 contre 4, avec appariement par Elo et 20 secondes pour choisir une action. Sans adversaire après 30 secondes, une équipe fantôme prend le relais. Si tu ne joues pas à temps ou quittes la page, l'automatique joue pour toi ; seul un abandon volontaire donne un forfait. L'arène ne coûte pas d'énergie et récompense le classement, sans ressources d'éveil.
- **Défi des empereurs** : Shanks, Big Mom, Kaido et Barbe Blanche remplacent le boss de raid hebdomadaire. Chaque porte comporte deux vagues d'équipage puis l'empereur, en Normal, Difficile ou Cauchemar, avec un passage quotidien par empereur. Leurs mécaniques incluent sommeil, duel, dévoration, âmes et transformation en dragon.
- **Hardcore** : réunis les quatre clés d'empereur pour affronter les quatre boss ensemble. Le passage consomme les clés et rapporte des ressources légendaires et des cœurs de brèche.
- **Armes légendaires** : Griffon, Murakumogiri, Hassaikai et Napoléon, avec leurs effets propres. Elles peuvent équiper n'importe quelle carte éveillée à 5★. La forge rejoint l'Inventaire, avec un carrousel d'armes et les ressources possédées et requises.
- **Trois donjons et sets** : Attaque des Titans (Cuirasse du temps : DEF, PV, bouclier et protection à mi-vie), Demon Slayer (critique et ignore DEF) et Fairy Tail (dégâts élémentaires de feu, eau, air, terre et foudre).
- **Butin de donjon progressif** : les difficultés impaires donnent une pièce de la rareté du palier, puis une seconde de la rareté précédente à partir de la difficulté 3 ; les difficultés paires donnent une pièce et 50 % de chance d'une seconde de même rareté. Le barème va d'une pièce N en difficulté 1 à une UR et 50 % de chance d'une seconde UR en difficulté 10.

### Économie, équipements et équipes

- **Énergie** : réserve de 20, régénération d'un point toutes les 2 minutes. Un combat d'histoire ou de donjon, ainsi qu'un passage chez les empereurs, coûte un point, rendu en cas de défaite.
- **Ryō** : récompenses d'histoire augmentées au premier passage et petit gain à chaque rejeu ; coût d'amélioration des artefacts divisé par deux et affiché avant de payer.
- **Artefacts** : stat principale déterminée par l'emplacement, avec la même progression entre raretés ; les sous-stats distinguent les raretés. Les artefacts UR portent le nom « Mythique ». Les objets existants sont recalculés par migration.
- **Gestion de l'équipement** : aperçu des statistiques et de leur différence avant d'équiper ou d'améliorer, filtres par stat principale, sous-stat, rareté et set, affichage des objets non équipés, recyclage contre des Ryō et jusqu'à dix sauvegardes d'équipement.
- **Squads** : favoris, filtres par rareté, type et rôle, consultation des sorts pendant le choix et échange de places par bouton ou glisser-déposer. La préparation commune reprend les squads en histoire, Tour, donjons et raids, avec une composition mémorisée par mode.
- **Budget d'équipe** : plafond de 24 hors raids ; N coûte 1, R 2, SR 3, SSR 5 et UR 8.
- **Classement de puissance** : les artefacts et l'arme équipés comptent désormais dans le score.
- **Tour** : récompense de l'étage choisi et prochains paliers visibles avant de combattre.

### Éveil et histoire

- **Doublon facultatif** pour les éveils SSR et UR à 4★ et 5★ : les cœurs de brèche suffisent. Choisir de consommer un doublon divise leur coût par deux.
- **Bonus à chaque étoile** : +6 % ATK, DEF et PV par étoile ; à 2★, +25 de jauge ultime au départ ; à 3★, secondaire plus rapide ; à 4★, +10 points de critique et +20 points de dégâts critiques ; à 5★, tertiaire plus rapide, accès à l'arme et bouclier initial de 10 % des PV.
- **Éveil animé et sonore** après confirmation du succès, avec affichage stabilisé, notamment pour Gojo.
- **Histoire plus progressive** : puissance ennemie croissante entre les univers. Le suivant reste accessible après les quinze combats du précédent.
- **Étoiles d'histoire** : victoire, aucun allié à terre, puis aucun allié à terre en dix tours ou moins. Une victoire avec exactement deux personnages donne une quatrième étoile bonus indépendante. Les anciennes étoiles sont conservées ; les anciens scores de 3★ reçoivent aussi le bonus duo.
- **Récompense duo** : quinze étoiles bonus dans un univers donnent une fois quinze cristaux et 500 Ryō, séparément des paliers ordinaires.

### Combat et personnages

- **Combats hors de la page** : quitter un combat PvE ne l'abandonne plus ; l'automatique le termine côté serveur. Changer simplement d'onglet ne saute plus le combat et laisse sa lecture continuer.
- **Rejeu** : bouton pour répéter un combat d'histoire ou de donjon ; effets de sorts désactivables. La première victoire d'une salle de donjon reste à jouer avec ses effets.
- **Lecture plus claire** : ordre complet des alliés et ennemis, panneau des bonus et malus avec valeurs, durées, lanceur et statistiques actualisées ; multiplicateurs des sorts visibles et aide sur les dégâts physiques et magiques.
- **Équilibrage** : la plupart des silences de zone ne touchent plus qu'un ennemi ; soin sur soi plafonné à 35 % des PV max ; une seule provocation par personnage, plus courte quand elle accompagne d'autres effets ; réductions de dégâts des sorts divisées par deux et limitées à deux tours ; soins et boucliers d'équipe des ultimes plafonnés à 20 % des PV max.
- **Kits revus** : Levi ajoute des dégâts selon les PV max de la cible ; Killua enchaîne des frappes de plus en plus fortes ; Gojo commence intouchable ; Kakashi copie le dernier ultime ; Lelouch contrôle un ennemi ; Time Leap d'Okabe donne de la jauge et retire les malus ; Mob gagne des dégâts selon les coups reçus ; Frieren devient intouchable et traverse les boucliers ; Gon prépare une frappe qui ignore la DEF.
- **Catalogue** : raretés révisées pour une partie des personnages, statistiques adaptées à leur nouvelle rareté et ajout d'Antispiral.

### Interface et corrections

- **Profil** : photo choisie parmi ses personnages et vitrine recherchable dans toute la collection, y compris les basses raretés.
- **Collection et navigation** : liste des anime à gauche de la grille, titres plus compacts et barre du haut escamotable sur les grands écrans.
- **Ambiance** : nouvelles musiques d'accueil, combat, raid et PvP ; animations de navigation, cartes, forge et récompenses, avec respect des préférences de mouvement et de son.
- **Succès et tutoriel** : pastille rouge pour les récompenses à récupérer ; bouton du tutoriel pour rejoindre la page de l'étape.
- **Correctifs** : stock de cristaux actualisé après un gain, doublon d'éveil disponible même quand on en possède plusieurs, menus déroulants utilisables dans les fenêtres, synchronisation du bouton « Terminer » avec la dernière action confirmée. Atteindre la limite de tours en PvE ne donne plus une fausse victoire.
- **Outils et contrôles** : le builder conserve les nouveaux paramètres de sorts, les nouveaux statuts ont leurs effets visuels, le catalogue jetable et les assertions de la CI suivent les règles v0.3.0.

### Expéditions

- **Coffres Bronze, Argent, Or et Légendaire**, avec ouverture animée et butin varié : monnaies, matériaux, énergie, artefacts, cartes et invocations offertes. Le coffre Légendaire contient un gros lot garanti.
- **Résultats rééquilibrés** selon la brèche et la puissance de l'équipe ; un triomphe rapporte un coffre supplémentaire. Les coffres restent en stock jusqu'à leur ouverture et les invocations offertes s'utilisent à la place des cristaux.

### Migrations et mise en production

Appliquer `npm run db:deploy` sur la base de production **avant** de publier le code. La commande de publication ne migre pas la base.

- `20261110120000_energy` : énergie et régénération.
- `20261110130000_artifact_recycle` : journal du recyclage d'artefacts.
- `20261110140000_artifact_main_stats` : recalcul de la stat principale des artefacts existants ; sous-stats conservées.
- `20261110150000_favorites_gear_presets_avatar` : favoris, sauvegardes d'équipement et avatar.
- `20261110160000_story_duo_star` : étoile duo et reprise des anciens scores de 3★.
- `20261111100000_arena_live` : matchs et file d'attente d'arène.
- `20261113010000_rls_arena` : fermeture de la table d'arène à l'API publique.

Les migrations antérieures restent nécessaires si elles manquent à la base ciblée. Les ajouts de personnages et les changements de rareté relèvent du catalogue : `db:deploy` ne les synchronise pas.

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
