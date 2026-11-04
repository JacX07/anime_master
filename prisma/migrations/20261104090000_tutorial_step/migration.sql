-- Tutoriel en infobulles : les nouveaux comptes commencent à l'étape 1, les comptes existants ne le voient pas.
ALTER TABLE "User" ADD COLUMN "tutorialStep" INTEGER NOT NULL DEFAULT 1;
UPDATE "User" SET "tutorialStep" = 0;
