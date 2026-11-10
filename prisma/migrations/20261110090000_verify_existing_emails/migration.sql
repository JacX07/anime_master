-- Les comptes créés avant la vérification d'e-mail ne peuvent pas confirmer leur adresse : on les marque confirmés
-- pour que la connexion ne soit bloquée pour personne. Aucune donnée supprimée.
UPDATE "User" SET "emailVerified" = true WHERE "emailVerified" = false;
