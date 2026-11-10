// Équilibrage (v0.3.0, lot 4) : taux de victoire de chaque SSR/UR, stats de base égalisées par rareté pour ne mesurer que leurs sorts.
// Usage : npm run simulate:balance -- [--games 6000] [--seed 7]
import { battle, type BattleCard, seededRandom } from "../src/lib/battle";
import { speedOf } from "../src/lib/speed";
import { prisma } from "../src/lib/db";

const arg = (name: string, fallback: number) => { const i = process.argv.indexOf(name); return i < 0 ? fallback : Number(process.argv[i + 1]); };
const GAMES = arg("--games", 6000);
const rng = seededRandom(arg("--seed", 7));

async function main() {
  const rows = await prisma.character.findMany({ where: { disabled: false, rarity: { in: ["SSR", "UR"] } }, select: { id: true, name: true, rarity: true, type: true, attack: true, defense: true } });
  for (const rarity of ["UR", "SSR"] as const) {
    const pool = rows.filter((r) => r.rarity === rarity);
    const atk = pool.reduce((s, r) => s + r.attack, 0) / pool.length, def = pool.reduce((s, r) => s + r.defense, 0) / pool.length;
    // Stats, vitesse et franchise neutralisées : seuls les sorts et le type diffèrent
    const card = (r: (typeof pool)[number]): BattleCard => ({ characterId: r.id, rarity, type: r.type, attack: Math.round(atk), defense: Math.round(def), power: 1, speed: 100, franchiseId: null, stars: 0, weapon: null });
    const stats = new Map(pool.map((r) => [r.id, { name: r.name, games: 0, wins: 0 }]));
    const pick = () => { const team: typeof pool = []; while (team.length < 4) { const r = pool[Math.floor(rng() * pool.length)]; if (!team.includes(r)) team.push(r); } return team; };
    for (let g = 0; g < GAMES; g++) {
      const a = pick(), b = pick().filter((r) => !a.includes(r));
      if (b.length < 4) { g--; continue; }
      const res = battle(a.map(card), b.map(card), seededRandom(Math.floor(rng() * 2 ** 31)), { gauge: true, startingSide: g % 2 ? "A" : "B" });
      for (const [team, side] of [[a, "A"], [b, "B"]] as const) for (const r of team) {
        const s = stats.get(r.id)!; s.games++; s.wins += res.winner === side ? 1 : res.winner === null ? 0.5 : 0;
      }
    }
    const list = [...stats.entries()].map(([id, s]) => ({ id, ...s, rate: s.wins / Math.max(1, s.games) })).sort((x, y) => y.rate - x.rate);
    console.log(`\n${rarity} — ${pool.length} persos, ${GAMES} combats, ~${Math.round(GAMES * 8 / pool.length)} par perso (moyenne 50 %)`);
    console.log("Plus forts :"); for (const r of list.slice(0, 12)) console.log(`  ${(r.rate * 100).toFixed(1)} %  ${r.name} (${r.id}, ${r.games} combats)`);
    console.log("Plus faibles :"); for (const r of list.slice(-5)) console.log(`  ${(r.rate * 100).toFixed(1)} %  ${r.name} (${r.id})`);
    for (const name of (process.env.WATCH ?? "").split(",").filter(Boolean)) {
      const i = list.findIndex((r) => r.name === name);
      if (i >= 0) console.log(`  suivi : ${name} ${(list[i].rate * 100).toFixed(1)} % (rang ${i + 1}/${list.length})`);
    }
  }
}
main().finally(() => prisma.$disconnect());
