// Empreinte des combats avec les sorts existants : mêmes graines, mêmes équipes, hachage du journal complet.
// Sert de garde-fou au Spell Builder (docs/specs/combat.md §12) : une nouvelle mécanique ne doit changer AUCUN combat existant,
// donc l'empreinte doit être identique avant et après. Usage : npx tsx scripts/spell-fingerprint.ts

import { createHash } from "node:crypto";
import { battle, seededRandom, type BattleCard } from "../src/lib/battle";
import { prisma } from "../src/lib/db";
import { CHARACTER_SPELLS } from "../src/lib/spells";

async function main() {
  const rows = await prisma.character.findMany({
    where: { disabled: false, rarity: { in: ["SSR", "UR"] } },
    select: { id: true, rarity: true, type: true, attack: true, defense: true, power: true, mainMediaId: true, mainMedia: { select: { franchiseId: true } } },
    orderBy: { id: "asc" },
  });
  const pool: BattleCard[] = rows.map((r) => ({ characterId: r.id, rarity: r.rarity, type: r.type, attack: r.attack, defense: r.defense, power: r.power, franchiseId: r.mainMedia?.franchiseId ?? r.mainMediaId }));
  const rng = seededRandom(2026);
  const any = () => pool[Math.floor(rng() * pool.length)];
  const hash = createHash("sha1");
  const ids = new Set([...Object.keys(CHARACTER_SPELLS).map(Number), ...pool.filter((_, i) => i % 15 === 0).map((c) => c.characterId)]);
  let n = 0;
  for (const id of ids) {
    const c = pool.find((p) => p.characterId === id);
    if (!c) continue;
    for (let g = 0; g < 6; g++) {
      const r = battle([c, any(), any(), any()], [any(), any(), any(), any()], rng);
      hash.update(JSON.stringify(r));
      n++;
    }
  }
  console.log(`${n} combats, empreinte ${hash.digest("hex")}`);
}
main().finally(() => prisma.$disconnect());
