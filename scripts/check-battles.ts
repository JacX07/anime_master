// Vérification des combats côté serveur sur la vraie base (docs/specs/combat.md §10) : équipe d'attaque, combat automatique,
// mode manuel (choix refusés, double clic, journal par morceaux), abandon, balayage à 24 h, carte cédée, vente groupée.
// Joueurs jetables, supprimés à la fin.
// Usage : npm run check:battles

import { battle, seededRandom, type Action, type BattleEvent } from "../src/lib/battle";
import { abandonBattle, BattleError, getAttackTeam, getBattle, playAction, setAttackTeam, startBattle, type BattleTeams } from "../src/lib/battles";
import { prisma } from "../src/lib/db";
import { previewDuplicateSale } from "../src/lib/wallet";

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  if (!ok) failures++;
  console.log(`${ok ? "✓" : "✗"} ${label}${detail ? ` — ${detail}` : ""}`);
}
const rejects = (p: Promise<unknown>) => p.then(() => false, (e) => e instanceof BattleError);
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

async function main() {
  const stamp = Date.now(), uid = `btl-${stamp}`, other = `btl-${stamp}-b`;
  const pulls = new Map<number, number>();
  for (const id of [uid, other]) await prisma.user.create({ data: { id, name: id, username: id, email: `${id}@test.local` } });
  try {
    const opening = await prisma.packOpening.create({ data: { userId: uid, lotSize: 5, pityTriggered: "NONE" } });
    const give = async (owner: string, characterId: number) => {
      const before = await prisma.character.findUniqueOrThrow({ where: { id: characterId }, select: { pullCount: true } });
      if (!pulls.has(characterId)) pulls.set(characterId, before.pullCount);
      const k = await prisma.character.update({ where: { id: characterId }, data: { pullCount: { increment: 1 } }, select: { pullCount: true } });
      return (await prisma.card.create({ data: { ownerId: owner, characterId, finish: "NORMAL", serial: k.pullCount, rarityAtPull: "SR", packOpeningId: opening.id } })).id;
    };
    const chars = await prisma.character.findMany({ where: { disabled: false, rarity: "SR" }, take: 6, orderBy: { id: "asc" }, select: { id: true } });
    const cards: string[] = [];
    for (const c of chars) cards.push(await give(uid, c.id));
    const foreign = await give(other, chars[0].id);

    // Équipe d'attaque
    check("Combat refusé sans équipe", await rejects(startBattle(uid, "test", false)));
    check("Équipe refusée : 3 cartes", await rejects(setAttackTeam(uid, cards.slice(0, 3))));
    check("Équipe refusée : carte en double", await rejects(setAttackTeam(uid, [cards[0], cards[0], cards[1], cards[2]])));
    check("Équipe refusée : carte d'un autre joueur", await rejects(setAttackTeam(uid, [foreign, ...cards.slice(0, 3)])));
    await setAttackTeam(uid, cards.slice(0, 4));
    await setAttackTeam(uid, [cards[3], cards[2], cards[1], cards[0]]);
    const team = await getAttackTeam(uid);
    check("Équipe enregistrée dans l'ordre choisi (et remplaçable)", same(team.map((c) => c?.id), [cards[3], cards[2], cards[1], cards[0]]));
    check("Adversaire inconnu refusé", await rejects(startBattle(uid, "nope", false)));

    // Combat automatique
    const auto = await startBattle(uid, "test", false);
    const row = await prisma.battle.findUniqueOrThrow({ where: { id: auto.id } });
    const teams = row.teams as unknown as BattleTeams;
    const recomputed = battle(teams.A, teams.B, seededRandom(row.seed));
    const last = auto.log[auto.log.length - 1];
    check("Automatique : combat terminé et journal complet", auto.status === "DONE" && last?.kind === "end" && last.winner === auto.winner && row.winner === auto.winner);
    check("Automatique : la graine enregistrée redonne le même journal", same(recomputed.log, row.log));
    check("Automatique : noms et images des 8 personnages fournis", Object.keys(auto.characters).length === 8);
    check("Replay : getBattle renvoie le journal enregistré", same((await getBattle(uid, auto.id)).log, auto.log));
    check("Combat d'un autre joueur introuvable", await rejects(getBattle(other, auto.id)));

    // Mode manuel
    const manual = await startBattle(uid, "test", true);
    check("Manuel : un seul combat en cours à la fois", await rejects(startBattle(uid, "test", true)));
    check("Manuel : c'est une carte du joueur qui doit agir", manual.actor?.startsWith("A") === true && manual.choices.length > 0);
    check("Manuel : action impossible refusée", await rejects(playAction(uid, manual.id, { spell: "base", target: "A1" })));
    let view = manual;
    const pieces: BattleEvent[] = [...manual.log];
    // Double clic : deux fois le même choix en même temps, un seul passe
    const first: Action = { spell: "base", target: view.choices[0].targets[0] };
    const both = await Promise.allSettled([playAction(uid, manual.id, first), playAction(uid, manual.id, first)]);
    const passed = both.filter((r) => r.status === "fulfilled");
    check("Manuel : double clic joué une seule fois", passed.length === 1, `${passed.length} passé(s)`);
    view = (passed[0] as PromiseFulfilledResult<typeof view>).value;
    pieces.push(...view.log);
    let guard = 0;
    while (view.status === "RUNNING" && guard++ < 500) {
      const c = view.choices[Math.floor(Math.random() * view.choices.length)];
      view = await playAction(uid, manual.id, { spell: c.spell, target: c.targets[Math.floor(Math.random() * c.targets.length)] });
      pieces.push(...view.log);
    }
    const done = await prisma.battle.findUniqueOrThrow({ where: { id: manual.id } });
    check("Manuel : joué jusqu'au bout", view.status === "DONE" && done.status === "DONE" && done.winner === view.winner);
    check("Manuel : les morceaux de journal mis bout à bout = journal enregistré", same(pieces, done.log));
    check("Manuel : plus d'action après la fin", await rejects(playAction(uid, manual.id, first)));

    // Abandon et balayage
    const quit = await startBattle(uid, "test", true);
    await abandonBattle(uid, quit.id);
    const quitRow = await prisma.battle.findUniqueOrThrow({ where: { id: quit.id } });
    check("Abandon : compté comme perdu", quitRow.status === "ABANDONED" && quitRow.winner === "B");
    const old = await startBattle(uid, "test", true);
    await prisma.battle.update({ where: { id: old.id }, data: { createdAt: new Date(Date.now() - 25 * 3600 * 1000) } });
    const swept = await getBattle(uid, old.id);
    check("Combat manuel ouvert depuis plus de 24 h : abandonné", swept.status === "ABANDONED" && swept.winner === "B");

    // Carte cédée : retirée de l'équipe
    await prisma.card.update({ where: { id: cards[0] }, data: { ownerId: other } });
    const after = await getAttackTeam(uid);
    check("Carte cédée retirée de l'équipe", after[3] === null && after.filter(Boolean).length === 3);
    check("Combat refusé avec une équipe incomplète", await rejects(startBattle(uid, "test", false)));

    // Vente groupée : une carte éveillée n'est jamais vendue comme doublon
    const twin = await give(uid, chars[5].id);
    await prisma.card.updateMany({ where: { id: { in: [twin, cards[5]] } }, data: { stars: 1 } });
    const protectedCount = (await previewDuplicateSale(uid, ["SR"])).count;
    await prisma.card.updateMany({ where: { id: { in: [twin, cards[5]] } }, data: { stars: 0 } });
    const freeCount = (await previewDuplicateSale(uid, ["SR"])).count;
    check("Vente groupée : les cartes éveillées sont gardées", protectedCount === 0 && freeCount === 1, `${protectedCount} puis ${freeCount}`);
  } finally {
    for (const [characterId, count] of pulls) await prisma.character.update({ where: { id: characterId }, data: { pullCount: count } });
    await prisma.user.deleteMany({ where: { id: { in: [uid, other] } } });
  }
  console.log(failures === 0 ? "\nCombats conformes." : `\n${failures} vérification(s) en échec.`);
  process.exitCode = failures === 0 ? 0 : 1;
}
main().finally(() => prisma.$disconnect());
