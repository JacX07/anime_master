import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

const check = (label: string, ok: boolean) => { assert.ok(ok, label); console.log(`✓ ${label}`); };

async function main() {
  if (!process.execArgv.includes("--conditions=react-server")) {
    const child = spawnSync(process.execPath, ["--conditions=react-server", "--import", "tsx", import.meta.filename], { stdio: "inherit", env: process.env, timeout: 55000 });
    if (child.error) throw child.error;
    process.exitCode = child.status ?? 1;
    return;
  }
  const { prisma } = await import("../src/lib/db");
  const { buildBoard, powerBoard, rarityCounts, storyBoard, towerBoard } = await import("../src/lib/rankings");
  try {
    const tag = `rk${Date.now()}`;
    const ids = ["a", "b", "c"].map((s) => `${tag}-${s}`);
    for (const id of ids) await prisma.user.create({ data: { id, name: id, username: id, email: `${id}@test.local` } });
    const [a, b, c] = ids;
    try {
      // Histoire : a = 3 combats gagnés dont 1 avec 3 étoiles ; b = 2 combats ; c = rien
      await prisma.storyProgress.create({ data: { userId: a, universe: "one-piece", maxLevel: 3 } });
      await prisma.storyStageStar.create({ data: { userId: a, universe: "one-piece", level: 1, stars: 3 } });
      await prisma.storyProgress.create({ data: { userId: b, universe: "one-piece", maxLevel: 2 } });
      const story = await storyBoard(b);
      const sa = story.top.find((r) => r.userId === a)!, sb = story.top.find((r) => r.userId === b)!;
      check("Histoire : 3 + 1 + 1 = 5 étoiles", sa.score === 5 && sa.detail === "3 combats gagnés");
      check("Histoire : un combat gagné vaut au moins 1 étoile", sb.score === 2);
      check("Histoire : classé devant, rang et ligne de l'utilisateur", sa.rank < sb.rank && story.me?.userId === b && !story.top.some((r) => r.userId === c));
      // Tour : égalité départagée par le premier arrivé
      await prisma.towerProgress.create({ data: { userId: a, maxFloor: 7, reachedAt: new Date("2026-01-02") } });
      await prisma.towerProgress.create({ data: { userId: b, maxFloor: 7, reachedAt: new Date("2026-01-01") } });
      await prisma.towerProgress.create({ data: { userId: c, maxFloor: 9 } });
      const tower = await towerBoard(null);
      const order = tower.top.filter((r) => ids.includes(r.userId)).map((r) => r.userId);
      check("Tour : étage le plus haut d'abord, puis le premier arrivé", order.join() === [c, b, a].join());
      // Puissance et raretés
      const ch = await prisma.character.findMany({ where: { disabled: false }, take: 2, orderBy: { id: "asc" }, select: { id: true, power: true, rarity: true } });
      const op = await prisma.packOpening.create({ data: { userId: a, lotSize: 5, pityTriggered: "NONE" } });
      let serial = 940000 + Math.floor(Math.random() * 40000);
      for (const x of ch) await prisma.card.create({ data: { ownerId: a, characterId: x.id, finish: "NORMAL", serial: serial++, rarityAtPull: x.rarity, packOpeningId: op.id } });
      await prisma.card.create({ data: { ownerId: a, characterId: ch[0].id, finish: "NORMAL", serial: serial++, rarityAtPull: ch[0].rarity, packOpeningId: op.id } });
      const power = await powerBoard(a);
      const pa = power.top.find((r) => r.userId === a)!;
      check("Puissance : somme des cartes, doublons compris", pa.score === ch[0].power * 2 + ch[1].power && pa.detail === "3 cartes");
      const rar = (await rarityCounts()).get(a)!;
      check("Raretés : personnages uniques", Object.values(rar).reduce((n, x) => n + x, 0) === 2);
      // Découpage du top et seuil
      const cut = await buildBoard([{ userId: a, score: 10 }, { userId: b, score: 8 }, { userId: c, score: 5 }], c, undefined, 2);
      check("Top limité, utilisateur hors top retrouvé, seuil du top", cut.top.length === 2 && cut.me?.rank === 3 && cut.cutoff === 8);
      console.log("\nClassements conformes.");
    } finally {
      await prisma.user.deleteMany({ where: { id: { in: ids } } });
    }
  } finally { await prisma.$disconnect(); }
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
