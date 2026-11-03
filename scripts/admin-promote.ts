// Change le rôle d'un compte depuis la ligne de commande (seul moyen de créer le premier admin).
// Usage : npm run admin:promote -- <pseudo> [admin|moderator|player]
import { prisma } from "../src/lib/db";

async function main() {
  const [name, role = "admin"] = process.argv.slice(2);
  if (!name || !["admin", "moderator", "player"].includes(role)) {
    console.error("Usage : npm run admin:promote -- <pseudo> [admin|moderator|player]");
    process.exitCode = 1;
    return;
  }
  const user = await prisma.user.findUnique({ where: { username: name.toLowerCase() }, select: { id: true, username: true, role: true } });
  if (!user) {
    console.error(`Aucun compte « ${name} ».`);
    process.exitCode = 1;
    return;
  }
  if (user.role === "admin" && role !== "admin" && (await prisma.user.count({ where: { role: "admin" } })) <= 1) {
    console.error("Refusé : c'est le dernier admin.");
    process.exitCode = 1;
    return;
  }
  await prisma.user.update({ where: { id: user.id }, data: { role: role as "admin" | "moderator" | "player" } });
  await prisma.adminAudit.create({ data: { actorName: "cli", action: "role.set", targetId: user.id, data: { from: user.role, to: role } } });
  console.log(`${user.username} : ${user.role} → ${role}`);
}
main().finally(() => prisma.$disconnect());
