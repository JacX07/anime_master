// Vérification de l'éveil 1 à 3★ (docs/specs/pvm.md) : coûts purs, puis débit réel sur la base avec un joueur jetable.
// Usage : npm run check:awakening
import { AWAKEN_TOTAL, awakenCost, universeOfFranchise } from "../src/lib/awakening";
import { awakenCard } from "../src/lib/awaken";
import { BattleError } from "../src/lib/battles";
import { prisma } from "../src/lib/db";
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
  check("Étoile 4 refusée par le calcul", (() => { try { awakenCost("UR", 4, u); return false; } catch { return true; } })());

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
    while ((await prisma.card.findUniqueOrThrow({ where: { id: card } })).stars < 3) await awakenCard(uid, card);
    const total = (await prisma.resourceStock.findMany({ where: { userId: uid } })).reduce((s, r) => s + (1000 - r.quantity), 0);
    check("0→3★ : total dépensé = 200 (SSR)", total === 200, String(total));
    check("4★ refusée (raid requis)", await rejects(awakenCard(uid, card)));
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
