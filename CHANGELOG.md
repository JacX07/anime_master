# Notes de mise à jour

Une section par version, la plus récente en haut. Chaque version correspond à un tag Git (`v0.2.0`…) posé sur `main`. Les migrations de base de données à appliquer avant la publication sont listées dans chaque section.

## À venir — v0.4.0

La mise à jour v0.4.0 prépare une nouvelle interface PC et mobile, un combat plus lisible et des compétences propres à davantage de personnages. Ces notes présentent les changements préparés pour cette mise à jour ; elles ne constituent pas une annonce de déploiement. Aucune date de sortie n’est annoncée.

### Les nouveautés à retenir

- **Un nouvel accueil Violet nuit**, avec un personnage de ta collection mis en avant, une reprise de l’histoire et des accès rapides aux activités.
- **Cinq onglets sur mobile** : Accueil, Collection, Jouer au centre, Invocation et Menu. Le Marché et les fonctions secondaires restent accessibles depuis le Menu ; le chat dispose de son propre accès.
- **Des sorts en éventail**, une fiche détaillée qui reste ouverte après un appui long et une interface de combat dégagée.
- **De nouveaux kits et passifs** pour Madara, Netero, Anti-Spirale, Meruem, Saitama, Dio, Yuuta, Johan, Griffith et les quatre empereurs, ainsi que des ajustements pour Aizen, Toji, Momo et Sukuna.

### Accueil, navigation et écrans de gestion

- **Identité du site** : les onglets du navigateur portent le nom Anima Clash et reprennent le blason AC du logo comme icône.
- **Accueil PC** : nouvelle composition autour du personnage choisi, illustration intégrée au décor et palette Violet nuit. Tu peux changer de personnage, le rechercher dans ta collection et l’admirer ; le choix est mémorisé.
- **Profil et monnaies** : accès au profil depuis le pseudo et explications sur les sources de Ryō et de cristaux.
- **Navigation PC** : barre supérieure affinée et accès aux modes de jeu organisés côte à côte, en PvM et PvP. Les Duels quiz quittent le hub Jouer.
- **Navigation mobile** : barre inférieure à cinq onglets avec libellés visibles et Jouer au centre. Les combats conservent leur écran immersif, sans navigation générale devant le plateau.
- **Collection mobile** : trois colonnes de cartes, filtres regroupés et présentation plus compacte pour parcourir la collection.
- **Inventaire** : cases d’objets teintées selon leur rareté, avec un dégradé plus marqué en haut et plus doux en bas. Les équipements conservent leur couleur de rareté.
- **Illustrations d’équipement** : visuels dédiés aux quatre pièces des sets Fairy Tail, Bleach, Attaque des Titans et Demon Slayer.
- **Carte de l’histoire** : jalons et étoiles allégés ; suppression des rectangles et des libellés « Combat N » qui se chevauchaient.

### Recharges et ultimes

- **Secondaire et tertiaire** : se rechargent en 3 tours (avant 5 et 7) ; l'éveil retire toujours un tour.
- **Ultimes** : plus de limite d'une fois par combat (Griffith, Madara, Anti-Spirale) ; chaque ultime se relance dès que sa jauge est pleine.

### Kits revus

- **Gojo** : Extension du territoire étourdit les quatre ennemis.
- **Cid Kagenou** : I am Atomic frappe tous les ennemis (×2,2 ATK, traverse les boucliers).
- **Levi** : l'ultime ajoute 20 % des PV max de la cible et +50 points de taux de critique.
- **Shigeo** : ???% — Explosion frappe tous les ennemis.
- **Maomao** : nouveau passif, immunisée contre le poison, la brûlure et le saignement.
- **Yuuta et Madara** : quand un ennemi lance un sort, une fenêtre propose de l'apprendre (Yuuta à 80 %, Madara à 100 % sous Susanoo), même pendant le tour adverse ; il remplace la copie précédente.
- **Chrollo** : Skill Hunter remplit un livre de deux pages avec les sorts ennemis ; livre plein, choisis la page à remplacer ou garde-le.
- **Sukuna** : le Sanctuaire malveillant pose une entaille (8 % des PV max par tour, 2 tours) qui bloque les soins.
- **Netero** : Hyakushiki Kannon dure 4 tours et Netero rejoue aussitôt ; une paume à chaque action.
- **Gilgamesh** : Ea désarme les porteurs d'épée pendant un tour (sans sort sans épée, ils passent leur tour), puis frappe tous les ennemis à ×2,1 ATK, +25 % par ennemi désarmé.
- **Saitama** : plus d'attaque de base, seulement son coup de poing, prêt dès le premier tour.
- **Madara** : Katon (×2,1) et Kyūbi (×3,3) brûlent au lieu d'empoisonner ; la Copie du Susanoo frappe à 100 %.

