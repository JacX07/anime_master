-- Le succès « série complète » devient « anime complet » (series_complete_1) : on garde les déblocages déjà obtenus
UPDATE "UserAchievement" SET "key" = 'series_complete_1' WHERE "key" = 'series_complete';
