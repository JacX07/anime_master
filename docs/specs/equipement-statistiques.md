# Équipement : statistiques et compétence magique

Les quatre objets One Piece affichent désormais les noms validés : Chapeau de paille de Luffy, Gilet rouge de Luffy, Mitaines du Thousand Sunny et Bottes de Grand Line. Dans l’inventaire, une pastille indique le porteur ; son nom reste visible dans la fiche de l’objet et est recherchable. Les armes liées à un exemplaire portent aussi cette indication.

L’amélioration ne déclenche plus un rafraîchissement complet du layout suivi d’une deuxième requête du navigateur. L’action revalide les pages Équipe et Inventaire ; Next renvoie leurs nouvelles valeurs dans la réponse de l’action. La transaction et ses contrôles de propriété, niveau attendu, fonds et journal Ryō restent inchangés.

L’onglet Statistiques d’une carte montre les valeurs de base et les valeurs de début de combat, en utilisant le moteur et la somme d’artefacts partagée avec le serveur. Il inclut les étoiles, l’arme, les artefacts, le set et les synergies de la composition actuellement affichée. Une carte hors équipe est calculée seule. Les bonus d’ATK, DEF et PV d’artefacts sont distincts : l’ATK ne doit jamais augmenter la DEF ni les PV.

## Compétence magique

Stat exprimée en pourcentage, de base 0 %. Elle peut apparaître en stat principale de gants et en sous-stat d’artefact. Elle s’améliore suivant les règles de l’artefact : +5 % de sa valeur initiale par niveau si c’est la stat principale.

Seuls les dégâts directs des sorts marqués magiques sont multipliés par `1 + compétence magique`. Exemple : +20 % donne ×1,20. La stat ne change pas les attaques physiques, les attaques de base non marquées, les durées de contrôle, les soins et les dégâts périodiques. Elle ne remplace pas l’ATK dans la formule de base.

Le champ optionnel `CharacterSpell.damageKind` permet de marquer explicitement chaque sort `magic` ou `physical`, indépendamment du type du personnage. Le marquage explicite est prioritaire. Le registre initial `magic-skill.ts` marque les sorts secondaire/tertiaire/ultime de Roy Mustang, Roxy, Aqua, Megumin, Emilia, Rem, Howl et Tatsumaki ; le sort affilié Magie est également magique. Le registre reste à enrichir lors des prochaines revues des kits. Les autres sorts ne deviennent pas magiques uniquement parce que leur porteur est de type MAGIE.

Les bonus de set de dégâts magiques préexistants conservent leur règle propre ; cette nouvelle stat ne modifie pas rétroactivement les objets sans compétence magique. Le moteur accepte l’absence de la stat dans les anciens combats.

## Vérifications

- `check:equipment-stats` : séparation des bonus, porteur et différence réelle de dégâts/statistiques après amélioration dans un nouveau combat.
- `check:magic-skill` : sort magique sur une carte Combat, sort physique et sort non marqué sur une carte Magie, attaque de base inchangée, addition des artefacts.
- `check:artifact-upgrade` : propriété, fonds, rollback, double clic, plafond et journal.
- Parcours navigateur : compte jetable, inventaire, équipement sur Roy Mustang, améliorations et fonds insuffisants, onglets Statistiques/Sorts, rechargement et vue mobile 390 px.

## v0.3.0 (lot 1)

- **Coût d'amélioration** des artefacts environ divisé par deux : `{N 10, R 15, SR 25, SSR 40, UR 55} × (niveau + 1)` Ryō (avant 25 / 35 / 50 / 75 / 100). Le coût est écrit sur le bouton « Améliorer » (Équipe et Inventaire).
- **Aperçu avant / après** : la fiche d'un artefact sélectionné montre Puissance, PV, ATK, DEF, Vitesse, critique, dégâts critiques et esquive du personnage, maintenant et avec l'objet (ou sans, s'il le porte déjà). Même calcul que l'onglet Statistiques (`gearSnapshot`).
- **Classement de puissance** : chaque carte équipée ajoute la différence entre sa puissance de combat avec et sans équipement (artefacts, arme à 5★), calculée seule, sans synergie d'équipe (`src/lib/gear-power.ts`). Le détail « équipement +N » s'affiche dans le classement ; la puissance du menu compte aussi ce bonus.
- **Sorts** : les multiplicateurs (« 1,1× ATK ») sont écrits dans la description visible (fiche du personnage et panneau de combat), plus seulement au survol. Une aide repliable explique multiplicateur, dégâts physiques / magiques et compétence magique.

## Recyclage des artefacts *(v0.3.0)*

- Un artefact **non équipé** se recycle contre des Ryō : `{N 10, R 25, SR 60, SSR 150, UR 300}` + **70 %** des Ryō dépensés pour l'améliorer (`artifactRecycleValue`). Définitif, confirmation demandée.
- Inventaire : bouton « Recycler · +X Ryō » sur la fiche ; barre « Recycler les artefacts non équipés jusqu'à [rareté] », améliorés exclus sauf case cochée, avec le nombre et le total.
- Journal : une ligne `ARTIFACT_RECYCLE` par objet (migration `20261110130000_artifact_recycle`). Tout ou rien : si un objet est équipé ou a disparu entre-temps, rien n'est recyclé.

## Stats des artefacts et raretés *(v0.3.0, remplace l'échelle par rareté)*

- **Stat principale identique pour toutes les raretés**, seule l'amélioration la fait monter (`ARTIFACT_MAIN`, `mainValueAt`) :

| Stat principale | +0 | par niveau | +16 |
|---|---|---|---|
| ATK %, DEF %, PV %, compétence magique | 4 % | +2 % | 36 % |
| Taux critique | 4 % | +3,5 % | 60 % |
| Dégâts critiques | 8 % | +4,5 % | 80 % |
| Vitesse | 8 | +2 | 40 |
| ATK / DEF / PV fixes | 57 / 45 / 285 | +25 % de la base | ×5 |

- **La rareté ne joue que sur les sous-stats** : nombre (N 0, R 1, SR 2, SSR et UR 3) et valeur ×1 / ×1,25 / ×1,5 / ×1,75 / ×2. Les sous-stats révélées par l'amélioration prennent le multiplicateur de la rareté de l'objet.
- Le taux critique total n'a pas d'autre plafond que 100 %.
- **Objets existants** : stat principale recalculée selon leur niveau (migration `20261110140000_artifact_main_stats`) ; leurs sous-stats ne changent pas.
- **Noms et couleurs** alignés sur les personnages : N Commun gris, R Rare bleu, SR Épique violet, SSR Légendaire orange, UR **Mythique** rouge.
- **Squads** : « Améliorer » monte d'un niveau à la fois (pas d'amélioration directe à un palier) ; bouton « Recycler » sur un objet non équipé, confirmé dans la page.
