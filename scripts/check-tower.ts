// Vérification de la Tour sur la vraie base (docs/specs/pvm.md) : étages identiques pour tous, déverrouillage un par un,
// Ryō au premier passage seulement, mode manuel jusqu'au bout, courbe de difficulté pour une équipe SR / SSR / UR.
// Joueur jetable, supprimé à la fin.
// Usage : npm run check:tower

import { BattleError, getTowerFloor, playAction, setAttackTeam, startBattle, towerLeaderboard } from "../src/lib/battles";
import { prisma } from "../src/lib/db";
import { floorRarities, towerRyo } from "../src/lib/tower";

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  if (!ok) failures++;
  console.log(`${ok ? "✓" : "✗"} ${label}${detail ? ` — ${detail}` : ""}`);
}
const rejects = (p: Promise<unknown>) => p.then(() => false, (e) => e instanceof BattleError);

async function main() {
  const uid = `twr-${Date.now()}`;
  const pulls = new Map<number, number>();
  await prisma.user.create({ data: { id: uid, name: uid, username: uid, email: `${uid}@test.local` } });
  try {
    const opening = await prisma.packOpening.create({ data: { userId: uid, lotSize: 5, pityTriggered: "NONE" } });
    const give = async (characterId: number) => {
      const before = await prisma.character.findUniqueOrThrow({ where: { id: characterId }, select: { pullCount: true } });
      if (!pulls.has(characterId)) pulls.set(characterId, before.pullCount);
      const k = await prisma.character.update({ where: { id: characterId }, data: { pullCount: { increment: 1 } }, select: { pullCount: true } });
      return (await prisma.card.create({ data: { ownerId: uid, characterId, finish: "NORMAL", serial: k.pullCount, rarityAtPull: "SR", packOpeningId: opening.id } })).id;
    };
    const top = async (rarity: "SR" | "SSR" | "UR", take: number) =>
      (await prisma.character.findMany({ where: { disabled: false, rarity }, take, orderBy: { favourites: "desc" }, select: { id: true } })).map((c) => c.id);
    const team = async (rarity: "SR" | "SSR" | "UR") => {
      const ids: string[] = [];
      for (const c of await top(rarity, 4)) ids.push(await give(c));
      await setAttackTeam(uid, ids);
    };

    await team("SR");
    check("Étage 2 verrouillé tant que le 1 n'est pas gagné", await rejects(startBattle(uid, "tower:2", false)));
    check("Étage hors limites refusé", await rejects(startBattle(uid, "tower:0", false)) && await rejects(startBattle(uid, "tower:501", false)));
    const money = async () => (await prisma.user.findUniqueOrThrow({ where: { id: uid }, select: { balance: true } })).balance;
    const base = await money();
    const a = await startBattle(uid, "tower:1", false), b = await startBattle(uid, "tower:1", false);
    check("Étage 1 : mêmes ennemis à chaque fois", JSON.stringify(Object.values(a.characters).slice(4)) === JSON.stringify(Object.values(b.characters).slice(4)));
    const rows = await prisma.battle.findMany({ where: { userId: uid }, orderBy: { createdAt: "asc" } });
    check("Combat enregistré en mode TOWER", rows.every((r) => r.mode === "TOWER"));

    // Premier passage : Ryō une seule fois
    let wins = 0;
    for (let i = 0; i < 20 && wins < 2; i++) {
      const r = await startBattle(uid, "tower:1", false);
      if (r.winner === "A") wins++;
    }
    check("Étage 1 gagné", (await getTowerFloor(uid)) === 1);
    check("Ryō versés une seule fois (premier passage)", (await money()) - base === towerRyo(1), `${(await money()) - base} Ryō`);
    check("Étage 2 déverrouillé", !(await rejects(startBattle(uid, "tower:2", false))));

    // Mode manuel jusqu'au bout
    let m = await startBattle(uid, "tower:1", true);
    check("Manuel : combat en cours en mode TOWER", m.status === "RUNNING" && m.mode === "TOWER");
    for (let i = 0; i < 400 && m.status === "RUNNING"; i++) m = await playAction(uid, m.id, null);
    check("Manuel : combat terminé", m.status === "DONE");
    const lb = await towerLeaderboard(1000);
    check("Classement : le joueur y figure", lb.some((r) => r.userId === uid && r.maxFloor >= 1));

    // Courbe de difficulté : victoires sur 20 combats par palier, avec une équipe SR / SSR / UR
    console.log("\nÉtage  raretés ennemies         SR    SSR    UR");
    await prisma.towerProgress.update({ where: { userId: uid }, data: { maxFloor: 500 } });
    const rates: Record<string, number[]> = { SR: [], SSR: [], UR: [] };
    const floors = [100, 125, 150, 175, 200, 250, 300, 400, 500];
    for (const kind of ["SR", "SSR", "UR"] as const) {
      await prisma.battleTeamSlot.deleteMany({ where: { team: { userId: uid } } });
      await team(kind);
      for (const f of floors) {
        let w = 0;
        for (let i = 0; i < 12; i++) w += (await startBattle(uid, `tower:${f}`, false)).winner === "A" ? 1 : 0;
        rates[kind].push(w / 12);
      }
    }
    floors.forEach((f, i) => console.log(`${String(f).padStart(5)}  ${floorRarities(f).join("/").padEnd(18)} ${["SR", "SSR", "UR"].map((k) => `${Math.round(rates[k][i] * 100)}%`.padStart(6)).join(" ")}`));
  } finally {
    for (const [characterId, count] of pulls) await prisma.character.update({ where: { id: characterId }, data: { pullCount: count } });
    await prisma.user.deleteMany({ where: { id: uid } });
  }
  console.log(failures === 0 ? "\nTour conforme." : `\n${failures} vérification(s) en échec.`);
  process.exitCode = failures === 0 ? 0 : 1;
}
main().finally(() => prisma.$disconnect());
