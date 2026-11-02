-- AlterTable
ALTER TABLE "Media" ADD COLUMN "franchiseId" INTEGER;

-- CreateIndex
CREATE INDEX "Media_franchiseId_idx" ON "Media"("franchiseId");