### Butins et taux affichés

- **Défi des empereurs** : chaque carte indique la clé, les quantités de ressource légendaire par difficulté (avec leur chance) et les cœurs de brèche gagnés à chaque combat, avec leurs images.
- **Expéditions** : nouveau panneau « Ce que contiennent les coffres » : chances de coffre par niveau de brèche, puis contenu et pourcentage de chaque objet pour les coffres Bronze, Argent, Or et Légendaire (gros lot compris).

### Changements de rareté

- **Yhwach passe en UR** : statistiques recalculées pour sa nouvelle rareté. Les exemplaires déjà possédés suivent ce changement ; l’historique garde la rareté du tirage d’origine.
- **Récapitulatif des reclassements SSR** amorcés en v0.3.0 : Killua, Luffy, Mikasa, Zoro, Ken Kaneki, Itachi, Thorfinn, Yuuji, Kakashi, Reigen, Emilia, L, Kurapika, Kurisu Makise, Edward, Mai, Yor, Naruto, Denji, Bakugou, Power, Tanjirou, Shouto, Megumi, Gintoki, Joseph, Ichigo, Sakura Matou et Megumin.
- **Récapitulatif des promotions UR** amorcées en v0.3.0 : Saitama, Sukuna, Yuuta, Meruem, Dio, Johan, Toji, Cid Kagenou, Taiga, Chrollo, Griffith, Anti-Spirale, Onizuka, All Might, Gilgamesh, Aizen, Madara et Netero.

### Combat : commandes et lecture des sorts

- **Un seul bouton Combattre** remplace les choix de lancement Auto et Manuel. Le dernier réglage est mémorisé ; tu peux changer de mode pendant le combat. Les boutons de rejeu des donjons sont réunis en un seul bouton Rejouer.
- **Commandes en haut** : Auto, vitesse, informations et pause libèrent le bas de l’écran pour les sorts. Auto et vitesse sont entourés pour mieux se repérer.
- **Menu pause** : reprise du combat, effets de sorts, sons, musique et abandon regroupés au même endroit. Le bouton Skip est désactivé.
- **Sorts en éventail toujours visibles** : plus de bouton de repliement. Chaque carte affiche un résumé court de sa cible ; les descriptions longues ne saturent plus la main.
- **Inspection par maintien** : maintiens le doigt sur téléphone ou le clic gauche sur PC pour ouvrir les détails au-dessus du sort. La carte inspectée passe au premier plan ; la fiche reste ouverte après relâchement. Un toucher extérieur ou Échap permet de la fermer.
- **Survol PC** : la carte de sort se relève sans être sélectionnée ni lancée. Un appui long sert à lire ; un clic bref sert à choisir.
- **Confirmation sur le plateau** : aucun sort n’est sélectionné par défaut. Après le choix d’un sort, les cibles autorisées sont mises en évidence ; touche une cible pour confirmer, y compris pour les buffs personnels ou d’équipe.
- **Buffs et débuffs** : les noms des effets sont mis en vert dans la description, sans colorer leurs valeurs. Le bouton d’information permet de consulter les effets actifs de chaque personnage.
- **Plateau** : deux rangées sur téléphone, diagonales avec perspective sur PC, suppression du VS central et des panneaux opaques qui recouvraient les sorts. Les sorts adverses ne sont plus affichés pendant leur tour.
- **Animations** : la carte du sort lancé se désagrège vers le personnage ; l’ultime dispose d’un portrait et d’une jauge dédiée. La citadelle sert de décor commun aux combats, y compris Dragon Ball.
- **Sortie d’un combat PvE** : quitter demande confirmation et abandonne le combat ; cela ne le termine plus automatiquement. Changer simplement d’onglet ne saute pas au résultat. L’abandon ne donne ni victoire ni butin, et l’énergie est rendue.

### Madara Uchiha — Rinnegan et Susanoo parfait

