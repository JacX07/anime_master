// Vérification des duels (SPEC étape 4, §1 à §5) : combats calculés à la main, puis duels complets sur la vraie base
// avec des joueurs jetables (défi, acceptation, quiz, chrono, résolution, Elo, récompenses, limites, forfait, expiration).
// Usage : npm run check:duels   (Node 24)

import { prisma } from "../src/lib/db";
import { attackDamage, DUEL_ACCEPT_MS, DUEL_PLAY_MS, eloChange, modifyTeam, resolveCombat, type Fighter } from "../src/lib/duel-rules";
import { acceptDuel, answerQuestion, createDuel, currentQuestion, declineDuel, DuelError, startDefense, sweepDuels } from "../src/lib/duels";

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  if (!ok) failures++;
  console.log(`${ok ? "✓" : "✗"} ${label}${detail ? ` — ${detail}` : ""}`);
}
async function throws(fn: () => Promise<unknown>) {
  try {
    await fn();
    return false;
  } catch (e) {
    return e instanceof DuelError;
  }
}

const f = (type: Fighter["type"], attack: number, defense: number): Fighter => ({ characterId: 0, type, attack, defense });

function pureChecks() {
  // --- Modificateurs et bonus Cœur
  const [c1, c2, m] = modifyTeam([f("COEUR", 1000, 1000), f("COEUR", 500, 500), f("MYSTERE", 800, 800)]);
  check("Cœur : ATK × 0,70 × 1,1 (un autre Cœur), DEF × 1,3", c1.atk === 770 && c1.def === 1300 && c2.atk === 385 && c2.def === 650, `${c1.atk}/${c1.def} ${c2.atk}/${c2.def}`);
  check("Mystère avec deux Cœurs : ATK × 0,75 × 1,2 (bonus plafonné à +20 %)", m.atk === 720 && m.def === 800, `${m.atk}`);
  const three = modifyTeam([f("COEUR", 1000, 100), f("COEUR", 1000, 100), f("COEUR", 1000, 100)]);
  check("Trois Cœurs : +20 % chacun, pas +30 %", three.every((x) => x.atk === 840));
  const [co, ma, av] = modifyTeam([f("COMBAT", 1000, 1000), f("MAGIE", 800, 800), f("AVENTURE", 600, 600)]);
  check("Combat DEF × 0,75 ; Magie ATK × 0,85 ; Aventure inchangé", co.def === 750 && co.atk === 1000 && ma.atk === 680 && av.atk === 600 && av.def === 600);

  // --- Dégâts
  check("Combat : ×2 si tout est faux", attackDamage("COMBAT", 1000, 4) === 2000 && attackDamage("COMBAT", 1000, 3) === 750);
  check("Aventure : bornée entre 25 % et 75 %", attackDamage("AVENTURE", 600, 0) === 150 && attackDamage("AVENTURE", 600, 4) === 450 && attackDamage("AVENTURE", 600, 2) === 300);
  check("Sans erreur, pas de dégâts (hors Aventure)", attackDamage("MAGIE", 680, 0) === 0);

  // --- Combat complet calculé à la main (voir le détail dans le commentaire)
  // A : Combat 1000/750, Magie 680/800, Aventure 600/600 → 2 150 PV. B : Cœur 770/1300, Cœur 385/650, Mystère 720/800 → 2 750 PV.
  // A1 2000 → B 750 ; B1 193 → A 1957 ; A2 340 → B 410, soin 102 → A 2059 ; B2 385 → A 1674 ; A3 150 (plancher) → B 260 ; B3 540 → A 1134.
  const r = resolveCombat([f("COMBAT", 1000, 1000), f("MAGIE", 800, 800), f("AVENTURE", 600, 600)], [f("COEUR", 1000, 1000), f("COEUR", 500, 500), f("MYSTERE", 800, 800)], [4, 2, 0], [1, 4, 3]);
  const trace = r.turns.map((t) => `${t.side}${t.position}:${t.damage}${t.heal ? `+${t.heal}` : ""}→${t.hpA}/${t.hpB}`).join(" ");
  check("Combat à la main : PV max 2 150 / 2 750", r.maxA === 2150 && r.maxB === 2750);
  check(
    "Combat à la main : 6 attaques, A 1 134 PV, B 260 PV, A gagne",
    r.turns.length === 6 && r.hpA === 1134 && r.hpB === 260 && r.winner === "A" && trace === "A1:2000→2150/750 B1:193→1957/750 A2:340+102→2059/410 B2:385→1674/410 A3:150→1674/260 B3:540→1134/260",
    trace,
  );
  const ko = resolveCombat([f("COMBAT", 3000, 100), f("COMBAT", 1, 1), f("COMBAT", 1, 1)], [f("AVENTURE", 100, 1000), f("AVENTURE", 100, 1000), f("AVENTURE", 100, 1000)], [4, 0, 0], [0, 0, 0]);
  check("KO : l'équipe à 0 PV perd tout de suite, les attaques suivantes n'ont pas lieu", ko.turns.length === 1 && ko.hpB === 0 && ko.winner === "A" && ko.turns[0].damage === 3000);
  const same = [f("AVENTURE", 1000, 1000), f("AVENTURE", 1000, 1000), f("AVENTURE", 1000, 1000)];
  const draw = resolveCombat(same, same, [2, 2, 2], [2, 2, 2]);
  check("Égalité de pourcentage : match nul", draw.winner === null && draw.hpA === 1500 && draw.hpB === 1500);
  const heal = resolveCombat([f("MAGIE", 1000, 1000), f("AVENTURE", 1, 1), f("AVENTURE", 1, 1)], [f("AVENTURE", 1, 5000), f("AVENTURE", 1, 1), f("AVENTURE", 1, 1)], [4, 0, 0], [0, 0, 0]);
  check("Magie : soin plafonné aux PV max", heal.turns[0].heal === 0 && heal.hpA === heal.maxA);

  // --- Elo
  check("Elo : 1000 contre 1000, victoire +16 / défaite −16 / nul 0", eloChange(1000, 1000, 1) === 16 && eloChange(1000, 1000, 0) === -16 && eloChange(1000, 1000, 0.5) === 0);
  check("Elo : 1200 bat 1000 → +8", eloChange(1200, 1000, 1) === 8, `${eloChange(1200, 1000, 1)}`);
}

