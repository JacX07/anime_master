CREATE TABLE "GameEvent" (
  "id" TEXT PRIMARY KEY,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "userId" TEXT,
  "type" TEXT NOT NULL,
  "data" JSONB
);
CREATE INDEX "GameEvent_createdAt_idx" ON "GameEvent"("createdAt");
CREATE INDEX "GameEvent_type_createdAt_idx" ON "GameEvent"("type", "createdAt");
CREATE INDEX "GameEvent_userId_createdAt_idx" ON "GameEvent"("userId", "createdAt");
ALTER TABLE "GameEvent" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "GameEvent" FROM PUBLIC;
DO $$
DECLARE api_role text;
BEGIN
  FOR api_role IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon', 'authenticated')
  LOOP
    EXECUTE format('REVOKE ALL ON TABLE public."GameEvent" FROM %I', api_role);
  END LOOP;
END $$;