- **Cellules d’Hashirama** : récupère 8 % de ses PV max à chacune de ses actions, sous réserve des effets anti-soin.
- **Rinnegan** : le premier lancer invoque deux clones, une seule fois par combat. Tant qu’il en reste, un coup ciblé a deux chances sur trois de toucher un clone ; un clone touché disparaît. Les attaques de zone touchent toujours Madara.
- **Pression gravitationnelle** : les lancers suivants de Rinnegan infligent 0,6× ATK à tous les ennemis et réduisent leur vitesse de 30 % pendant deux actions. Cette première version enchaîne automatiquement clones puis pression ; elle ne propose pas encore de choix entre les deux.
- **Katon : boule de feu suprême** : 0,7× ATK en zone et brûlure de 5 % des PV max pendant deux actions.
- **Mangekyō Sharingan éternel** : Susanoo parfait pendant deux tours personnels, une fois par combat ; ATK +50 % et immunité à l’étourdissement, au sommeil, à la peur et au sceau.
- **Sorts du Susanoo** : Copie reprend à 80 % de puissance le dernier secondaire ou tertiaire ennemi compatible ; Kyūbi frappe tous les ennemis à 1,1× ATK et applique une brûlure de 6 % pendant deux actions.

### Isaac Netero — La progression des paumes

- **Paumes** : frappe de base à 1,2× ATK, renforcée à chaque utilisation : 100 %, 125 %, 150 %, puis Paume zéro à 200 % de cette puissance. Après Paume zéro, la progression recommence.
- **Recharge des Paumes** : une action, une paume peut partir à chaque tour, y compris sous Kannon.
- **Projection d’aura** : l’équipe ignore 30 % de la DEF et gagne 50 points de dégâts critiques pendant deux actions. L’ignore-DEF ne se cumule pas avec lui-même.
- **Hyakushiki Kannon** : frappe immédiate à 1× ATK ; pendant deux tours personnels, les dégâts des paumes sont répétés. Les buffs, la jauge et la progression des paumes ne sont pas doublés.

### Anti-Spirale — Une présence hors d’atteinte

- **Dimension** : intouchable par les dégâts, zones et contrôles pendant tout le combat. En contrepartie, il ne reçoit aucun buff, soin ou bouclier, même de lui-même. Son équipe perd dès que tous ses alliés sont morts.
- **Mugann** : 1,2× ATK sur un ennemi ; l’allié le plus bas en PV reçoit un bouclier égal à 25 % des dégâts infligés.
- **Effondrement spiral** : étourdit les ennemis pendant une action et réduit leur DEF de 25 % pendant deux actions. Les boss résistent à l’étourdissement.
- **Infinity Big Bang Storm** : 3× ATK sur tous les ennemis, une seule fois par combat.

### Meruem, Saitama, Dio et Yuuta

- **Meruem — Absorption d’aura** : commence avec seulement son attaque de base. À la première mort d’un ennemi, il absorbe un de ses sorts pour tout le combat : l’ultime en priorité, sinon le tertiaire, sinon le secondaire. Une seule absorption, automatique et définitive.
- **Saitama — Coup de poing sérieux** : un seul sort met un ennemi ordinaire K.O. ; contre un boss, il retire 30 % de ses PV max. Saitama quitte ensuite le combat sans compter comme K.O. et sans déclencher d’effet de mort. Il ne joue plus et n’est plus ciblable.
- **Dio — Za Warudo** : son ultime étourdit tous les ennemis pendant un tour. Les boss résistent à ce contrôle.
- **Yuuta — Copie : Rika** : reprend à 80 % de puissance le dernier secondaire ou tertiaire compatible lancé par un allié ou un ennemi. Le coup de Saitama ne peut pas être copié ; sans modèle, Yuuta effectue une frappe de remplacement.

### Johan et Griffith

- **Johan — Lecture des failles humaines** : applique la peur aux ennemis pendant deux tours ; chaque tentative de sort a une chance sur deux de faire perdre le tour.
- **Johan — Manipulation** : pendant deux tours, les buffs du personnage manipulé vont à ses ennemis et ses malus à ses alliés.
- **Johan — Élimination ciblée** : la cible subit 25 % de dégâts supplémentaires pendant trois tours.
- **Griffith — Troupe du faucon** : placé en première position de la squad, donne +15 % d’ATK à toute l’équipe.
- **Griffith — Charge du mercenaire** : frappe avec perforation de DEF et applique du saignement.
- **Griffith — L’Éclipse** : une seule fois par combat, sacrifie ses alliés et déclenche leurs effets de mort. Griffith récupère leurs PV restants, gagne +50 % d’ATK et ses attaques touchent tous les ennemis jusqu’à la fin du combat. Réduit aussi la DEF adverse de 30 % pendant trois tours.

### Les quatre empereurs : compétences des cartes jouables