async function main() {
  pureChecks();

  const tag = `duel-${Date.now()}`;
  const old = new Date(Date.now() - 3 * 24 * 3600_000);
  const ids = ["a", "b", "c"].map((x) => `${tag}-${x}`);
  const [A, B, C] = ids;
  const pullBefore = new Map<number, number>();
  const chars = await prisma.character.findMany({ where: { disabled: false }, orderBy: { favourites: "desc" }, take: 6, select: { id: true } });
  try {
    const cardsOf: Record<string, string[]> = {};
    for (const id of ids) {
      await prisma.user.create({ data: { id, name: id, username: id, email: `${id}@test.local`, createdAt: old } });
      const openings = [];
      for (let i = 0; i < 20; i++) openings.push((await prisma.packOpening.create({ data: { userId: id, pityTriggered: "NONE" }, select: { id: true } })).id);
      cardsOf[id] = [];
      for (const [i, ch] of chars.entries()) {
        if (!pullBefore.has(ch.id)) pullBefore.set(ch.id, (await prisma.character.findUniqueOrThrow({ where: { id: ch.id }, select: { pullCount: true } })).pullCount);
        const c = await prisma.character.update({ where: { id: ch.id }, data: { pullCount: { increment: 1 } }, select: { pullCount: true, rarity: true } });
        cardsOf[id].push((await prisma.card.create({ data: { ownerId: id, characterId: ch.id, finish: "NORMAL", serial: c.pullCount, rarityAtPull: c.rarity, packOpeningId: openings[i] }, select: { id: true } })).id);
      }
    }
    const teamA = cardsOf[A].slice(0, 3);
    const teamB = cardsOf[B].slice(3, 6);
    const bal = async (id: string) => (await prisma.user.findUniqueOrThrow({ where: { id }, select: { balance: true } })).balance;
    const duelPay = async (id: string, duelId: string) => (await prisma.currencyLedger.aggregate({ where: { userId: id, refId: duelId, reason: "DUEL_REWARD" }, _sum: { amount: true } }))._sum.amount ?? 0;
    const elo = async (id: string) => (await prisma.user.findUniqueOrThrow({ where: { id }, select: { elo: true } })).elo;

    // --- Défi
    check("Équipe invalide (2 cartes, doublon, carte d'un autre) refusée", (await throws(() => createDuel(A, B, teamA.slice(0, 2)))) && (await throws(() => createDuel(A, B, [teamA[0], teamA[0], teamA[1]]))) && (await throws(() => createDuel(A, B, teamB))));
    check("Se défier soi-même refusé", await throws(() => createDuel(A, A, teamA)));
    const d1 = await createDuel(A, B, teamA);
    check("Défi créé, notification DUEL_RECEIVED", (await prisma.notification.count({ where: { userId: B, type: "DUEL_RECEIVED" } })) === 1);
    check("Le challenger ne peut pas accepter son propre défi", await throws(() => acceptDuel(A, d1, teamA)));

    // --- Acceptation et défense
    const t0 = new Date();
    await acceptDuel(B, d1, teamB, t0);
    check("Accepté : 6 cartes avec instantané des stats", (await prisma.duelSlot.count({ where: { duelId: d1 } })) === 6);
    check("Deuxième acceptation refusée", await throws(() => acceptDuel(B, d1, teamB)));
    await startDefense(A, d1, t0);
    await startDefense(A, d1, t0);
    check("Défense : 12 questions générées une seule fois", (await prisma.duelQuestion.count({ where: { duelId: d1, defenderId: A } })) === 12);
    const kinds = await prisma.duelQuestion.findMany({ where: { duelId: d1, defenderId: A }, orderBy: [{ slotPosition: "asc" }, { index: "asc" }], select: { kind: true, choices: true } });
    check("4 choix distincts par question (5 pour une Mystère)", kinds.every((q) => { const c = q.choices as string[]; return new Set(c).size === c.length && (c.length === 4 || c.length === 5); }), kinds.map((k) => k.kind).join(","));

    const q1 = await currentQuestion(A, d1, t0);
    check("La question servie ne contient pas la bonne réponse", !!q1 && !("correctIndex" in q1) && !JSON.stringify(q1).includes("correct"));
    const again = await currentQuestion(A, d1, new Date(t0.getTime() + 3000));
    check("Recharger renvoie la même question avec le temps restant", again?.id === q1!.id && again.remainingMs <= q1!.remainingMs - 3000 + 50);
    const row1 = await prisma.duelQuestion.findUniqueOrThrow({ where: { id: q1!.id } });
    const a1 = await answerQuestion(A, q1!.id, row1.correctIndex, new Date(t0.getTime() + 4000));
    check("Bonne réponse dans le temps : juste, et la bonne réponse arrive après", a1.correct && a1.correctIndex === row1.correctIndex);
    check("Une question ne reçoit qu'une réponse", await throws(() => answerQuestion(A, q1!.id, row1.correctIndex)));

    // Réponse trop tardive (le chrono du serveur fait foi)
    const q2 = await currentQuestion(A, d1, new Date(t0.getTime() + 5000));
    const row2 = await prisma.duelQuestion.findUniqueOrThrow({ where: { id: q2!.id } });
    const late = await answerQuestion(A, q2!.id, row2.correctIndex, new Date(t0.getTime() + 5000 + q2!.seconds * 1000 + 3000));
    check("Bonne réponse hors délai : comptée fausse", !late.correct);
    // Question servie puis abandonnée : comptée fausse au passage
    const q3 = await currentQuestion(A, d1, new Date(t0.getTime() + 60_000));
    const q4 = await currentQuestion(A, d1, new Date(t0.getTime() + 60_000 + 20_000));
    const row3 = await prisma.duelQuestion.findUniqueOrThrow({ where: { id: q3!.id } });
    check("Question sans réponse à temps : passée et comptée fausse", q4!.id !== q3!.id && row3.answeredAt !== null && row3.answerIndex === null);

    // A répond juste à tout le reste ; B se trompe sur tout
    let now = new Date(t0.getTime() + 81_000);
    for (let q = await currentQuestion(A, d1, now); q; q = await currentQuestion(A, d1, now)) {
      const row = await prisma.duelQuestion.findUniqueOrThrow({ where: { id: q.id } });
      await answerQuestion(A, q.id, row.correctIndex, now);
      now = new Date(now.getTime() + 1000);
    }
    check("A a terminé sa défense", !!(await prisma.duelDefense.findUniqueOrThrow({ where: { duelId_userId: { duelId: d1, userId: A } } })).finishedAt);
    check("Duel encore en cours tant que B n'a pas joué", (await prisma.duel.findUniqueOrThrow({ where: { id: d1 } })).status === "ACCEPTED");
    await startDefense(B, d1, now);
    for (let q = await currentQuestion(B, d1, now); q; q = await currentQuestion(B, d1, now)) {
      const row = await prisma.duelQuestion.findUniqueOrThrow({ where: { id: q.id } });
      await answerQuestion(B, q.id, (row.correctIndex + 1) % (row.choices as string[]).length, now);
      now = new Date(now.getTime() + 1000);
    }
    const done = await prisma.duel.findUniqueOrThrow({ where: { id: d1 } });
    const res = done.result as unknown as ReturnType<typeof resolveCombat>;
    check("Résolu : B s'est trompé partout, A gagne", done.status === "DONE" && done.winnerId === A, `${done.status} ${done.winnerId}`);
    // Le replay stocké = recalcul à partir des instantanés et des réponses
    const slots = await prisma.duelSlot.findMany({ where: { duelId: d1 }, orderBy: { position: "asc" } });
    const qs = await prisma.duelQuestion.findMany({ where: { duelId: d1 } });
    const err = (def: string) => [1, 2, 3].map((p) => qs.filter((q) => q.defenderId === def && q.slotPosition === p && q.answerIndex !== q.correctIndex).length);
    const recomputed = resolveCombat(slots.filter((s) => s.userId === A), slots.filter((s) => s.userId === B), err(B), err(A));
    check("Le combat stocké (replay) est exactement le combat recalculé", JSON.stringify(recomputed) === JSON.stringify(res));
    check("Erreurs de A : 2 (une tardive, une sans réponse) sur sa première carte adverse", JSON.stringify(err(A)) === "[2,0,0]", JSON.stringify(err(A)));
    check("Elo : +16 / −16 à 1000 contre 1000", (await elo(A)) === 1016 && (await elo(B)) === 984 && done.eloChangeChallenger === 16 && done.eloChangeOpponent === -16);
    check("Récompenses : 30 au gagnant, 10 au perdant", (await duelPay(A, d1)) === 30 && (await duelPay(B, d1)) === 10, `${await duelPay(A, d1)} / ${await duelPay(B, d1)}`);
    check("Succès duel_win_1 débloqué", (await prisma.userAchievement.count({ where: { userId: A, key: "duel_win_1" } })) === 1);
    check("Lignes DUEL_REWARD dans le journal", (await prisma.currencyLedger.count({ where: { refId: d1, reason: "DUEL_REWARD" } })) === 2);

    // --- Limite de 2 duels récompensés par jour contre le même adversaire
    async function quickDuel(answerA: boolean, answerB: boolean) {
      const id = await createDuel(A, B, teamA);
      let t = new Date();
      await acceptDuel(B, id, teamB, t);
      for (const [who, right] of [[A, answerA], [B, answerB]] as const) {
        await startDefense(who, id, t);
        for (let q = await currentQuestion(who, id, t); q; q = await currentQuestion(who, id, t)) {
          const row = await prisma.duelQuestion.findUniqueOrThrow({ where: { id: q.id } });
          await answerQuestion(who, q.id, right ? row.correctIndex : (row.correctIndex + 1) % (row.choices as string[]).length, t);
          t = new Date(t.getTime() + 500);
        }
      }
      return prisma.duel.findUniqueOrThrow({ where: { id } });
    }
    const d2 = await quickDuel(true, true);
    const gainA = d2.winnerId === null ? 15 : d2.winnerId === A ? 30 : 10;
    check("Deuxième duel du jour : récompensé selon le résultat (30 / 15 / 10)", d2.rewarded && (await duelPay(A, d2.id)) === gainA, `${d2.winnerId} ${await duelPay(A, d2.id)}`);
    const d3 = await quickDuel(true, false);
    check("Troisième duel contre le même adversaire : compte pour l'Elo mais ne rapporte rien", !d3.rewarded && d3.winnerId === A && (await duelPay(A, d3.id)) === 0 && (await duelPay(B, d3.id)) === 0 && d3.eloChangeChallenger !== 0);

    // --- 5 duels lancés par jour (3 déjà lancés)
    await createDuel(A, B, teamA);
    await createDuel(A, B, teamA);
    check("Sixième défi du jour refusé", await throws(() => createDuel(A, B, teamA)));
    const both = await Promise.allSettled([createDuel(B, C, teamB), createDuel(B, C, teamB), createDuel(B, C, teamB), createDuel(B, C, teamB), createDuel(B, C, teamB), createDuel(B, C, teamB)]);
    check("Défis simultanés : jamais plus de 5", both.filter((r) => r.status === "fulfilled").length <= 5, `${both.filter((r) => r.status === "fulfilled").length}`);

    // --- Refus, expiration, forfait
    const d4 = await createDuel(C, A, cardsOf[C].slice(0, 3));
    await declineDuel(A, d4);
    check("Refus : DECLINED et notification", (await prisma.duel.findUniqueOrThrow({ where: { id: d4 } })).status === "DECLINED" && (await prisma.notification.count({ where: { userId: C, type: "DUEL_DECLINED" } })) === 1);
    const d5 = await createDuel(C, A, cardsOf[C].slice(0, 3));
    await sweepDuels(new Date(Date.now() + DUEL_ACCEPT_MS + 1000));
    check("Défi sans réponse à temps : EXPIRED", (await prisma.duel.findUniqueOrThrow({ where: { id: d5 } })).status === "EXPIRED");

    const d6 = await createDuel(C, A, cardsOf[C].slice(0, 3));
    const t6 = new Date();
    await acceptDuel(A, d6, teamA, t6);
    await sweepDuels(new Date(t6.getTime() + DUEL_PLAY_MS + 1000));
    const e6 = await prisma.duel.findUniqueOrThrow({ where: { id: d6 } });
    check("Personne n'a joué : expiré sans Elo ni récompense", e6.status === "EXPIRED" && e6.eloChangeChallenger === null && !e6.rewarded);

    const d7 = await createDuel(C, A, cardsOf[C].slice(0, 3));
    let t7 = new Date();
    await acceptDuel(A, d7, teamA, t7);
    await startDefense(C, d7, t7);
    for (let q = await currentQuestion(C, d7, t7); q; q = await currentQuestion(C, d7, t7)) {
      await answerQuestion(C, q.id, 0, t7);
      t7 = new Date(t7.getTime() + 500);
    }
    await startDefense(A, d7, t7);
    const [eloC, eloA] = [await elo(C), await elo(A)];
    await sweepDuels(new Date(t7.getTime() + DUEL_PLAY_MS + 1000));
    const e7 = await prisma.duel.findUniqueOrThrow({ where: { id: d7 } });
    check("Défense commencée mais pas finie à temps : forfait, C gagne", e7.status === "FORFEIT" && e7.winnerId === C);
    check("Forfait : 30 au gagnant, 0 au perdant, Elo compté comme une défaite", (await duelPay(C, d7)) === 30 && (await duelPay(A, d7)) === 0 && (await elo(C)) > eloC && (await elo(A)) < eloA, `${await duelPay(C, d7)}`);
    await sweepDuels(new Date(t7.getTime() + DUEL_PLAY_MS + 2000));
    check("Balayage répété : aucun double paiement", (await prisma.currencyLedger.count({ where: { refId: d7, reason: "DUEL_REWARD" } })) === 1);

    for (const id of ids) {
      const sum = (await prisma.currencyLedger.aggregate({ where: { userId: id }, _sum: { amount: true } }))._sum.amount ?? 0;
      check(`Solde = somme du journal (${id.slice(-1)})`, sum === (await bal(id)));
    }
  } finally {
    for (const [characterId, count] of pullBefore) await prisma.character.update({ where: { id: characterId }, data: { pullCount: count } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
  }
  console.log(failures === 0 ? "\nDuels conformes." : `\n${failures} vérification(s) en échec.`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main().finally(() => prisma.$disconnect());
