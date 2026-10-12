// Vérification des lots ×5 et ×10 sur la vraie base (SPEC étape 4 bis, §3), avec un joueur jetable.
// Usage : npm run check:bulk   (Node 24)

import { prisma } from "../src/lib/db";
import { NoPackAvailableError, openPack } from "../src/lib/packs";
import { SSR_PITY, UR_PITY } from "../src/lib/pull";

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  if (!ok) failures++;
  console.log(`${ok ? "✓" : "✗"} ${label}${detail ? ` — ${detail}` : ""}`);
}

async function main() {
  const id = `bulk-${Date.now()}`;
  await prisma.user.create({ data: { id, name: id, username: id, email: `${id}@test.local`, crystals: 50 } });
  const pulls = new Map<number, number>();
  const note = (cards: { characterId: number; serial: number }[]) => {
    for (const c of cards) if (!pulls.has(c.characterId)) pulls.set(c.characterId, c.serial - 1);
  };
  try {
    const r = await openPack(id, 10);
    note(r.cards);
    check("×10 : 10 cartes, 10 cristaux dépensés", r.cards.length === 10 && r.lotSize === 10 && r.state.available === 40, `${r.state.available}`);
    check("Un seul lot enregistré, 10 cartes en base", (await prisma.packOpening.count({ where: { userId: id, lotSize: 10 } })) === 1 && (await prisma.card.count({ where: { ownerId: id } })) === 10);
    check("10ᵉ carte du ×10 : au moins R", r.cards[9].rarity !== "N");
    let u = await prisma.user.findUniqueOrThrow({ where: { id }, select: { cardsSinceSSR: true, cardsSinceUR: true } });
    check("Pity : compteurs en cartes (≤ 10 après un ×10, bornés par les seuils)", u.cardsSinceSSR <= 10 && u.cardsSinceUR <= 10 && u.cardsSinceSSR < SSR_PITY && u.cardsSinceUR < UR_PITY, `${u.cardsSinceSSR}/${u.cardsSinceUR}`);

    const r5 = await openPack(id, 5);
    note(r5.cards);
    check("×5 : 5 cartes, 35 cristaux restants", r5.cards.length === 5 && r5.state.available === 35);
    check("Numéros d'exemplaire uniques par personnage", new Set([...r.cards, ...r5.cards].map((c) => `${c.characterId}-${c.serial}`)).size === 15);

    await prisma.user.update({ where: { id }, data: { crystals: 9, crystalsUpdatedAt: new Date() } });
    let notEnough = false;
    try {
      await openPack(id, 10);
    } catch (e) {
      notEnough = e instanceof NoPackAvailableError;
    }
    check("×10 avec 9 cristaux : refusé, rien consommé", notEnough && (await prisma.user.findUniqueOrThrow({ where: { id }, select: { crystals: true } })).crystals === 9);

    await prisma.user.update({ where: { id }, data: { crystals: 10, crystalsUpdatedAt: new Date() } });
    const both = await Promise.allSettled([openPack(id, 10), openPack(id, 10)]);
    for (const b of both) if (b.status === "fulfilled") note(b.value.cards);
    check("Deux ×10 simultanés avec 10 cristaux : un seul passe", both.filter((x) => x.status === "fulfilled").length === 1, both.map((x) => x.status).join());

    // Pity : à 74 cartes sans SSR ou mieux, la carte suivante en est forcément une
    await prisma.user.update({ where: { id }, data: { crystals: 50, crystalsUpdatedAt: new Date(), cardsSinceSSR: SSR_PITY - 1, cardsSinceUR: 0 } });
    const p = await openPack(id, 5);
    note(p.cards);
    check("Pity SSR : la 75ᵉ carte sans SSR en est un (au moins)", p.cards[0].rarity === "SSR" || p.cards[0].rarity === "UR", p.cards[0].rarity);
    await prisma.user.update({ where: { id }, data: { crystals: 50, crystalsUpdatedAt: new Date(), cardsSinceUR: UR_PITY - 1 } });
    const q = await openPack(id, 5);
    note(q.cards);
    check("Pity UR : la 500ᵉ carte sans UR en est un", q.cards[0].rarity === "UR" && q.pity === "UR");
    u = await prisma.user.findUniqueOrThrow({ where: { id }, select: { cardsSinceSSR: true, cardsSinceUR: true } });
    check("Après un UR, les deux compteurs repartent de 0 puis avancent avec la fin du lot", u.cardsSinceUR <= 4 && u.cardsSinceSSR <= 4, `${u.cardsSinceSSR}/${u.cardsSinceUR}`);
  } finally {
    for (const [characterId, count] of pulls) await prisma.character.update({ where: { id: characterId }, data: { pullCount: count } });
    await prisma.user.delete({ where: { id } });
  }
  console.log(failures === 0 ? "\nLots ×5 et ×10 conformes." : `\n${failures} vérification(s) en échec.`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main().finally(() => prisma.$disconnect());
