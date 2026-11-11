# Défi des empereurs et armes légendaires *(décidé en grande partie le 2026-11-11 ; reste des valeurs à valider)*

[← Index des specs](README.md) · [Raid](pvm.md) · [Combat](combat.md)

Mode de raid permanent : les **quatre empereurs** (Shanks, Big Mom, Kaido, Barbe Blanche) sont tous disponibles en même temps, sans rotation hebdomadaire. Chacun a **deux vagues de sbires avant lui**, et chaque empereur vaincu fait gagner une **clé**. Réunir les quatre clés ouvre le combat final où les quatre empereurs sont présents.

## Décisions du 2026-11-11
- **Quatre portes** toujours ouvertes (Shanks, Big Mom, Kaido, Barbe Blanche), sans rotation. Un passage = **deux vagues de sbires puis l'empereur, en un seul combat à trois phases** (le moteur doit gérer les phases). Les sbires sont les **membres de l'équipage de l'empereur** (One Piece, cohérent avec le lore).
- **Une fois par jour et par empereur** (remise à zéro à minuit, heure du serveur). **Trois difficultés** : Normal, Difficile, Cauchemar.
- **Ressource légendaire** : chaque empereur laisse sa ressource, nécessaire à la fabrication de **son arme légendaire**, combinée aux ressources de donjon. Quantité par passage : Normal **1**, Difficile **1 à 2**, Cauchemar **2 à 3**.
- **Clés** : vaincre un empereur donne sa clé. Les quatre clés ouvrent le **mode Hardcore**.
- **Mode Hardcore** : les quatre empereurs ensemble en un seul combat (4 contre 4) ; il fait gagner **2 ressources légendaires parmi les 4** (deux empereurs différents tirés au sort).
- **Quatre armes**, chacune liée à un empereur (ci-dessous). Une seule des quatre est détaillée côté recette : l'épée de Shanks.

## Armes légendaires des empereurs
Armes dédiées, en plus des cinq armes génériques de `weapons.ts` (une par type). Comme elles, elles se portent sur **n'importe quelle carte éveillée à 5 étoiles** *(décidé le 2026-11-11)*.

| Arme | Empereur | Stats de base | Effet spécial débloqué |
|---|---|---|---|
| **Griffon** (épée de Shanks) | Shanks | ATK, vitesse | **Haki des rois** : chaque adversaire touché reçoit **Peur** pendant 1 tour (il a **1 chance sur 4 de rater** son coup). |
| **Murakumogiri** | Barbe Blanche | ATK, compétence physique | Chaque coup physique a **50 % de chances d'être doublé**. |
| **Hassaikai** (massue) | Kaido | DEF, réduction des dégâts subis de 10 % | Chaque attaque de base reçue **réduit les dégâts reçus de 10 %** de plus, cumulable jusqu'à **30 %**. |
| **Napoléon** | Big Mom | ATK, compétence magique | **Zeus et Prométhée** : les dégâts des sorts de **foudre** et de **feu** sont **doublés** ; les sorts des autres éléments appliquent **à la fois** les effets de foudre et de feu. |

### Recette de Griffon, l'épée de Shanks *(décidée)*
- **3 cheveux roux de Shanks** (ressource légendaire du raid) et **5 ressources de donjon One Piece**.
- La ressource de donjon ne tombe qu'au **niveau 10** du donjon One Piece, avec **10 %** de chance par victoire (change l'actuel butin du donjon, voir [lot-6-donjons-sets.md](lot-6-donjons-sets.md)).
- **Même recette pour les quatre armes** : 3 ressources de l'empereur + 5 ressources de donjon One Piece de niveau 10.
- **Stats de base** : mêmes valeurs que les armes génériques (`WEAPON_STAT`, +10 %) sur les deux statistiques indiquées (Hassaikai : DEF et réduction de dégâts de 10 %).

## Réponses du 2026-11-11
- **Porteur** : toute carte 5★. **Valeurs et recettes** : identiques pour les quatre armes (ci-dessus).
- **Hardcore** : **une fois par jour**, **difficulté propre**, butin en plus des deux ressources légendaires (cœurs de brèche).
- **Énergie et cœurs** : un passage (et le Hardcore) coûte **1 énergie** (rendue en cas de défaite, comme histoire et donjons) et donne des **cœurs de brèche** selon les règles du raid.
- **Clés** : un Hardcore consomme **une clé de chaque** empereur.

