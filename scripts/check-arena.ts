// Arène live 4v4 : file d'attente, appariement par Elo, perspective, chrono, fantôme, forfait et Elo.
// Usage : npm run check:arena (Node 24)
import { prisma } from "../src/lib/db";
import { setAttackTeam, setTeam } from "../src/lib/battles";
import { arenaEnqueue, arenaForfeit, arenaMatchWindow, arenaPlay, arenaState, arenaView, ARENA_ACTION_MS, ARENA_GHOST_AFTER_MS, swapSides } from "../src/lib/arena";
import type { Rarity } from "../src/generated/prisma/enums";

let failures = 0;
function check(label: string, ok: boolean, detail = "") { if (!ok) failures++; console.log(`${ok ? "✓" : "✗"} ${label}${detail ? ` — ${detail}` : ""}`); }

const stamp = Date.now();
const users: string[] = [];
let serial = 930000 + Math.floor(Math.random() * 50000);
async function makePlayer(tag: string, elo = 1000) {
  const id = `ar-${tag}-${stamp}`;
  users.push(id);
  await prisma.user.create({ data: { id, name: id, username: id, email: `${id}@test.local`, elo } });
  const opening = await prisma.packOpening.create({ data: { userId: id, lotSize: 4, pityTriggered: "NONE" } });
  const mix: [Rarity, number][] = [["SSR", 2], ["SR", 2]];
  const ids: string[] = [];
  const used = new Set<number>();
  for (const [rarity, take] of mix) {
    const chars = await prisma.character.findMany({ where: { disabled: false, rarity, id: { notIn: [...used] } }, take, orderBy: { id: "asc" }, select: { id: true } });
    for (const c of chars) { used.add(c.id); ids.push((await prisma.card.create({ data: { ownerId: id, characterId: c.id, finish: "NORMAL", serial: serial++, rarityAtPull: rarity, packOpeningId: opening.id } })).id); }
  }
  await setAttackTeam(id, ids);
  await setTeam(id, "DEFENSE", ids);
  return id;
}

