CREATE TABLE "Squad" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "cardIds" JSONB NOT NULL,
  CONSTRAINT "Squad_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "Squad_userId_idx" ON "Squad"("userId");
