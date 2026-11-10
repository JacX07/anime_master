# Défi des empereurs *(proposé le 2026-11-11, à valider avant de coder)*

[← Index des specs](README.md) · [Raid](pvm.md) · [Combat](combat.md)

Mode de raid permanent : les **quatre empereurs** (Shanks, Big Mom, Kaido, Barbe Blanche) sont tous disponibles en même temps, sans rotation hebdomadaire. Chacun a **deux vagues de sbires avant lui**, et chaque empereur vaincu fait gagner une **clé**. Réunir les quatre clés ouvre le combat final où les quatre empereurs sont présents.

## Interprétation à valider
1. **Quatre portes**, toujours ouvertes, une par empereur. Un passage = vague 1 (4 sbires) → vague 2 (4 sbires plus forts) → empereur. Trois combats enchaînés, un seul coût d'énergie, aucune récompense avant la fin du passage. Une défaite arrête le passage (pas de pénalité).
2. **Clé** : vaincre l'empereur donne sa clé (une clé par empereur, cumulables sans limite).
3. **Combat final « Les Quatre Empereurs »** : consomme **une clé de chaque** ; le joueur affronte l'équipe formée des quatre empereurs en 4 contre 4. Pas de sbires avant.
4. Les clés servent seulement au combat final ; les passages simples restent rejouables à volonté (butin selon les règles du raid : cœurs de brèche, plafond quotidien).

## Questions ouvertes
- Butin du combat final (cœurs ×?, artefact exclusif, titre de profil, cosmétique) : **à décider**.
- Budget d'équipe : le raid n'en a pas ; on garde cette règle.
- Niveau de difficulté : un seul niveau très difficile, ou les trois difficultés du raid ?
- Les sbires : personnages de l'univers de l'empereur (One Piece pour les quatre), ou sbires génériques de brèche ?

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
- **Voix de l'empereur** : renforce son équipe pour 3 tours : **+30 % de taux critique, +50 % de dégâts critiques, +50 % d'ATK**.

### Big Mom
- **Pacte de l'âme** (début du combat) : marque un ennemi. Après **2 tours** elle le **dévore**, sauf si l'équipe lui inflige au moins **40 % des PV maximum de la marquée** en dégâts d'ici là (la marquée est alors libérée). Si elle l'avale, elle gagne **un de ses sorts**.
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

## Combat final
Les quatre empereurs ensemble gardent leurs kits ; leurs stats sont réduites (ex. **×0,55**) pour que le 4 contre 4 reste jouable. Mécaniques liées : le Haki des rois de Shanks s'applique au début ; Big Mom récupère les âmes de tous les morts.

## Modèle de données (esquisse)
- Clés : `ResourceStock` (une ressource par empereur : `cle-shanks`, `cle-big-mom`, `cle-kaido`, `cle-barbe-blanche`).
- Passage : trois `Battle` successifs en mode `RAID` (clé `raid:emperor:<boss>:<vague>`) rattachés à un passage ; ou, si le moteur le permet, un seul combat à trois phases (à trancher à l'implémentation).
