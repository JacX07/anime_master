// Vérification du booster de bienvenue ×10 (SPEC collection §8 ter) sur la vraie base, avec des joueurs jetables.
// Usage : npm run check:welcome-booster   (Node 24)

import { prisma } from "../src/lib/db";
import { getPackState, openPack, openWelcomeBooster, WelcomeBoosterClaimedError } from "../src/lib/packs";
import { rollLot } from "../src/lib/pull";

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  if (!ok) failures++;
  console.log(`${ok ? "✓" : "✗"} ${label}${detail ? ` — ${detail}` : ""}`);
}
const rejects = async (fn: () => Promise<unknown>, kind: new (...a: never[]) => Error) => fn().then(() => false, (e) => e instanceof kind);

async function main() {
  // --- Tirage pur : une SSR ou une UR à chaque booster, sans toucher aux autres garanties ---
  const empty = { cardsSinceSSR: 0, cardsSinceUR: 0, cardsSinceBoost: 0 };
  let missing = 0;
  for (let i = 0; i < 20_000; i++) {
    const roll = rollLot(empty, 10, Math.random, true);
    if (!roll.cards.some((c) => c.rarity === "SSR" || c.rarity === "UR")) missing++;
  }
  check("Booster : une SSR ou une UR dans chacun des 20 000 lots simulés", missing === 0, `${missing} lot(s) sans SSR`);
  // --- 10ᵉ invocation boostée : une carte sur 10, quel que soit le format du lot ---
  let nBoost = 0, nPlain = 0, badNext = 0;
  for (let i = 0; i < 5_000; i++) {
    const five = rollLot({ cardsSinceSSR: 0, cardsSinceUR: 0, cardsSinceBoost: 7 }, 5, Math.random);
    if (five.cards[2].rarity === "N") nBoost++; // 3ᵉ carte du lot = 10ᵉ invocation : jamais N
    if (five.next.cardsSinceBoost !== 2) badNext++;
    const plain = rollLot({ cardsSinceSSR: 0, cardsSinceUR: 0, cardsSinceBoost: 0 }, 5, Math.random);
    if (plain.cards[0].rarity === "N") nPlain++;
  }
  check("×5 avec compteur à 7 : la 3ᵉ carte (10ᵉ invocation) n'est jamais N", nBoost === 0, `${nBoost} N`);
  check("Compteur après un ×5 depuis 7 : 2", badNext === 0);
  check("Cartes hors 10ᵉ invocation : des N sortent encore", nPlain > 0);
  const stamp = Date.now();
  const ids = [`wb-a-${stamp}`, `wb-b-${stamp}`];
  const make = (id: string) => prisma.user.create({ data: { id, name: id, username: id, email: `${id}@test.local` } });
  try {
    // --- Un joueur : récupération unique ---
    await make(ids[0]);
    const before = await prisma.user.findUniqueOrThrow({ where: { id: ids[0] }, select: { crystals: true, balance: true } });
    check("Nouveau joueur : booster disponible", (await getPackState(ids[0])).welcomeBoosterAvailable);

    const first = await openWelcomeBooster(ids[0]);
    check("Le booster donne 10 cartes", first.cards.length === 10 && first.lotSize === 10);
    check("Le booster contient une SSR ou une UR", first.cards.some((c) => c.rarity === "SSR" || c.rarity === "UR"));
    const after = await prisma.user.findUniqueOrThrow({ where: { id: ids[0] }, select: { crystals: true, balance: true, welcomeBoosterClaimedAt: true } });
    check("Gratuit : cristaux et Ryō inchangés", after.crystals === before.crystals && after.balance === before.balance);
    check("Date de récupération enregistrée", after.welcomeBoosterClaimedAt instanceof Date);
    check("État : booster non disponible après ouverture", !(await getPackState(ids[0])).welcomeBoosterAvailable);

    check("Deuxième récupération refusée", await rejects(() => openWelcomeBooster(ids[0]), WelcomeBoosterClaimedError));
    const cards = await prisma.card.count({ where: { ownerId: ids[0] } });
    check("Refus : aucune carte ajoutée (10 au total)", cards === 10, `${cards} cartes`);

    const normal = await openPack(ids[0], 5);
    check("Le joueur peut ensuite ouvrir un lot normal ×5", normal.cards.length === 5);

    // --- Double clic ou requêtes simultanées : un seul booster ---
    await make(ids[1]);
    const results = await Promise.allSettled([openWelcomeBooster(ids[1]), openWelcomeBooster(ids[1]), openWelcomeBooster(ids[1]), openWelcomeBooster(ids[1])]);
    const won = results.filter((r) => r.status === "fulfilled").length;
    check("4 récupérations simultanées : exactement une réussit", won === 1, `${won} réussie(s)`);
    const cards2 = await prisma.card.count({ where: { ownerId: ids[1] } });
    check("Pas de carte en double : 10 cartes au total", cards2 === 10, `${cards2} cartes`);
    check("Le booster est marqué récupéré une seule fois", !(await getPackState(ids[1])).welcomeBoosterAvailable);
  } finally {
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
  }

  if (failures > 0) {
    console.error(`\n${failures} vérification(s) en échec`);
    process.exit(1);
  }
  console.log("\nBooster de bienvenue : toutes les vérifications passent");
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