async function main() {
  check("Fenêtre d'Elo élargie avec l'attente", arenaMatchWindow(0) === 150 && arenaMatchWindow(10_000) === 200 && arenaMatchWindow(35_000) === 300);
  check("Inversion des camps", JSON.stringify(swapSides({ first: "A", units: ["A0", "B3"], w: { "A1:special": 2, B0: 1 } })) === JSON.stringify({ first: "B", units: ["B0", "A3"], w: { "B1:special": 2, A0: 1 } }));
  const t0 = new Date();
  try {
    const p1 = await makePlayer("a"), p2 = await makePlayer("b"), p3 = await makePlayer("c", 1700);
    const m1 = await arenaEnqueue(p1, t0);
    check("Un seul joueur : en file", (await arenaState(p1, 0, t0))?.status === "QUEUED");
    check("Deuxième mise en file : même match", (await arenaEnqueue(p1, t0)) === m1);
    const far = await arenaEnqueue(p3, t0);
    check("Elo trop éloigné : pas d'appariement", (await arenaState(p3, 0, t0))?.status === "QUEUED" && far !== m1);
    await arenaForfeit(p3, far, t0);
    check("Quitter la file supprime l'attente", (await arenaState(p3, 0, t0)) === null);
    const m2 = await arenaEnqueue(p2, t0);
    check("Elo proche : appariement immédiat", m2 === m1);
    const a = await arenaState(p1, 0, t0), b = await arenaState(p2, 0, t0);
    check("Les deux joueurs voient le match en cours", a?.status === "RUNNING" && b?.status === "RUNNING");
    check("Chacun se voit en A", a?.me.name === p1 && b?.me.name === p2 && a?.opponent?.name === p2 && b?.opponent?.name === p1);
    const first = a!.myTurn ? a! : b!;
    const second = a!.myTurn ? b! : a!;
    check("Un seul joueur a la main", first.myTurn && !second.myTurn && first.choices.length > 0 && second.choices.length === 0);
    check("Le journal débute par la même équipe vue en miroir", a!.log[0].kind === "start" && JSON.stringify(swapSides(a!.log[0])) === JSON.stringify(b!.log[0]));
    const mover = a!.myTurn ? p1 : p2;
    const other = mover === p1 ? p2 : p1;
    const choice = first.choices[0];
    let rejected = false;
    try { await arenaPlay(other, m1, { spell: choice.spell, target: choice.targets[0] }, first.steps, t0); } catch { rejected = true; }
    check("Jouer hors de son tour est refusé", rejected);
    const after = await arenaPlay(mover, m1, { spell: choice.spell, target: choice.targets[0] }, first.steps, t0);
    check("Action enregistrée", after.steps > first.steps && after.log.length > 0);
    let stale = false;
    try { await arenaPlay(mover, m1, { spell: choice.spell, target: choice.targets[0] }, first.steps, t0); } catch { stale = true; }
    check("Action rejouée avec une version périmée refusée", stale);
    // Chrono : le joueur qui doit jouer est absent, l'automatique joue à sa place après 20 s
    const late = new Date(t0.getTime() + ARENA_ACTION_MS + 1000);
    const viewMover = await arenaState(mover, 0, late), viewOther = await arenaState(other, 0, late);
    const row = await prisma.arenaMatch.findUniqueOrThrow({ where: { id: m1 } });
    check("Chrono expiré : l'automatique joue", (viewMover?.steps ?? 0) > after.steps || (viewOther?.steps ?? 0) > after.steps, `steps ${row.steps}`);
    check("Expiration comptée", row.missedA + row.missedB >= 1);
    // Forfait
    await arenaForfeit(p1, m1, late);
    const done = await arenaView(p1, m1, 0, late);
    check("Forfait : défaite et Elo en baisse", done.status === "DONE" && done.winner === "B" && (done.eloChange ?? 0) < 0, `Δ ${done.eloChange}`);
    const doneB = await arenaView(p2, m1, 0, late);
    check("L'adversaire gagne, vu en A", doneB.winner === "A" && (doneB.eloChange ?? 0) > 0, `Δ ${doneB.eloChange}`);
    const e1 = await prisma.user.findUniqueOrThrow({ where: { id: p1 }, select: { elo: true } }), e2 = await prisma.user.findUniqueOrThrow({ where: { id: p2 }, select: { elo: true } });
    check("Elo mis à jour une seule fois", e1.elo === 1000 + done.eloChange! && e2.elo === 1000 + doneB.eloChange!, `${e1.elo} / ${e2.elo}`);
    // Revanche dans les 24 h : gain divisé par 2
    const t1 = new Date(late.getTime() + 1000);
    await arenaEnqueue(p1, t1); await arenaEnqueue(p2, t1);
    const m3 = (await arenaState(p1, 0, t1))!;
    await arenaForfeit(p1, m3.id, t1);
    const rematch = await arenaView(p2, m3.id, 0, t1);
    check("Revanche dans les 24 h : gain réduit", (rematch.eloChange ?? 0) > 0 && rematch.eloChange! < (doneB.eloChange ?? 0) + 1, `Δ ${rematch.eloChange} (avant ${doneB.eloChange})`);
    // Fantôme : après 30 s sans adversaire
    const t2 = new Date(t1.getTime() + 5000);
    await arenaEnqueue(p1, t2);
    check("Avant 30 s : toujours en file", (await arenaState(p1, 0, new Date(t2.getTime() + 10_000)))?.status === "QUEUED");
    const g = await arenaState(p1, 0, new Date(t2.getTime() + ARENA_GHOST_AFTER_MS + 1));
    check("Après 30 s : équipe fantôme", g?.status === "RUNNING" && g.opponent !== null);
    const ghostRow = await prisma.arenaMatch.findFirstOrThrow({ where: { playerAId: p1, status: "RUNNING" } });
    check("Match fantôme marqué", ghostRow.ghost && ghostRow.playerBId === p2);
    check("Le joueur fantôme ne voit pas ce match", (await arenaState(p2, 0, t2)) === null || (await arenaState(p2, 0, t2))?.id !== ghostRow.id);
    // Partie complète contre le fantôme : l'automatique joue pour moi si je ne fais rien
    let t = new Date(t2.getTime() + ARENA_GHOST_AFTER_MS + 1);
    let v = await arenaView(p1, ghostRow.id, 0, t);
    for (let i = 0; i < 300 && v.status === "RUNNING"; i++) { t = new Date(t.getTime() + ARENA_ACTION_MS + 1000); v = await arenaView(p1, ghostRow.id, 0, t); }
    check("Joueur absent : le match va à son terme (forfait après 3 expirations)", v.status === "DONE");
    const ghostElo = await prisma.user.findUniqueOrThrow({ where: { id: p2 }, select: { elo: true } });
    check("L'Elo du joueur fantôme ne change pas", ghostElo.elo === e2.elo + (rematch.eloChange ?? 0), `${ghostElo.elo}`);
    check("Perte d'Elo contre un fantôme plafonnée à 16", (v.eloChange ?? 0) >= -16 && (v.eloChange ?? 0) <= 0, `Δ ${v.eloChange}`);
  } finally {
    await prisma.user.deleteMany({ where: { id: { in: users } } });
  }
  console.log(failures ? `\n${failures} vérification(s) en échec.` : "\nArène conforme.");
  process.exitCode = failures ? 1 : 0;
}
main().finally(() => prisma.$disconnect());
