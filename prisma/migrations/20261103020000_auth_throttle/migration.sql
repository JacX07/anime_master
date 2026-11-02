CREATE TABLE "AuthThrottle" (
  "key" TEXT PRIMARY KEY,
  "count" INTEGER NOT NULL,
  "expiresAt" TIMESTAMPTZ(3) NOT NULL
);
CREATE INDEX "AuthThrottle_expiresAt_idx" ON "AuthThrottle"("expiresAt");
ALTER TABLE "AuthThrottle" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "AuthThrottle" FROM PUBLIC;
DO $$
DECLARE api_role text;
BEGIN
  FOR api_role IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon', 'authenticated')
  LOOP
    EXECUTE format('REVOKE ALL ON TABLE public."AuthThrottle" FROM %I', api_role);
  END LOOP;
END $$;
