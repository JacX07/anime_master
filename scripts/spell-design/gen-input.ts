// Prépare les fiches des 236 SSR/UR pour la réécriture des sorts : 8 lots (scripts/spell-design/input-N.json), noms actuels inclus.
// Usage : npx tsx scripts/spell-design/gen-input.ts
import { writeFileSync } from "node:fs";
import { prisma } from "../../src/lib/db";
import { spellOf } from "../../src/lib/spells";
import { TERTIARY_SPELLS } from "../../src/lib/tertiary-catalog";
import { ULTIMATE_CATALOG } from "../../src/lib/ultimate-catalog";
import { basicAttackOf } from "../../src/lib/basic-attacks";

(async () => {
  const rows = await prisma.character.findMany({
    where: { disabled: false, rarity: { in: ["SSR", "UR"] } },
    orderBy: [{ mainMedia: { franchiseId: "asc" } }, { favourites: "desc" }],
    select: { id: true, name: true, rarity: true, type: true, mainRole: true, gender: true, mainMedia: { select: { titleEnglish: true, titleRomaji: true } } },
  });
  const cards = rows.map((r) => ({
    id: r.id, name: r.name, rarity: r.rarity, type: r.type, roleInAnime: r.mainRole, anime: r.mainMedia?.titleEnglish ?? r.mainMedia?.titleRomaji ?? "?",
    current: {
      basicAttack: basicAttackOf(r.id, r.rarity, r.type)?.name,
      secondary: spellOf(r.id, r.rarity, r.type)?.name,
      tertiary: TERTIARY_SPELLS[r.id]?.name,
      ultimate: ULTIMATE_CATALOG[r.id]?.name,
    },
  }));
  const N = 8, size = Math.ceil(cards.length / N);
  for (let i = 0; i < N; i++) writeFileSync(`scripts/spell-design/input-${i + 1}.json`, JSON.stringify(cards.slice(i * size, (i + 1) * size), null, 1));
  console.log(cards.length, "personnages,", N, "lots de", size);
})().finally(() => prisma.$disconnect());
