// Poids de chaque emplacement des kits spéciaux (Luffy, Killua, Eren, Emilia, Momo, Makima, Okabe, Yuuji, Denji, Kurapika, Mob)
// contre un échantillon d'autres UR/SSR pris comme référence. Même méthode que simulate-character-skills.ts.
// Usage : npx tsx scripts/simulate-kits.ts [--games 800] [--seed 42] [--ids 40,27] [--ref 20]
import { battle, seededRandom, type BattleCard, type BattleResult, type Random } from "../src/lib/battle";
import { prisma } from "../src/lib/db";
import { speedOf } from "../src/lib/speed";

type Slot = "base" | "secondary" | "tertiary" | "ultimate";
const arg = (n: string, d: string) => { const i = process.argv.indexOf(n); return i < 0 ? d : process.argv[i + 1]; };
const GAMES = Number(arg("--games", "800")), SEED = Number(arg("--seed", "42"));
const KITS = [40, 27, 40882, 88572, 222594, 137080, 35252, 127212, 130102, 28, 89616, 129928];
const ids = arg("--ids", "") ? arg("--ids", "").split(",").map(Number) : KITS;
const REF = Number(arg("--ref", "20"));
const score = (r: BattleResult, s: "A" | "B") => (r.winner === s ? 1 : r.winner === null ? 0.5 : 0);
const pick = <T,>(l: T[], r: Random) => l[Math.floor(r() * l.length)];
const seedFor = (...p: number[]) => { let v = SEED | 0; for (const x of p) v = (Math.imul(v ^ x, 1664525) + 1013904223) | 0; return v >>> 0; };
const only = (c: BattleCard, slot: Slot): BattleCard => ({ ...c, noBasicAttack: slot !== "base", noSpell: slot !== "secondary", noTertiary: slot !== "tertiary", noUltimate: slot !== "ultimate" });
const bare = (c: BattleCard): BattleCard => ({ ...c, noBasicAttack: true, noSpell: true, noTertiary: true, noUltimate: true });

async function main() {
  const rows = await prisma.character.findMany({
    where: { disabled: false, rarity: { in: ["SSR", "UR"] } },
    select: { id: true, name: true, rarity: true, type: true, attack: true, defense: true, power: true, mainMediaId: true, mainMedia: { select: { franchiseId: true } } },
    orderBy: { id: "asc" },
  });
  const cards = rows.map((r) => ({ name: r.name, card: { characterId: r.id, rarity: r.rarity, type: r.type, attack: r.attack, defense: r.defense, power: r.power, speed: speedOf(r.id), franchiseId: r.mainMedia?.franchiseId ?? r.mainMediaId } as BattleCard }));
  const _weight = (card: BattleCard, slot: Slot, tag: number) => {
    const pool = cards.filter((c) => c.card.rarity === card.rarity).map((c) => c.card);
    let sum = 0;
    for (let g = 0; g < GAMES; g++) {
      const sample = seededRandom(seedFor(card.characterId, tag, g, 17));
      const mates = [0, 1, 2].map(() => pick(pool, sample));
      const plain = [card, ...mates].map(bare);
      const armed = [only(card, slot), ...mates.map(bare)];
      const bs = seedFor(card.characterId, tag, g, 29);
      for (const startingSide of ["A", "B"] as const) {
        sum += (score(battle(armed, plain, seededRandom(bs), { startingSide }), "A") - score(battle(plain, plain, seededRandom(bs), { startingSide }), "A")) / 2;
      }
    }
    return (sum / GAMES) * 100;
  };
  // Force globale : équipe [carte + 3 UR au hasard] contre 4 UR au hasard, tous avec leurs sorts ; camps alternés.
  const urs = cards.filter((c) => c.card.rarity === "UR").map((c) => c.card);
  const strength = (card: BattleCard, tag: number) => {
    let sum = 0;
    for (let g = 0; g < GAMES; g++) {
      const r = seededRandom(seedFor(card.characterId, tag, g, 5));
      const mates = [0, 1, 2].map(() => pick(urs, r));
      const foes = [0, 1, 2, 3].map(() => pick(urs, r));
      const bs = seedFor(card.characterId, tag, g, 7);
      for (const startingSide of ["A", "B"] as const) sum += score(battle([card, ...mates], foes, seededRandom(bs), { startingSide, gauge: true }), "A") / 2;
    }
    return (sum / GAMES) * 100;
  };
  const rng = seededRandom(SEED);
  const fixed = arg("--refstat", "");
  const ref = fixed ? [] : urs.filter((c) => !KITS.includes(c.characterId)).sort(() => rng() - 0.5).slice(0, REF);
  // Poids du kit = victoires avec le kit moins victoires du même perso sans aucun sort (mêmes stats, mêmes coéquipiers)
  const kitWeight = (c: BattleCard) => strength(c, 1) - strength(bare(c), 1);
  const refV = ref.map(kitWeight);
  let m = refV.reduce((a, b) => a + b, 0) / refV.length;
  let sd = Math.sqrt(refV.reduce((a, b) => a + (b - m) ** 2, 0) / refV.length);
  if (fixed) [m, sd] = fixed.split(",").map(Number);
  else console.log(`Référence (${ref.length} UR au hasard, équipe avec 3 UR au hasard contre 4 UR) : poids du kit ${m.toFixed(1)} pp ± ${sd.toFixed(1)} (écart-type entre persos), min ${Math.min(...refV).toFixed(1)}, max ${Math.max(...refV).toFixed(1)}`);
  console.table(ids.map((id) => {
    const e = cards.find((c) => c.card.characterId === id)!;
    const v = kitWeight(e.card);
    return { nom: e.name, "poids du kit": `${v >= 0 ? "+" : ""}${v.toFixed(1)} pp`, écart: `${(v - m >= 0 ? "+" : "")}${(v - m).toFixed(1)} pp`, verdict: v - m > 2 * sd ? "trop fort" : v - m < -2 * sd ? "trop faible" : "ok" };
  }));
}
main().finally(() => prisma.$disconnect());
