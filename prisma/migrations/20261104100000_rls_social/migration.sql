-- Tables du social : confidentialité comme toutes les tables du jeu (aucun accès direct par l'API publique ; Prisma lit avec son propre rôle).
ALTER TABLE "Friendship" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Block" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ChatMessage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ChatRead" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ChatReport" ENABLE ROW LEVEL SECURITY;
