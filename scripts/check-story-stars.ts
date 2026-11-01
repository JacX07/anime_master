// Vérifie les paliers d'étoiles de l'histoire sur la vraie base : refus sans assez d'étoiles, butin, une seule réclamation.
// Usage : npm run check:story-stars
import { prisma } from "../src/lib/db";
import { BattleError } from "../src/lib/battles";
import { claimStarTier, getStarClaims } from "../src/lib/story-star-claims";
import { starTier, starTierLoot } from "../src/lib/story-star-rewards";
import { UNIVERSES } from "../src/lib/story";

let failures = 0;
const check = (label: string, ok: boolean) => { if (!ok) failures++; console.log(`${ok ? "✓" : "✗"} ${label}`); };
const rejects = (p: Promise<unknown>) => p.then(() => false, (e) => e instanceof BattleError);

async function main() {
  const uid = `sts-${Date.now()}`, u = UNIVERSES[0];
  await prisma.user.create({ data: { id: uid, name: uid, username: uid, email: `${uid}@test.local` } });
  try {
    check("Refus sans étoiles", await rejects(claimStarTier(uid, u.key, 1)));
    await prisma.storyProgress.create({ data: { userId: uid, universe: u.key, maxLevel: 15 } });
    // 15 combats gagnés = 15 étoiles ≥ palier 1 (12), < palier 2 (24)
    const before = await prisma.user.findUniqueOrThrow({ where: { id: uid }, select: { balance: true } });
    const loot = await claimStarTier(uid, u.key, 1);
    const exp = starTierLoot(u, starTier(1)!);
    const after = await prisma.user.findUniqueOrThrow({ where: { id: uid }, select: { balance: true } });
    const stock = await prisma.resourceStock.findUnique({ where: { userId_key: { userId: uid, key: u.resource } } });
    check("Ryō versés", after.balance - before.balance === exp.ryo && loot.ryo === exp.ryo);
    check("Ressource versée", stock?.quantity === exp.resources[u.resource]);
    check("Palier noté réclamé", (await getStarClaims(uid))[u.key]?.join() === "1");
    check("Deuxième réclamation refusée", await rejects(claimStarTier(uid, u.key, 1)));
    check("Palier 2 refusé (15 étoiles)", await rejects(claimStarTier(uid, u.key, 2)));
    check("Palier inconnu refusé", await rejects(claimStarTier(uid, u.key, 99)));
    await prisma.storyStageStar.createMany({ data: Array.from({ length: 15 }, (_, i) => ({ userId: uid, universe: u.key, level: i + 1, stars: 3 })) });
    check("Palier 4 accepté à 45 étoiles", (await claimStarTier(uid, u.key, 4)).resources[u.weaponResource] === 3);
  } finally {
    await prisma.user.delete({ where: { id: uid } });
  }
  console.log(failures ? `\n${failures} échec(s)` : "\nTout est bon.");
  process.exit(failures ? 1 : 0);
}
main();
