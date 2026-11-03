CREATE TYPE "UserRole" AS ENUM ('player', 'moderator', 'admin');
ALTER TABLE "User" ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'player';

CREATE TABLE "AdminAudit" (
  "id" TEXT PRIMARY KEY,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actorId" TEXT,
  "actorName" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "targetId" TEXT,
  "reason" TEXT,
  "data" JSONB
);
CREATE INDEX "AdminAudit_createdAt_idx" ON "AdminAudit"("createdAt");
CREATE INDEX "AdminAudit_actorId_idx" ON "AdminAudit"("actorId");
ALTER TABLE "AdminAudit" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "AdminAudit" FROM PUBLIC;
DO $$
DECLARE api_role text;
BEGIN
  FOR api_role IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon', 'authenticated')
  LOOP
    EXECUTE format('REVOKE ALL ON TABLE public."AdminAudit" FROM %I', api_role);
  END LOOP;
END $$;
