# Bilan du combat et file de passage

Le lecteur commun affiche un bilan à la fin des replays et des combats suivis, y compris lorsque la page fournit son propre résultat (butin, étoiles, suite de l’histoire).

Le classement est filtrable par équipe et par mesure : dégâts infligés, dégâts subis, soins, boucliers absorbés, boucliers donnés, KO provoqués et actions. Chaque ligne présente le portrait, le nom, le camp, une barre comparative et la valeur. Un tableau rassemble toutes les mesures.

- Dégâts infligés : PV effectivement retirés à l’adversaire + boucliers effectivement absorbés. Les dégâts excédant les PV restants ne gonflent pas le score.
- Dégâts subis : PV effectivement perdus, y compris les dégâts périodiques. L’absorption est séparée.
- Soins : PV effectivement rendus ; les résurrections ne sont pas comptées comme soins.
- Boucliers donnés : gains positifs attribuables à un personnage, hors protection initiale du second camp.
- KO : transitions à zéro PV causées par un coup ou des dégâts périodiques attribuables. Une résurrection permet un nouveau KO.

Les effets périodiques conservent désormais leur lanceur (`Fx.source`, facultatif). Les événements poison/brûlure/saignement et les soins de régénération utilisent cette source pour le bilan. Les anciens journaux restent lisibles : les dégâts périodiques sans lanceur connu sont comptés dans les dégâts subis et signalés séparément, sans inventer de responsable.

La file verticale à gauche affiche jusqu’à huit portraits, le camp et le rang de passage. La tête est mise en évidence. En direct, une fois l’animation rattrapée, la prévision serveur fait autorité. Pendant la lecture et en replay, le journal donne les prochaines actions connues. Les personnages KO sont exclus ; les portraits peuvent se répéter si un personnage doit rejouer dans la fenêtre affichée. Le clic ouvre sa fiche de sorts selon les règles du lecteur.

L’historique textuel reste accessible par son bouton et s’ouvre en tiroir, y compris sur grand écran. Le bilan défile séparément du plateau et son tableau reste défilable horizontalement sur téléphone. Aller à la fin pendant une pause affiche immédiatement le résultat, sans animation figée à opacité zéro.

Validation : `npm run check:battle-report`, puis parcours navigateur sur replay, combat manuel/auto suivi et victoire d’histoire ; filtres, tableau, fin pendant une pause, portraits sur ordinateur et téléphone.
