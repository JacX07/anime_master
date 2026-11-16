import assert from "node:assert/strict";
import { breachChestOdds, CHEST_ITEMS, CHEST_TIERS, chestContents, expeditionChests, rollChest } from "../src/lib/chests";
import { LEGENDARY_ODDS, legendaryAmount } from "../src/lib/emperors";

const rngFrom = (seed: number) => { let s = seed >>> 0; return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296; };
const label = (item: object) => JSON.stringify(item);
const N = 60000;

// Coffres : les chances affichées couvrent tout le coffre et collent au tirage réel
for (const tier of CHEST_TIERS) {
  const { items, jackpot } = chestContents(tier);
  assert(Math.abs(items.reduce((s, i) => s + i.chance, 0) - 1) < 1e-9, `${tier} : chances d'objets ≠ 100 %`);
  if (jackpot.length) assert(Math.abs(jackpot.reduce((s, i) => s + i.chance, 0) - 1) < 1e-9, "gros lot ≠ 100 %");
  else assert.equal(tier === "legendaire", false);
  const rng = rngFrom(7 + CHEST_TIERS.indexOf(tier));
  const seen = new Map<string, number>(), big = new Map<string, number>();
  let regular = 0, grand = 0;
  for (let i = 0; i < N; i++) {
    const rolled = rollChest(tier, rng);
    assert.equal(rolled.length, CHEST_ITEMS[tier]);
    for (const { jackpot: isBig, ...item } of rolled) {
      if (isBig) { grand++; big.set(label(item), (big.get(label(item)) ?? 0) + 1); } else { regular++; seen.set(label(item), (seen.get(label(item)) ?? 0) + 1); }
    }
  }
  for (const { item, chance } of items) assert(Math.abs((seen.get(label(item)) ?? 0) / regular - chance) < 0.01, `${tier} ${label(item)} : ${(seen.get(label(item)) ?? 0) / regular} au lieu de ${chance}`);
  for (const { item, chance } of jackpot) assert(Math.abs((big.get(label(item)) ?? 0) / grand - chance) < 0.01, `gros lot ${label(item)}`);
  assert.equal(seen.size, items.length, `${tier} : objet tiré absent de l'affichage`);
}
// Rangs de coffres par expédition
for (const level of ["Faille", "Brèche", "Gouffre"] as const) {
  const { count, odds } = breachChestOdds(level);
  assert(Math.abs(odds.reduce((s, o) => s + o.chance, 0) - 1) < 1e-9);
  const first = new Map<string, number>();
  const rng = rngFrom(5);
  let total = 0;
  for (let i = 0; i < N; i++) {
    const chests = expeditionChests(level, "SUCCESS", rng);
    assert.equal(chests.length, count);
    for (const t of chests) { first.set(t, (first.get(t) ?? 0) + 1); total++; }
  }
  for (const o of odds) assert(Math.abs((first.get(o.tier) ?? 0) / total - o.chance) < 0.01, `${level} ${o.tier}`);
}
// Ressource légendaire par difficulté
for (const [difficulty, odds] of Object.entries(LEGENDARY_ODDS)) {
  assert(Math.abs(odds.reduce((s, o) => s + o.chance, 0) - 1) < 1e-9);
  const rng = rngFrom(3), got = new Map<number, number>();
  for (let i = 0; i < N; i++) { const a = legendaryAmount(difficulty, rng); got.set(a, (got.get(a) ?? 0) + 1); }
  assert.equal(got.size, odds.length, `${difficulty} : quantités possibles`);
  for (const o of odds) assert(Math.abs((got.get(o.amount) ?? 0) / N - o.chance) < 0.01, `${difficulty} ×${o.amount}`);
}
console.log("Chances affichées conformes au tirage : coffres, rangs d'expédition, ressources d'empereur.");
