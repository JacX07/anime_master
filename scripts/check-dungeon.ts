// Donjon One Piece : progression, butin atomique, défaite, équipement et propriété.
// Usage : npm run check:dungeon
import { BattleError, equipArtifact, getArtifactInventory, getDungeonAccess, getBattle, getAttackTeam, playAction, setAttackTeam, startBattle } from "../src/lib/battles";
import { prisma } from "../src/lib/db";
import { artifactMainStat, artifactSlot, artifactSubStats, dungeonKey, dungeonArtifactRarities, DUNGEONS, ARTIFACT_SLOTS } from "../src/lib/dungeons";
import { RARITY_NAMES } from "../src/lib/labels";
import type { Rarity } from "../src/generated/prisma/enums";
let failures = 0;
function check(label: string, ok: boolean, detail = "") { if (!ok) failures++; console.log(`${ok ? "✓" : "✗"} ${label}${detail ? ` — ${detail}` : ""}`); }
const rejects = (p: Promise<unknown>) => p.then(() => false, (e) => e instanceof BattleError);

async function main() {
  const slots = new Map<string, number>(), gloveStats = new Map<string, number>();
  for (let seed = 0; seed < 80_000; seed++) {
    const slot = artifactSlot(seed);
    slots.set(slot, (slots.get(slot) ?? 0) + 1);
    if (slot === "GANTS") {
      const stat = artifactMainStat(slot, "UR", seed).stat;
      gloveStats.set(stat, (gloveStats.get(stat) ?? 0) + 1);
    }
  }
  check("Emplacements accessibles et proches de 25 % sur 80 000 graines", slots.size === 4 && [...slots.values()].every((n) => Math.abs(n / 80_000 - 0.25) < 0.01), [...slots].map(([s, n]) => `${s} ${(100 * n / 80_000).toFixed(1)} %`).join(", "));
  check("Cinq stats de gants équiprobables, compétence magique incluse", gloveStats.size === 5 && gloveStats.has("magicSkill") && [...gloveStats.values()].every((n) => Math.abs(n / (slots.get("GANTS") ?? 1) - 1 / 5) < 0.02), [...gloveStats].map(([s, n]) => `${s} ${(100 * n / (slots.get("GANTS") ?? 1)).toFixed(1)} %`).join(", "));
  // v0.3.0 : la stat principale ne dépend plus de la rareté (seule l'amélioration la fait monter)
  check("Valeurs plates des gants identiques pour toutes les raretés", (["N", "R", "SR", "SSR", "UR"] as const).every((rarity) => {
    const expected = [57, 45, 285];
    for (let seed = 0; seed < 20_000; seed++) {
      const main = artifactMainStat("GANTS", rarity, seed);
      if (main.stat === "flatAttack" && main.value !== expected[0]) return false;
      if (main.stat === "flatDefense" && main.value !== expected[1]) return false;
      if (main.stat === "flatHp" && main.value !== expected[2]) return false;
    }
    return true;
  }));
  check("Valeurs % et critiques de départ identiques pour toutes les raretés", (["N", "R", "SR", "SSR", "UR"] as const).every((rarity) => {
    const expected: Record<string, number> = { crit: 0.04, critDamage: 0.08, attack: 0.04, magicSkill: 0.04 };
    return Array.from({ length: 100 }, (_, seed) => artifactMainStat("GANTS", rarity, seed)).every((main) => expected[main.stat] !== undefined ? main.value === expected[main.stat] : true);
  }));
  check("Les sous-stats excluent la stat principale avec des flux aléatoires séparés", (["CASQUE", "PLASTRON", "GANTS", "BOTTES"] as const).every((slot) => Array.from({ length: 2_000 }, (_, seed) => {
    const main = artifactMainStat(slot, "UR", seed ^ 0x4d3c2b1a).stat;
    return artifactSubStats(slot, "UR", seed ^ 0x7f4a7c15, main).every((sub) => sub.stat !== main);
  }).every(Boolean)));
  check("Sous-stats selon la rareté, sans répéter la stat principale", ["N", "R", "SR", "SSR", "UR"].every((rarity) => {
    const stats = artifactSubStats("CASQUE", rarity as Rarity, 271);
    return stats.length === ({ N: 0, R: 1, SR: 2, SSR: 3, UR: 3 }[rarity as Rarity]) && new Set(stats.map((s) => s.stat)).size === stats.length && stats.every((s) => s.stat !== "dodge" && s.stat !== artifactMainStat("CASQUE", rarity as Rarity, 271).stat);
  }));
  for (const slot of ["CASQUE", "PLASTRON", "GANTS", "BOTTES"] as const) {
    const expected = slot === "GANTS" ? ["flatAttack", "attack", "crit", "magicSkill", "critDamage"] : slot === "BOTTES" ? ["speed", "flatAttack", "flatDefense", "flatHp", "attack", "defense", "hp"] : ["flatHp", "flatDefense", "flatAttack", "hp", "defense", "attack"];
    const seen = new Set(Array.from({ length: 2000 }, (_, seed) => artifactMainStat(slot, "N", seed).stat));
    check(`Stats autorisées : ${slot}`, seen.size === expected.length && expected.every((stat) => seen.has(stat)));
  }
  const uid = `dg-${Date.now()}`;
  await prisma.user.create({ data: { id: uid, name: uid, username: uid, email: `${uid}@test.local` } });
  // Ces tests isolent le mode ; les conditions d’accès sont testées par check:adventure.
  await prisma.adventureRecord.create({ data: { userId: uid, key: "access:dungeon" } });
  try {
    const opening = await prisma.packOpening.create({ data: { userId: uid, lotSize: 5, pityTriggered: "NONE" } });
    let serial = 920000 + Math.floor(Math.random() * 50000);
    const makeTeam = async (rarity: Rarity) => {
      const chars = await prisma.character.findMany({ where: { disabled: false, rarity }, take: 4, orderBy: { id: "asc" }, select: { id: true } });
      const ids: string[] = [];
      for (const c of chars) ids.push((await prisma.card.create({ data: { ownerId: uid, characterId: c.id, finish: "NORMAL", serial: serial++, rarityAtPull: rarity, packOpeningId: opening.id } })).id);
      await setAttackTeam(uid, ids);
      return ids;
    };
    await makeTeam("N");
    check("Donjon verrouillé sans le combat 10 de l'histoire", await rejects(startBattle(uid, dungeonKey(1), false)));
    await prisma.storyProgress.create({ data: { userId: uid, universe: "one-piece", maxLevel: 10 } });
    check("Donjon One Piece ouvert après le combat 10, Naruto toujours fermé", (await getDungeonAccess(uid))["one-piece"].unlocked && !(await getDungeonAccess(uid)).naruto.unlocked);
    check("Donjon Naruto refusé", await rejects(startBattle(uid, dungeonKey(1, "naruto"), false)));
    check("Difficulté 2 verrouillée avant le premier succès", await rejects(startBattle(uid, dungeonKey(2), false)));
    const defeat = await startBattle(uid, dungeonKey(1), false);
    check("Défaite sans pénalité ni artefact", defeat.winner !== "A" && !defeat.loot?.artifact);
    check("Défaite sans progression", (await prisma.dungeonProgress.findUnique({ where: { userId_dungeon: { userId: uid, dungeon: "one-piece" } } })) === null);
    await makeTeam("UR");
    const win = await startBattle(uid, dungeonKey(1), false);
    check("Victoire de difficulté 1", win.winner === "A");
    check("Une victoire donne un artefact", Boolean(win.loot?.artifact), win.loot?.artifact ? `${RARITY_NAMES[win.loot.artifact.rarity]} ${win.loot.artifact.slot}` : "aucun");
    const rows = await prisma.artifact.findMany({ where: { userId: uid } });
    check("Artefact inscrit en base une seule fois", rows.length === (win.loot?.artifact ? 1 : 0));
    const levelTwo = await startBattle(uid, dungeonKey(2), false);
    check("Déblocage séquentiel du niveau 2", Boolean(levelTwo));
    const team = await getAttackTeam(uid);
    const card = team[0]!;
    const baseAtk = card.character.attack * (1 + card.stars * 0.04);
    const artifact = rows[0];
    if (artifact) await equipArtifact(uid, artifact.id, card.id);
    const after = await startBattle(uid, "test", false);
    const startEvent = after.log.find((e) => e.kind === "start");
    const equipped = startEvent?.kind === "start" ? startEvent.units.find((u) => u.id === "A1") : null;
    const changed = Boolean(artifact && equipped && (artifact.mainStat === "attack" || artifact.mainStat === "flatAttack" ? equipped.atk > baseAtk : artifact.mainStat === "defense" || artifact.mainStat === "flatDefense" ? equipped.def > card.character.defense : artifact.mainStat === "hp" || artifact.mainStat === "flatHp" ? equipped.maxHp > 2.8 * (card.character.attack + card.character.defense) : true));
    check("Équipement pris en compte dans le snapshot de combat", changed, artifact?.mainStat);
    const more = (["CASQUE", "PLASTRON", "GANTS", "BOTTES"] as const).filter((slot) => !artifact || slot !== artifact.slot);
    const extras: string[] = [];
    for (const slot of more.slice(0, 3)) {
      const extra = await prisma.artifact.create({ data: { userId: uid, setKey: "one-piece", slot, rarity: "N", mainStat: "hp", mainValue: 0 } });
      extras.push(extra.id);
      await equipArtifact(uid, extra.id, card.id);
      if (extras.length === 1) {
        const twoPiece = await startBattle(uid, "test", false);
        const twoStart = twoPiece.log.find((e) => e.kind === "start");
        const twoAtk = twoStart?.kind === "start" ? twoStart.units.find((u) => u.id === "A1")?.atk ?? 0 : 0;
        check("Bonus de set 2 pièces appliqué au combat", twoAtk > (equipped?.atk ?? 0));
      }
    }
    const fourPiece = await startBattle(uid, "test", false);
    const fourEvent = fourPiece.log.find((e) => e.kind === "start");
    const fourAtk = fourEvent?.kind === "start" ? fourEvent.units.find((u) => u.id === "A1")?.atk ?? 0 : 0;
    check("Bonus de set 4 pièces appliqué au combat", fourAtk >= baseAtk * 1.1);
    check("Équipement d'un artefact appartenant à autrui refusé", await rejects(equipArtifact(uid, "missing-artifact", card.id)));
    const countBeforeReplay = await prisma.artifact.count({ where: { userId: uid } });
    await getBattle(uid, win.id);
    await getBattle(uid, win.id);
    check("Lecture/replay ne recrée pas de butin", (await prisma.artifact.count({ where: { userId: uid } })) === countBeforeReplay);
    const legacy = await prisma.artifact.create({ data: { userId: uid, setKey: "one-piece", slot: "GANTS", rarity: "UR", mainStat: "critDamage", mainValue: 0.36, subStats: [{ stat: "crit", value: 0.025 }] } });
    const legacyView = (await getArtifactInventory(uid)).artifacts.find((item) => item.id === legacy.id);
    check("Ancien gant critique/dégâts crit et sous-stat conservés sans reroll", legacyView?.mainStat === "critDamage" && legacyView.mainValue === 0.36 && JSON.stringify(legacyView.subStats) === JSON.stringify([{ stat: "crit", value: 0.025 }]));
    let view = await startBattle(uid, dungeonKey(1), true);
    for (let i = 0; i < 300 && view.status === "RUNNING"; i++) {
      const choice = view.choices[0];
      view = await playAction(uid, view.id, { spell: choice.spell, target: choice.targets[0] });
    }
    check("Combat manuel terminé", view.status === "DONE");
    // Nouveaux donjons : distinguer univers d'histoire et clé du set (Fairy Tail).
    await prisma.storyProgress.create({ data: { userId: uid, universe: "fairy-tail", maxLevel: 10 } });
    check("Une fausse progression Fairy Tail ne débloque pas le donjon", !(await getDungeonAccess(uid))["fairy-tail"].unlocked);
    await prisma.storyProgress.create({ data: { userId: uid, universe: "grande-alchimie", maxLevel: 9 } });
    check("Grande Alchimie 9 insuffisant pour Fairy Tail", !(await getDungeonAccess(uid))["fairy-tail"].unlocked);
    // Équipement de test sur les seules cartes jetables, pour garantir la victoire.
    const strong = await getAttackTeam(uid);
    for (const c of strong) if (c) {
      await prisma.artifact.deleteMany({ where: { userId: uid, equippedCardId: c.id } });
      for (const [i, slot] of ARTIFACT_SLOTS.entries()) await prisma.artifact.create({ data: { userId: uid, equippedCardId: c.id, setKey: "one-piece", slot, rarity: "UR", mainStat: i === 0 ? "flatAttack" : "flatHp", mainValue: i === 0 ? 50000 : 200000 } });
    }
    for (const d of DUNGEONS.filter((d) => ["attack-on-titan", "demon-slayer", "fairy-tail"].includes(d.key))) {
      await prisma.storyProgress.upsert({ where: { userId_universe: { userId: uid, universe: d.storyKey } }, create: { userId: uid, universe: d.storyKey, maxLevel: 10 }, update: { maxLevel: 10 } });
      check(`${d.universe} débloqué par son histoire`, (await getDungeonAccess(uid))[d.key].unlocked);
      await prisma.dungeonProgress.create({ data: { userId: uid, dungeon: d.key, maxLevel: 2 } });
      const before = await prisma.artifact.count({ where: { userId: uid, setKey: d.key } });
      let fight = await startBattle(uid, dungeonKey(3, d.key), d.key === "fairy-tail");
      for (let i = 0; i < 100 && fight.status === "RUNNING"; i++) { const choice = fight.choices[0]; fight = await playAction(uid, fight.id, { spell: choice.spell, target: choice.targets[0] }); }
      check(`${d.universe} victoire réelle et deux raretés`, fight.winner === "A" && fight.loot?.artifacts?.map((a) => a.rarity).join(",") === "R,N");
      const after = await prisma.artifact.count({ where: { userId: uid, setKey: d.key } });
      check(`${d.universe} deux pièces enregistrées`, after - before === 2);
      await getBattle(uid, fight.id); await getBattle(uid, fight.id);
      check(`${d.universe} relecture sans double versement`, await prisma.artifact.count({ where: { userId: uid, setKey: d.key } }) === after);
      check(`${d.universe} progression indépendante`, (await prisma.dungeonProgress.findUniqueOrThrow({ where: { userId_dungeon: { userId: uid, dungeon: d.key } } })).maxLevel === 3);
      const even = await startBattle(uid, dungeonKey(4, d.key), false);
      const saved = await prisma.battle.findUniqueOrThrow({ where: { id: even.id }, select: { seed: true } });
      const expected = dungeonArtifactRarities(4, saved.seed);
      check(`${d.universe} butin pair conforme à la graine`, even.winner === "A" && JSON.stringify(even.loot?.artifacts?.map((a) => a.rarity)) === JSON.stringify(expected));
      check(`${d.universe} compte exact après le tirage bonus`, await prisma.artifact.count({ where: { userId: uid, setKey: d.key } }) === after + expected.length);

    }
    await prisma.dungeonProgress.update({ where: { userId_dungeon: { userId: uid, dungeon: "fairy-tail" } }, data: { maxLevel: 6 } });
    const materialWin = await startBattle(uid, dungeonKey(7, "fairy-tail"), false);
    const material = await prisma.resourceStock.findUnique({ where: { userId_key: { userId: uid, key: "cristal-de-magie" } } });
    check("Deux pièces mais un seul versement de matériaux", materialWin.loot?.artifacts?.length === 2 && materialWin.loot.resources["cristal-de-magie"] === 1 && material?.quantity === 1);

  } finally { await prisma.user.deleteMany({ where: { id: uid } }); }
  console.log(failures ? `\n${failures} vérification(s) en échec.` : "\nDonjon conforme.");
  process.exitCode = failures ? 1 : 0;
}
main().finally(() => prisma.$disconnect());
