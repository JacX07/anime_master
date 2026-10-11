// Vérification de l'ouverture groupée (×5 / ×10) sur la vraie base, avec un joueur jetable.
// Usage : npm run check:bulk   (Node 24)

import { prisma } from "../src/lib/db";
import { NoPackAvailableError, openPacks } from "../src/lib/packs";
import { SSR_PITY } from "../src/lib/pull";

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  if (!ok) failures++;
  console.log(`${ok ? "✓" : "✗"} ${label}${detail ? ` — ${detail}` : ""}`);
}

async function main() {
  const id = `bulk-${Date.now()}`;
  await prisma.user.create({ data: { id, name: id, username: id, email: `${id}@test.local`, packsStored: 10 } });
  const pulls = new Map<number, number>();
  try {
    const r = await openPacks(id, 5);
    for (const c of r.cards) if (!pulls.has(c.characterId)) pulls.set(c.characterId, c.serial - 1);
    check("×5 : 5 paquets, 25 cartes", r.opened === 5 && r.cards.length === 25);
    check("Stock 10 → 5", r.state.available === 5, `${r.state.available}`);
    check("5 ouvertures enregistrées, 25 cartes en base", (await prisma.packOpening.count({ where: { userId: id } })) === 5 && (await prisma.card.count({ where: { ownerId: id } })) === 25);
    const u = await prisma.user.findUniqueOrThrow({ where: { id }, select: { packsSinceSSR: true } });
    check("Pity : le compteur SSR avance paquet par paquet (jamais plus de 5, puis remis à 0 par un SSR)", u.packsSinceSSR <= 5 && u.packsSinceSSR < SSR_PITY, `${u.packsSinceSSR}`);
    check("Numéros d'exemplaire uniques par personnage", new Set(r.cards.map((c) => `${c.characterId}-${c.serial}`)).size === 25);

    let refused = false;
    try {
      await openPacks(id, 10);
    } catch (e) {
      refused = e instanceof NoPackAvailableError;
    }
    check("×10 avec 5 en stock : refusé, rien consommé", refused && (await prisma.packOpening.count({ where: { userId: id } })) === 5);
    const r2 = await openPacks(id, 5);
    for (const c of r2.cards) if (!pulls.has(c.characterId)) pulls.set(c.characterId, c.serial - 1);
    check("×5 avec exactement 5 en stock : réussi, stock à 0", r2.opened === 5 && r2.state.available === 0, `${r2.opened}/${r2.state.available}`);
    const both = await Promise.allSettled([openPacks(id, 5), openPacks(id, 5)]);
    check("Stock vide : aucune ouverture", both.every((x) => x.status === "rejected") && (await prisma.card.count({ where: { ownerId: id } })) === 50, `${both.map((x) => x.status)} ${await prisma.card.count({ where: { ownerId: id } })}`);
  } finally {
    for (const [characterId, count] of pulls) await prisma.character.update({ where: { id: characterId }, data: { pullCount: count } });
    await prisma.user.delete({ where: { id } });
  }
  console.log(failures === 0 ? "\nOuverture groupée conforme." : `\n${failures} vérification(s) en échec.`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main().finally(() => prisma.$disconnect());
