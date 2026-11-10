// Vérification de l'éveil 1 à 3★ (docs/specs/pvm.md) : coûts purs, puis débit réel sur la base avec un joueur jetable.
// Usage : npm run check:awakening
import { AWAKEN_TOTAL, awakenCost, canAwaken, universeOfFranchise } from "../src/lib/awakening";
import { awakenCard } from "../src/lib/awaken";
import { BattleError } from "../src/lib/battles";
import { prisma } from "../src/lib/db";
import { RAID_RESOURCE } from "../src/lib/raid";
import { COMMON_RESOURCE, UNIVERSES } from "../src/lib/story";
import type { Rarity } from "../src/generated/prisma/enums";

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  if (!ok) failures++;
  console.log(`${ok ? "✓" : "✗"} ${label}${detail ? ` — ${detail}` : ""}`);
}
const sum = (c: { quantity: number }[]) => c.reduce((s, x) => s + x.quantity, 0);
const rejects = (p: Promise<unknown>) => p.then(() => false, (e) => e instanceof BattleError);

async function main() {
  const u = UNIVERSES[0];
  for (const r of Object.keys(AWAKEN_TOTAL) as Rarity[]) {
    const total = [1, 2, 3].reduce((s, k) => s + sum(awakenCost(r, k, u)), 0);
    check(`${r} avec univers : 0→3★ coûte ${AWAKEN_TOTAL[r]}`, total === AWAKEN_TOTAL[r], String(total));
    const solo = [1, 2, 3].map((k) => awakenCost(r, k, null));
    check(`${r} sans univers : 60 % du total, ressource commune seule`, solo.flat().every((c) => c.key === COMMON_RESOURCE) && solo.reduce((s, c) => s + sum(c), 0) === Math.round(AWAKEN_TOTAL[r] * 0.6));
  }
  check("UR 1★ d'un univers : moitié commune, moitié univers", JSON.stringify(awakenCost("UR", 1, u)) === JSON.stringify([{ key: COMMON_RESOURCE, quantity: 40 }, { key: u.resource, quantity: 40 }]));
  check("Étoiles 4 et 5 : SSR 60 / 120 cœurs, UR 120 / 240", [4, 5].map((k) => awakenCost("SSR", k, u)[0].quantity).join() === "60,120" && [4, 5].map((k) => awakenCost("UR", k, u)[0].quantity).join() === "120,240" && awakenCost("UR", 4, u)[0].key === RAID_RESOURCE);
  check("N, R et SR s'arrêtent à 3★", !canAwaken("SR", 4) && canAwaken("SR", 3) && canAwaken("SSR", 5) && !canAwaken("UR", 6));

  const uid = `awk-${Date.now()}`;
  await prisma.user.create({ data: { id: uid, name: uid, username: uid, email: `${uid}@test.local` } });
  try {
    const opening = await prisma.packOpening.create({ data: { userId: uid, lotSize: 5, pityTriggered: "NONE" } });
    const chars = await prisma.character.findMany({ where: { disabled: false, rarity: "SSR", mainMedia: { franchiseId: { in: u.franchiseIds } } }, take: 1, select: { id: true, mainMedia: { select: { franchiseId: true } } } });
    const ch = chars[0];
    const mk = async (serial: number) => (await prisma.card.create({ data: { ownerId: uid, characterId: ch.id, finish: "NORMAL", serial: 9000 + serial + Math.floor(Math.random() * 1e6), rarityAtPull: "SSR", packOpeningId: opening.id } })).id;
    const card = await mk(1);
    check("Univers de la carte retrouvé", universeOfFranchise(ch.mainMedia?.franchiseId ?? null)?.key === u.key);
    check("Sans ressources : refusé, aucune étoile", (await rejects(awakenCard(uid, card))) && (await prisma.card.findUniqueOrThrow({ where: { id: card } })).stars === 0);
    await prisma.resourceStock.createMany({ data: [{ userId: uid, key: COMMON_RESOURCE, quantity: 1000 }, { userId: uid, key: u.resource, quantity: 1000 }] });
    const results = await Promise.allSettled([awakenCard(uid, card), awakenCard(uid, card)]);
    const stars = (await prisma.card.findUniqueOrThrow({ where: { id: card } })).stars;
    const left = (await prisma.resourceStock.findMany({ where: { userId: uid } })).reduce((s, r) => s + (1000 - r.quantity), 0);
    const expected = [1, 2].slice(0, stars).reduce((s, k) => s + sum(awakenCost("SSR", k, u)), 0);
    check("Deux clics simultanés : chaque étoile gagnée est payée une seule fois", stars >= 1 && stars === results.filter((r) => r.status === "fulfilled").length && left === expected, `${stars}★, ${left} dépensés`);
    // Écran périmé ou double clic : l'étoile attendue ne correspond plus, rien n'est payé
    const starsNow = (await prisma.card.findUniqueOrThrow({ where: { id: card } })).stars;
    const stockNow = (await prisma.resourceStock.findMany({ where: { userId: uid } })).reduce((n, r) => n + r.quantity, 0);
    if (starsNow < 3) {
      check("Étoile attendue périmée : refusé, rien de payé", (await rejects(awakenCard(uid, card, starsNow - 1))) && (await prisma.card.findUniqueOrThrow({ where: { id: card } })).stars === starsNow && (await prisma.resourceStock.findMany({ where: { userId: uid } })).reduce((n, r) => n + r.quantity, 0) === stockNow);
      check("Étoile attendue exacte : accepté", !(await rejects(awakenCard(uid, card, starsNow))) && (await prisma.card.findUniqueOrThrow({ where: { id: card } })).stars === starsNow + 1);
    }
    while ((await prisma.card.findUniqueOrThrow({ where: { id: card } })).stars < 3) await awakenCard(uid, card);
    const total = (await prisma.resourceStock.findMany({ where: { userId: uid } })).reduce((s, r) => s + (1000 - r.quantity), 0);
    check("0→3★ : total dépensé = 200 (SSR)", total === 200, String(total));
    // Étoiles 4 et 5 (v0.3.0) : cœurs seulement ; un doublon facultatif divise leur coût par 2
    check("4★ sans cœurs : refusée", await rejects(awakenCard(uid, card)) && (await prisma.card.findUniqueOrThrow({ where: { id: card } })).stars === 3);
    await prisma.resourceStock.create({ data: { userId: uid, key: RAID_RESOURCE, quantity: 500 } });
    const locked = await mk(3);
    await prisma.card.update({ where: { id: locked }, data: { locked: true } });
    const inTeamCard = await mk(4);
    await prisma.battleTeam.create({ data: { userId: uid, kind: "ATTACK", slots: { create: [{ position: 1, cardId: inTeamCard }] } } });
    check("Doublon demandé mais seulement verrouillé ou en équipe : refusé, rien débité", (await rejects(awakenCard(uid, card, undefined, true))) && (await prisma.resourceStock.findUniqueOrThrow({ where: { userId_key: { userId: uid, key: RAID_RESOURCE } } })).quantity === 500);
    const dup = await mk(5);
    const r4 = await awakenCard(uid, card, undefined, true);
    check("4★ avec doublon : 30 cœurs (60 ÷ 2), doublon consommé", r4.stars === 4 && r4.consumed && (await prisma.resourceStock.findUniqueOrThrow({ where: { userId_key: { userId: uid, key: RAID_RESOURCE } } })).quantity === 470 && (await prisma.card.findUnique({ where: { id: dup } })) === null);
    const r5 = await awakenCard(uid, card);
    check("5★ sans doublon : 120 cœurs, aucune carte consommée", r5.stars === 5 && !r5.consumed && (await prisma.resourceStock.findUniqueOrThrow({ where: { userId_key: { userId: uid, key: RAID_RESOURCE } } })).quantity === 350);
    check("Les cartes verrouillée et d'équipe sont intactes", (await prisma.card.count({ where: { id: { in: [locked, inTeamCard] } } })) === 2);
    check("Au-delà de 5★ : refusé", await rejects(awakenCard(uid, card)));
    const other = `${uid}-b`;
    await prisma.user.create({ data: { id: other, name: other, username: other, email: `${other}@test.local` } });
    check("Carte d'un autre joueur refusée", await rejects(awakenCard(other, await mk(2))));
    await prisma.user.delete({ where: { id: other } });
  } finally {
    await prisma.user.delete({ where: { id: uid } }).catch(() => {});
  }
  console.log(failures ? `\n${failures} échec(s)` : "\nÉveil conforme.");
  process.exit(failures ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
