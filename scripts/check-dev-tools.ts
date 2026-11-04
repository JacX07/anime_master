// Node 24 : node --import tsx scripts/check-dev-tools.ts (compte jetable).
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("Check réservé aux tests");
  // server-only reste actif dans l'application ; ce processus teste le module serveur.
  if (!process.execArgv.includes("--conditions=react-server")) {
    const child = spawnSync(process.execPath, ["--conditions=react-server", "--import", "tsx", import.meta.filename], {
      stdio: "inherit", env: process.env, timeout: 55_000,
    });
    if (child.error) throw child.error;
    process.exitCode = child.status ?? 1;
    return;
  }
  const { prisma } = await import("../src/lib/db");
  const { giveCharacter, devToolsEnabled, setAdventureLevel, setStory, keepAdventureLevel } = await import("../src/lib/dev-tools");
  const { getAdventure } = await import("../src/lib/adventure-state");
  try {
    const id = `dev-check-${Date.now()}`;
    await prisma.user.create({ data: { id, name: id, username: id, email: `${id}@example.test` } });
    try {
      const character = await prisma.character.findFirstOrThrow();
      await Promise.all([giveCharacter(id, character.id, 2, 5), giveCharacter(id, character.id, 2, 5)]);
      const cards = await prisma.card.findMany({ where: { ownerId: id }, orderBy: { serial: "asc" } });
      assert.equal(cards.length, 4);
      assert.equal(new Set(cards.map((c) => c.serial)).size, 4);
      const updated = await prisma.character.findUniqueOrThrow({ where: { id: character.id } });
      assert(updated.pullCount >= cards[3].serial, "Le prochain booster doit attribuer un numéro libre");
      await setAdventureLevel(id, 25);
      await setStory(id, "naruto", 15);
      await keepAdventureLevel(id);
      assert.equal((await getAdventure(id)).level, 25);
      const env = process.env as Record<string, string | undefined>;
      const previous = env.NODE_ENV;
      try {
        env.NODE_ENV = "production";
        assert.equal(devToolsEnabled(), false);
        await assert.rejects(giveCharacter(id, character.id, 1, 0), /production/);
      } finally { env.NODE_ENV = previous; }
      console.log("Outils dev conformes : dons concurrents, compteur de booster, niveau conservé et refus en production.");
    } finally { await prisma.user.delete({ where: { id } }); }
  } finally { await prisma.$disconnect(); }
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
