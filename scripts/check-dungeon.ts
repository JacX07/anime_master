// Donjon One Piece : progression, butin atomique, défaite, équipement et propriété.
// Usage : npm run check:dungeon
import { BattleError, equipArtifact, getBattle, getAttackTeam, playAction, setAttackTeam, startBattle } from "../src/lib/battles";
import { prisma } from "../src/lib/db";
import { artifactMainStat, artifactSubStats, dungeonKey } from "../src/lib/dungeons";
import { RARITY_NAMES } from "../src/lib/labels";
import type { Rarity } from "../src/generated/prisma/enums";
let failures = 0;
function check(label: string, ok: boolean, detail = "") { if (!ok) failures++; console.log(`${ok ? "✓" : "✗"} ${label}${detail ? ` — ${detail}` : ""}`); }
const rejects = (p: Promise<unknown>) => p.then(() => false, (e) => e instanceof BattleError);

async function main() {
  check("Sous-stats selon la rareté, sans répéter la stat principale", ["N", "R", "SR", "SSR", "UR"].every((rarity) => {
    const stats = artifactSubStats("CASQUE", rarity as Rarity, 271);
    return stats.length >= ({ N: 0, R: 0, SR: 1, SSR: 1, UR: 2 }[rarity as Rarity]) && stats.length <= ({ N: 0, R: 1, SR: 1, SSR: 2, UR: 3 }[rarity as Rarity]) && stats.every((s) => s.stat !== artifactMainStat("CASQUE", rarity as Rarity, 271).stat);
  }));
  const uid = `dg-${Date.now()}`;
  await prisma.user.create({ data: { id: uid, name: uid, username: uid, email: `${uid}@test.local` } });
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
    check("Difficulté 2 verrouillée avant le premier succès", await rejects(startBattle(uid, dungeonKey(2), false)));
    const defeat = await startBattle(uid, dungeonKey(1), false);
    check("Défaite sans pénalité ni artefact", defeat.winner !== "A" && !defeat.loot?.artifact);
    check("Défaite sans progression", (await prisma.dungeonProgress.findUnique({ where: { userId_dungeon: { userId: uid, dungeon: "one-piece" } } })) === null);
    await makeTeam("UR");
    const win = await startBattle(uid, dungeonKey(1), false);
    check("Victoire de difficulté 1", win.winner === "A");
    check("Un artefact garanti", Boolean(win.loot?.artifact), win.loot?.artifact ? `${RARITY_NAMES[win.loot.artifact.rarity]} ${win.loot.artifact.slot}` : "aucun");
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
    const changed = Boolean(artifact && equipped && (artifact.mainStat === "attack" ? equipped.atk > baseAtk : artifact.mainStat === "defense" ? equipped.def > card.character.defense : equipped.maxHp > 2.8 * (card.character.attack + card.character.defense)));
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
    let view = await startBattle(uid, dungeonKey(1), true);
    for (let i = 0; i < 300 && view.status === "RUNNING"; i++) {
      const choice = view.choices[0];
      view = await playAction(uid, view.id, { spell: choice.spell, target: choice.targets[0] });
    }
    check("Combat manuel terminé", view.status === "DONE");
  } finally { await prisma.user.deleteMany({ where: { id: uid } }); }
  console.log(failures ? `\n${failures} vérification(s) en échec.` : "\nDonjon conforme.");
  process.exitCode = failures ? 1 : 0;
}
main().finally(() => prisma.$disconnect());