- **Shanks** : Divine Departure pour percer la DEF d’une cible ; Voix de l’empereur pour renforcer l’ATK et le critique de l’équipe ; Haki des rois pour frapper en zone et endormir les adversaires moins puissants.
- **Big Mom** : Zeus : Nuée orageuse frappe en zone ; Prométhée : Soleil de feu ajoute des dégâts sur la durée ; Soul Pocus frappe l’équipe adverse et réduit son ATK.
- **Kaido** : Raimei Hakke pour une frappe ciblée ; Souffle du dragon pour les dégâts de zone et sur la durée ; Boro Breath pour une attaque ultime de zone.
- **Barbe Blanche** : Gura Gura no Mi frappe en zone et affaiblit la DEF ; Haki du roi des mers protège l’équipe ; Séisme frappe en zone et étourdit une cible.
- Ces compétences concernent les cartes de ta collection ; les rencontres du Défi des empereurs conservent leurs mécaniques de boss propres.

### Autres passifs et ajustements

- **Bonus de compétence magique** : toutes les cartes de type Magie en bénéficient sur leur secondaire, tertiaire, ultime et compétence d’affinité. Les attaques de base et les compétences explicitement physiques restent exclues. Les compétences explicitement magiques des autres types conservent leur bonus.

- **Aizen — Kyoka Suigetsu** : une attaque ennemie sur deux qui le vise est redirigée vers un allié de l’attaquant, s’il en possède un.
- **Toji — Lance inversée du ciel** : annule les dégâts des sorts magiques et les dégâts sur la durée qu’ils appliquent. La nature du sort lancé fait foi, y compris après copie ou absorption : une attaque de base ou une compétence physique le touche, même si son lanceur est de type Magie ou vient de Jujutsu Kaisen. Ses propres techniques d’armes sont classées physiques.
- **Momo Ayase — Pouvoir de Momo** : immunisée contre poison, brûlure et saignement.
- **Sukuna — Sanctuaire malveillant** : ajoute des dégâts sur la durée de 5 % des PV max pendant trois actions à tous les ennemis.
- **Passifs visibles** : consultation dans les fiches d’équipe et de combat ; le builder affiche aussi le passif du personnage et permet d’ouvrir sa fiche en cliquant sur son portrait.
- **Compétences évolutives** : les sorts affichés suivent désormais les transformations de Madara et l’absorption de Meruem pendant le combat.

### Correctifs et confort

- **Retour à la collection** : la recherche et les filtres sont conservés après la consultation d’une fiche de personnage.
- **Collections au clavier** : le panneau mobile fermé ne capte plus le focus ; Échap le ferme et rend le focus à son bouton.
- **Squads** : les autres exemplaires d’un personnage déjà placé ne sont plus proposés à un autre poste.
- **Effets de combat** : les nouveaux statuts de Madara, Netero, Johan et Griffith disposent de leurs effets visuels d’application.
- **Résultat du combat** : le texte après une défaite désigne correctement ton équipe mise à terre.
- Répartition de l’espace de combat revue sur les petits écrans ; détails de sorts, commandes et résultats ne doivent plus se recouvrir.
- Récompenses et écrans de victoire conservés au premier plan, sans en-tête ou pied de page par-dessus.
- Commandes tactiles, zones de confirmation et descriptions longues rendues plus faciles à utiliser.
- **Actualités et historique** : les notes de la prochaine mise à jour sont consultables sous « À venir ». Les versions déjà publiées restent disponibles ; l’annonce de connexion continue de concerner les versions publiées.

### Migrations de base de données

`20261113020000_changelog_read` : mémorisation de la dernière version publiée lue par compte. À appliquer avant publication si elle manque. Les notes « À venir » n’acquittent aucune version publiée et ne créent aucun tag ni déploiement.

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
- **Personnages reclassés en SSR** : Killua, Luffy, Mikasa, Zoro, Ken Kaneki, Itachi, Thorfinn, Yuuji, Kakashi, Reigen, Emilia, L, Kurapika, Kurisu Makise, Edward, Mai, Yor, Naruto, Denji, Bakugou, Power, Tanjirou, Shouto, Megumi, Gintoki, Joseph, Ichigo, Sakura Matou et Megumin.
- **Personnages promus en UR** : Saitama, Sukuna, Yuuta, Meruem, Dio, Johan, Toji, Cid Kagenou, Taiga, Chrollo, Griffith, Anti-Spirale, Onizuka, All Might, Gilgamesh, Aizen, Madara et Netero.
- **Statistiques après reclassement** : recalées au milieu de la nouvelle rareté pour éviter que la popularité seule place les anciens UR au sommet des SSR et les nouveaux UR au bas de leur catégorie. Les cartes déjà possédées suivent ces nouvelles raretés ; leur rareté au moment du tirage reste conservée dans l’historique.

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
