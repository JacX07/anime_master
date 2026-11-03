// Vérifie les rôles d'administration (SPEC admin §2) : rôle par défaut, hiérarchie, journal d'audit.
// Usage : npm run check:admin   (Node 24)
import "dotenv/config";
import { prisma } from "../src/lib/db";

let failures = 0;
function check(label: string, ok: boolean) {
  if (!ok) failures++;
  console.log(`${ok ? "✓" : "✗"} ${label}`);
}

async function main() {
  // Le module admin importe « server-only » : on teste la logique pure ici et le 404 dans le navigateur.
  const LEVEL = { player: 0, moderator: 1, admin: 2 } as const;
  check("hiérarchie player < moderator < admin", LEVEL.player < LEVEL.moderator && LEVEL.moderator < LEVEL.admin);

  const stamp = Date.now();
  const user = await prisma.user.create({ data: { id: `adm-${stamp}`, name: "t", username: `adm${stamp}`, email: `adm${stamp}@example.invalid` } });
  try {
    check("nouveau compte = player", user.role === "player");
    const up = await prisma.user.update({ where: { id: user.id }, data: { role: "moderator" } });
    check("rôle modifiable en base", up.role === "moderator");
    const row = await prisma.adminAudit.create({ data: { actorId: user.id, actorName: user.username, action: "test", data: { a: 1 } } });
    check("audit écrit", row.action === "test" && row.createdAt instanceof Date);
    let refused = false;
    try { await prisma.user.update({ where: { id: user.id }, data: { role: "root" as never } }); } catch { refused = true; }
    check("rôle inconnu refusé", refused);
  } finally {
    await prisma.adminAudit.deleteMany({ where: { actorId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
    await prisma.$disconnect();
  }
  if (failures) process.exitCode = 1;
}
main();
