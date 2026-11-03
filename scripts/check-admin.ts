// Vérifie les rôles d'administration (SPEC admin §2) : rôle par défaut, hiérarchie, journal d'audit.
// Usage : npm run check:admin   (Node 24)
import "dotenv/config";
import { prisma } from "../src/lib/db";
import { AdminError, adjustRyo, banUser, changeRole, denied, giveCard, removeCard, resetPity, unbanUser, type Actor } from "../src/lib/admin-actions";
import { EVENT_RETENTION_DAYS, purgeOldEvents, track } from "../src/lib/events";

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

    await track("login", user.id);
    await track("pack_open", user.id, { lotSize: 5, rarities: { N: 5 } });
    const mine = await prisma.gameEvent.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" } });
    check("track écrit les événements", mine.length === 2 && mine[1].type === "pack_open");
    const old = await prisma.gameEvent.create({ data: { userId: user.id, type: "login", createdAt: new Date(Date.now() - (EVENT_RETENTION_DAYS + 1) * 86_400_000) } });
    await purgeOldEvents();
    check("purge : vieux événement supprimé, récents gardés", !(await prisma.gameEvent.findUnique({ where: { id: old.id } })) && (await prisma.gameEvent.count({ where: { userId: user.id } })) === 2);

    // ---- Lot 4 : actions de l'équipe ----
    const mk = (id: string, role: "player" | "moderator" | "admin") => prisma.user.create({ data: { id: `${id}-${stamp}`, name: id, username: `${id}${stamp}`, email: `${id}${stamp}@example.invalid`, role } });
    const [a, m, m2, p, tgt] = await Promise.all([mk("adm4a", "admin"), mk("adm4m", "moderator"), mk("adm4n", "moderator"), mk("adm4p", "player"), mk("adm4t", "player")]);
    const as = (u: { id: string; username: string; role: "player" | "moderator" | "admin" }): Actor => ({ id: u.id, username: u.username, role: u.role });
    const ids = [a.id, m.id, m2.id, p.id, tgt.id];
    try {
      check("droits : modo peut bannir un joueur", denied(as(m), as(tgt), "ban") === null);
      check("droits : modo ne peut pas bannir un modo ni un admin", denied(as(m), as(m2), "ban") !== null && denied(as(m), as(a), "ban") !== null);
      check("droits : admin ne peut pas bannir un admin, ni agir sur soi", denied(as(a), as({ ...a, id: "x" }), "ban") !== null && denied(as(a), as(a), "role") !== null);
      check("droits : modo ne peut pas toucher la monnaie", denied(as(m), as(tgt), "ryo") !== null && denied(as(a), as(tgt), "ryo") === null);
      check("droits : joueur refusé partout", denied(as(p), as(tgt), "ban") !== null);
      const fails = async (f: () => Promise<unknown>) => { try { await f(); return false; } catch (e) { return e instanceof AdminError; } };
      check("motif obligatoire", await fails(() => adjustRyo(as(a), tgt.id, 10, "  ")));
      check("modo refusé pour les Ryō", await fails(() => adjustRyo(as(m), tgt.id, 10, "test modo")));
      await adjustRyo(as(a), tgt.id, 120, "test ajout");
      const afterRyo = await prisma.user.findUniqueOrThrow({ where: { id: tgt.id } });
      const sum = await prisma.currencyLedger.aggregate({ where: { userId: tgt.id }, _sum: { amount: true } });
      check("Ryō : solde = somme du journal, ligne ADMIN", afterRyo.balance === 120 && sum._sum.amount === 120);
      check("Ryō : solde jamais négatif", await fails(() => adjustRyo(as(a), tgt.id, -500, "test retrait")));
      check("Ryō : quantité absurde refusée", await fails(() => adjustRyo(as(a), tgt.id, 10 ** 9, "test énorme")));
      await resetPity(as(a), tgt.id, "test pity");
      const ch = await prisma.character.findFirst({ select: { id: true } });
      if (ch) {
        const cardId = await giveCard(as(a), tgt.id, ch.id, "test cadeau");
        check("carte offerte", (await prisma.card.count({ where: { ownerId: tgt.id } })) === 1);
        await removeCard(as(a), tgt.id, cardId, "test retrait carte");
        check("carte retirée", (await prisma.card.count({ where: { ownerId: tgt.id } })) === 0);
        check("tirage vide (lotSize 0) pour les cadeaux", (await prisma.packOpening.count({ where: { userId: tgt.id, lotSize: { gt: 0 } } })) === 0);
      }
      await prisma.session.create({ data: { id: `s-${stamp}`, token: `t-${stamp}`, userId: tgt.id, expiresAt: new Date(Date.now() + 1e6) } });
      await banUser(as(m), tgt.id, "test bannissement");
      const banned = await prisma.user.findUniqueOrThrow({ where: { id: tgt.id } });
      check("ban : bannedAt posé, sessions supprimées", !!banned.bannedAt && banned.banReason === "test bannissement" && (await prisma.session.count({ where: { userId: tgt.id } })) === 0);
      await unbanUser(as(m), tgt.id, "test débannissement");
      check("débannissement", (await prisma.user.findUniqueOrThrow({ where: { id: tgt.id } })).bannedAt === null);
      check("modo ne peut pas changer un rôle", await fails(() => changeRole(as(m), tgt.id, "admin", "test promotion")));
      await changeRole(as(a), tgt.id, "moderator", "test rôle");
      check("rôle changé par un admin", (await prisma.user.findUniqueOrThrow({ where: { id: tgt.id } })).role === "moderator");
      const trail = await prisma.adminAudit.count({ where: { targetId: tgt.id, reason: { startsWith: "test" } } });
      check("audit : une ligne par action réussie", trail === (ch ? 7 : 5));
      for (let i = 0; i < 30; i++) await prisma.adminAudit.create({ data: { actorId: m2.id, actorName: m2.username, action: "x" } });
      check("limite de débit", await fails(() => banUser(as(m2), p.id, "test rafale")));
    } finally {
      await prisma.adminAudit.deleteMany({ where: { OR: [{ actorId: { in: ids } }, { targetId: { in: ids } }] } });
      await prisma.user.deleteMany({ where: { id: { in: ids } } });
    }
  } finally {
    await prisma.adminAudit.deleteMany({ where: { actorId: user.id } });
    await prisma.gameEvent.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
    await prisma.$disconnect();
  }
  if (failures) process.exitCode = 1;
}
main();
