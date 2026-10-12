// Vérification de la recharge des cristaux sur la vraie base (SPEC étape 4 bis, §1).
// Usage : npm run check:recharge
//
// Crée un joueur jetable, fait « passer le temps » en reculant `crystalsUpdatedAt`, ouvre de vrais
// lots avec `openPack`, puis supprime le joueur et rend les numéros d'exemplaire consommés.

import { prisma } from "../src/lib/db";
import { getPackState, NoPackAvailableError, openPack, ConcurrentOpeningError } from "../src/lib/packs";
import { CRYSTAL_INTERVAL_MS, MAX_CRYSTALS } from "../src/lib/crystal-stock";

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

async function setStock(userId: string, crystals: number, agoMs: number) {
  await prisma.user.update({ where: { id: userId }, data: { crystals, crystalsUpdatedAt: new Date(Date.now() - agoMs) } });
}

async function main() {
  const tag = `recharge-${Date.now()}`;
  const user = await prisma.user.create({
    data: { id: tag, name: tag, username: tag, email: `${tag}@test.local` },
    select: { id: true },
  });
  const refuses = async (p: Promise<unknown>) => p.then(() => false, (e) => e instanceof NoPackAvailableError);

  try {
    // 1. Joueur neuf : stock plein, pas de compte à rebours
    let s = await getPackState(user.id);
    check("Nouveau joueur : 50 cristaux, stock plein", s.available === MAX_CRYSTALS && s.nextCrystalAt === null, `${s.available}`);

    // 2. Ouvrir depuis un stock plein relance la recharge à partir de maintenant
    let opened = await openPack(user.id, 5);
    s = opened.state;
    check("Ouverture ×5 depuis le plein : 45 restants, prochain dans 2 min", s.available === 45 && near(s.nextCrystalAt, Date.now() + CRYSTAL_INTERVAL_MS), `${s.available}, prochain ${minutesUntil(s.nextCrystalAt)}`);
    check("Le ×5 enregistre 5 cartes et un lot de 5", opened.cards.length === 5 && opened.lotSize === 5);

    // 3. Juste avant les 2 minutes : rien de plus
    await setStock(user.id, 45, CRYSTAL_INTERVAL_MS - 30 * 1000);
    s = await getPackState(user.id);
    check("1 min 30 plus tard : toujours 45", s.available === 45 && near(s.nextCrystalAt, Date.now() + 30 * 1000), `${s.available}, prochain ${minutesUntil(s.nextCrystalAt)}`);

    // 4. À 2 minutes : +1, stock plein
    await setStock(user.id, 49, CRYSTAL_INTERVAL_MS + 1000);
    s = await getPackState(user.id);
    check("49 puis 2 min plus tard : 50, stock plein", s.available === MAX_CRYSTALS && s.nextCrystalAt === null, `${s.available}`);

    // 5. Plafond : une longue absence ne dépasse pas 50
    await setStock(user.id, 0, 24 * 60 * MIN);
    s = await getPackState(user.id);
    check("Stock vide, absent 24 h : plafonné à 50", s.available === MAX_CRYSTALS && s.nextCrystalAt === null, `${s.available}`);

    // 6. Recharge partielle : 0 en stock, 11 min écoulées → 5, prochain dans 1 min
    await setStock(user.id, 0, 11 * MIN);
    s = await getPackState(user.id);
    check("Stock vide, 11 min écoulées : 5, prochain dans 1 min", s.available === 5 && near(s.nextCrystalAt, Date.now() + 1 * MIN), `${s.available}, prochain ${minutesUntil(s.nextCrystalAt)}`);

    // 7. Ouvrir ne fait pas perdre la progression vers le cristal suivant
    opened = await openPack(user.id, 5);
    s = opened.state;
    check("Après ouverture : 0, prochain toujours dans 1 min", s.available === 0 && near(s.nextCrystalAt, Date.now() + 1 * MIN), `${s.available}, prochain ${minutesUntil(s.nextCrystalAt)}`);
    const reread = await getPackState(user.id);
    check("Relecture en base identique", reread.available === 0 && reread.nextCrystalAt === s.nextCrystalAt);

    // 8. Stock insuffisant : l'ouverture est refusée, rien n'est consommé
    check("Stock à 0 : ×5 refusé", await refuses(openPack(user.id, 5)));
    await setStock(user.id, 9, 0);
    check("9 cristaux : ×10 refusé, stock intact", (await refuses(openPack(user.id, 10))) && (await getPackState(user.id)).available === 9);
    await setStock(user.id, 10, 0);
    opened = await openPack(user.id, 10);
    check("10 cristaux : ×10 accepté, 10 cartes, stock à 0", opened.cards.length === 10 && opened.lotSize === 10 && opened.state.available === 0);

    // 9. Deux ouvertures simultanées avec 5 cristaux : une seule passe
    await setStock(user.id, 5, 0);
    const results = await Promise.allSettled([openPack(user.id, 5), openPack(user.id, 5)]);
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
