// Vérification de la recharge des paquets sur la vraie base (SPEC étape 2, §3 et §8).
// Usage : npm run check:recharge
//
// Crée un joueur jetable, fait « passer le temps » en reculant `lastPackAt`, ouvre de vrais
// paquets avec `openPack`, puis supprime le joueur et rend les numéros d'exemplaire consommés.

import { prisma } from "../src/lib/db";
import { getPackState, NoPackAvailableError, openPack, ConcurrentOpeningError } from "../src/lib/packs";
import { MAX_PACKS, PACK_INTERVAL_MS } from "../src/lib/pack-stock";

const MIN = 60 * 1000;
const TOLERANCE_MS = 5000; // durée max d'une étape du script

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  if (!ok) failures++;
  console.log(`${ok ? "✓" : "✗"} ${label}${detail ? ` — ${detail}` : ""}`);
}

function minutesUntil(iso: string | null): string {
  return iso === null ? "aucun" : `${((new Date(iso).getTime() - Date.now()) / MIN).toFixed(2)} min`;
}

function near(iso: string | null, expected: number): boolean {
  return iso !== null && Math.abs(new Date(iso).getTime() - expected) < TOLERANCE_MS;
}

async function setStock(userId: string, packsStored: number, agoMs: number) {
  await prisma.user.update({ where: { id: userId }, data: { packsStored, lastPackAt: new Date(Date.now() - agoMs) } });
}

async function main() {
  const tag = `recharge-${Date.now()}`;
  const user = await prisma.user.create({
    data: { id: tag, name: tag, username: tag, email: `${tag}@test.local` },
    select: { id: true },
  });

  try {
    // 1. Joueur neuf : stock plein, pas de compte à rebours
    let s = await getPackState(user.id);
    check("Nouveau joueur : 10 paquets, stock plein", s.available === MAX_PACKS && s.nextPackAt === null, `${s.available}`);

    // 2. Ouvrir depuis un stock plein relance la recharge à partir de maintenant
    let opened = await openPack(user.id);
    s = opened.state;
    check(
      "Ouverture depuis le plein : 9 restants, prochain dans 10 min",
      s.available === 9 && near(s.nextPackAt, Date.now() + PACK_INTERVAL_MS),
      `${s.available}, prochain ${minutesUntil(s.nextPackAt)}`,
    );

    // 3. Juste avant les 10 minutes : rien de plus
    await setStock(user.id, 9, PACK_INTERVAL_MS - 30 * 1000);
    s = await getPackState(user.id);
    check("9 min 30 plus tard : toujours 9", s.available === 9 && near(s.nextPackAt, Date.now() + 30 * 1000), `${s.available}, prochain ${minutesUntil(s.nextPackAt)}`);

    // 4. À 10 minutes : +1, stock plein
    await setStock(user.id, 9, PACK_INTERVAL_MS + 1000);
    s = await getPackState(user.id);
    check("10 min plus tard : 10, stock plein", s.available === MAX_PACKS && s.nextPackAt === null, `${s.available}`);

    // 5. Plafond : une longue absence ne dépasse pas 10
    await setStock(user.id, 0, 24 * 60 * MIN);
    s = await getPackState(user.id);
    check("Stock vide, absent 24 h : plafonné à 10", s.available === MAX_PACKS && s.nextPackAt === null, `${s.available}`);

    // 6. Recharge partielle : 0 en stock, 25 min écoulées → 2, prochain dans 5 min
    await setStock(user.id, 0, 25 * MIN);
    s = await getPackState(user.id);
    check("Stock vide, 25 min écoulées : 2, prochain dans 5 min", s.available === 2 && near(s.nextPackAt, Date.now() + 5 * MIN), `${s.available}, prochain ${minutesUntil(s.nextPackAt)}`);

    // 7. Ouvrir ne fait pas perdre la progression vers le paquet suivant
    opened = await openPack(user.id);
    s = opened.state;
    check("Après ouverture : 1, prochain toujours dans 5 min", s.available === 1 && near(s.nextPackAt, Date.now() + 5 * MIN), `${s.available}, prochain ${minutesUntil(s.nextPackAt)}`);
    const reread = await getPackState(user.id);
    check("Relecture en base identique", reread.available === 1 && reread.nextPackAt === s.nextPackAt);

    // 8. Stock épuisé : l'ouverture est refusée
    await openPack(user.id);
    let refused = false;
    try {
      await openPack(user.id);
    } catch (err) {
      refused = err instanceof NoPackAvailableError;
    }
    check("Stock à 0 : ouverture refusée", refused);

    // 9. Deux ouvertures simultanées avec 1 seul paquet : une seule passe
    await setStock(user.id, 1, 0);
    const results = await Promise.allSettled([openPack(user.id), openPack(user.id)]);
    const ok = results.filter((r) => r.status === "fulfilled").length;
    const rejectedOk = results.every(
      (r) => r.status === "fulfilled" || r.reason instanceof ConcurrentOpeningError || r.reason instanceof NoPackAvailableError,
    );
    s = await getPackState(user.id);
    check("Ouvertures simultanées : une seule réussit, stock à 0", ok === 1 && rejectedOk && s.available === 0, `${ok} réussie(s), stock ${s.available}`);
  } finally {
    // Rend les numéros d'exemplaire consommés par le joueur jetable, puis le supprime
    const pulled = await prisma.card.groupBy({ by: ["characterId"], where: { ownerId: user.id }, _count: true });
    for (const p of pulled) {
      await prisma.character.update({ where: { id: p.characterId }, data: { pullCount: { decrement: p._count } } });
    }
    await prisma.user.delete({ where: { id: user.id } });
  }

  console.log(failures === 0 ? "\nRecharge conforme." : `\n${failures} vérification(s) en échec.`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main().finally(() => prisma.$disconnect());
