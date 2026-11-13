-- Même confidentialité que les autres tables du jeu ; accès applicatif via Prisma seulement.
ALTER TABLE "ArenaMatch" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "ArenaMatch" FROM PUBLIC;
DO $$
DECLARE api_role text;
BEGIN
  FOR api_role IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon', 'authenticated')
  LOOP
    EXECUTE format('REVOKE ALL ON TABLE public."ArenaMatch" FROM %I', api_role);
  END LOOP;
END $$;
