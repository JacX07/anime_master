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