## Reste à fixer à l'implémentation
- Montant des cœurs de brèche des passages et du Hardcore, et difficulté du Hardcore (échelle des stats).
- Condition exacte de libération de la marque de Big Mom (40 % des PV max proposés).

## Mécaniques à ajouter au moteur
| Mécanique | Description |
|---|---|
| **Sommeil** (`sleep`) | Un endormi saute ses tours et se réveille quand il subit un coup ou après la durée. Nouveau statut, sans effet sur les boss. |
| **Marque à retardement** (`devour`) | Marque posée sur une cible avec un compte à rebours ; si les dégâts subis par la marquée n'atteignent pas le seuil avant l'échéance, elle est retirée du combat (« avalée »). |
| **Âmes** | Passif de Big Mom : quand une carte meurt, une âme apparaît et Big Mom la récupère. |
| **Phases** | Un boss peut changer de mode (Kaido) selon ses PV. |

## Les quatre empereurs *(kits proposés)*
Chaque empereur est une carte de boss avec les stats du raid (échelle de difficulté, `RAID_BOSS_BONUS`).

### Shanks
- **Haki des rois** (passif, début du combat) : tous les personnages dont l'ATK est inférieure à celle de Shanks sont **endormis** (2 tours, brisé par un coup subi).
- **Divine Departure** : frappe tous les ennemis à **2,1× ATK**, en **ignorant 50 % de la DEF**.
- **Duel de l'empereur** *(décidé le 2026-11-11)* : défie un ennemi en **duel pendant 2 tours** : lui seul peut atteindre Shanks (les autres ennemis, y compris les attaques de zone, ne le touchent pas et passent leur tour s'ils n'ont personne d'autre à viser). Le duel s'arrête si l'ennemi désigné tombe. Ce sort contient aussi la **Voix de l'empereur** : son équipe gagne 3 tours de **+30 % de taux critique, +50 % de dégâts critiques, +50 % d'ATK**.

### Big Mom
- **Pacte de l'âme** (début du combat) : marque un ennemi. Après **2 tours** elle le **dévore**, sauf si l'équipe **inflige à Big Mom** au moins **40 % des PV maximum de la marquée** en dégâts d'ici là (la marquée est alors libérée ; si Big Mom meurt, elle l'est aussi). Si elle l'avale, elle gagne **un de ses sorts**.
- **Zeus** : foudre sur tous les ennemis, **2× ATK**.
- **Passif Soul Pocket** : quand un ennemi meurt, il laisse une âme que Big Mom récupère : **+PV maximum (soignés) et +25 % de dégâts finaux** par âme.

### Kaido *(proposé)*
Deux modes qui s'enchaînent :
- **Homme-bête** : DEF élevée, frappes physiques (1,6× ATK sur une cible, **saignement** 2 tours), **réduction de dégâts** quand il est sous 70 % de PV.
- **Dragon** : à **50 % de PV**, il se transforme : ATK +40 %, **souffle** sur tous les ennemis (1,8× ATK, **brûlure** 2 tours), plus rapide.

### Barbe Blanche *(proposé)*
- **Gura Gura no Mi** : séisme sur tous les ennemis (1,5× ATK, **étourdit** une cible choisie au hasard 1 tour, **réduit la DEF** de 20 % 2 tours).
- **Haki du roi des mers** (passif) : réduit de 25 % les dégâts qu'il subit tant qu'il a plus de 50 % de PV.
- **Famille** : à chaque mort d'un sbire allié (vagues précédentes exclues), il gagne un **bouclier** de 10 % de ses PV.

## Combat Hardcore
Les quatre empereurs ensemble gardent leurs kits ; leurs stats sont réduites (ex. **×0,55**) pour que le 4 contre 4 reste jouable. Mécaniques liées : le Haki des rois de Shanks s'applique au début ; Big Mom récupère les âmes de tous les morts.

## Modèle de données (esquisse)
- Clés et ressources légendaires : `ResourceStock` (`cle-<empereur>` et une ressource par empereur, ex. `cheveux-roux-de-shanks`).
- Passage : un `Battle` en mode `RAID` (`raid:emperor:<boss>:<difficulté>`) à trois phases ; passage du jour mémorisé par empereur.
- Armes dédiées : nouvelles entrées de `WEAPONS`, avec stats de base propres et passifs dédiés (peur, doublement, réduction cumulable, foudre/feu).
