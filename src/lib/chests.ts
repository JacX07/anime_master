// Coffres d'expédition (docs/specs/pvm.md, « v0.3.0 — Coffres et rééquilibrage ») : règles pures, sans base de données.

export const CHEST_TIERS = ["bronze", "argent", "or", "legendaire"] as const;
export type ChestTier = (typeof CHEST_TIERS)[number];
export const CHEST_NAMES: Record<ChestTier, string> = { bronze: "Bronze", argent: "Argent", or: "Or", legendaire: "Légendaire" };
/** Nombre d'objets par coffre (le Légendaire inclut son gros lot). */
export const CHEST_ITEMS: Record<ChestTier, number> = { bronze: 2, argent: 3, or: 4, legendaire: 6 };

/** Clé de stock d'un coffre : son rang et l'univers de la brèche d'où il vient (ses matériaux en sortent). */
export const chestKey = (tier: ChestTier, universe: string) => `coffre-${tier}:${universe}`;
export function parseChestKey(key: string): { tier: ChestTier; universe: string } | null {
  const m = /^coffre-(bronze|argent|or|legendaire):([a-z0-9-]+)$/.exec(key);
  return m ? { tier: m[1] as ChestTier, universe: m[2] } : null;
}
/** Cartes gratuites gagnées dans les coffres, à utiliser à l'invocation à la place des cristaux. */
export const FREE_BOOSTER = "booster-offert";

type Rng = () => number;
const idx = (t: ChestTier) => CHEST_TIERS.indexOf(t);

/** Coffres rapportés par une expédition selon son niveau et son résultat (graine du lancement). */
const ODDS: Record<"Faille" | "Brèche" | "Gouffre", { count: number; weights: [number, number, number, number] }> = {
  Faille: { count: 1, weights: [80, 18, 2, 0] },
  "Brèche": { count: 2, weights: [45, 40, 13, 2] },
  Gouffre: { count: 3, weights: [10, 45, 35, 10] },
};
function weighted(weights: number[], rng: Rng) {
  const total = weights.reduce((a, b) => a + b, 0);
  let x = rng() * total;
  for (const [i, w] of weights.entries()) { if ((x -= w) < 0) return i; }
  return weights.length - 1;
}
export function expeditionChests(tier: keyof typeof ODDS, outcome: "FAIL" | "SUCCESS" | "TRIUMPH", rng: Rng): ChestTier[] {
  if (outcome === "FAIL") return ["bronze"];
  const { count, weights } = ODDS[tier];
  const chests = Array.from({ length: count }, () => CHEST_TIERS[weighted(weights, rng)]);
  // Triomphe : un coffre de plus, tiré un cran au-dessus
  if (outcome === "TRIUMPH") chests.push(CHEST_TIERS[Math.min(3, weighted(weights, rng) + 1)]);
  return chests.sort((a, b) => idx(a) - idx(b));
}

export type ChestItem =
  | { kind: "ryo"; amount: number }
  | { kind: "crystals"; amount: number }
  | { kind: "booster"; cards: number }
  | { kind: "awakening"; amount: number }
  | { kind: "signature"; amount: number }
  | { kind: "weapon"; amount: number }
  | { kind: "hearts"; amount: number }
  | { kind: "energy"; amount: number }
  | { kind: "artifact"; rarity: "SR" | "SSR" }
  | { kind: "card"; rarity: "R" | "SR" | "SSR" | "UR" }
  | { kind: "emperor"; amount: number };

/** Table « tout » : poids de tirage et quantité par rang (null = absent de ce coffre). */
const TABLE: { weight: number; make: (t: number, rng: Rng) => ChestItem | null }[] = [
  { weight: 18, make: (t) => ({ kind: "ryo", amount: [60, 150, 400, 1000][t] }) },
  { weight: 14, make: (t) => ({ kind: "crystals", amount: [2, 5, 10, 25][t] }) },
  { weight: 6, make: (t) => (t === 0 ? null : { kind: "booster", cards: t === 3 ? 10 : 5 }) },
  { weight: 18, make: (t) => ({ kind: "awakening", amount: [3, 8, 15, 30][t] }) },
  { weight: 14, make: (t) => ({ kind: "signature", amount: [4, 10, 20, 40][t] }) },
  { weight: 8, make: (t) => (t === 0 ? null : { kind: "weapon", amount: [0, 1, 2, 5][t] }) },
  { weight: 6, make: (t) => (t < 2 ? null : { kind: "hearts", amount: t === 3 ? 8 : 3 }) },
  { weight: 8, make: (t) => ({ kind: "energy", amount: [5, 10, 20, 40][t] }) },
  { weight: 5, make: (t, rng) => (t === 0 ? null : { kind: "artifact", rarity: t === 1 ? "SR" : t === 2 ? (rng() < 0.5 ? "SR" : "SSR") : "SSR" }) },
  { weight: 3, make: (t) => (t === 0 ? null : { kind: "card", rarity: (["R", "SR", "SSR"] as const)[t - 1] }) },
  { weight: 2, make: (t) => (t < 3 ? null : { kind: "emperor", amount: 1 }) },
];

/** Gros lot garanti du coffre Légendaire. */
function jackpot(rng: Rng): ChestItem {
  const r = rng();
  if (r < 0.3) return { kind: "booster", cards: 10 };
  if (r < 0.55) return { kind: "artifact", rarity: "SSR" };
  if (r < 0.8) return { kind: "card", rarity: rng() < 0.05 ? "UR" : "SSR" };
  return { kind: "emperor", amount: 2 };
}

/** Contenu d'un coffre (tiré à l'ouverture). Le gros lot du Légendaire arrive en dernier. */
export function rollChest(tier: ChestTier, rng: Rng): (ChestItem & { jackpot?: true })[] {
  const t = idx(tier);
  const pool = TABLE.filter((row) => row.make(t, () => 0) !== null);
  const items: (ChestItem & { jackpot?: true })[] = [];
  const regular = CHEST_ITEMS[tier] - (tier === "legendaire" ? 1 : 0);
  for (let i = 0; i < regular; i++) items.push(pool[weighted(pool.map((p) => p.weight), rng)].make(t, rng)!);
  if (tier === "legendaire") items.push({ ...jackpot(rng), jackpot: true });
  return items;
}

/** Rareté affichée d'un objet (couleur de son contour à l'ouverture). */
export function itemRarity(item: ChestItem, tier: ChestTier): "N" | "R" | "SR" | "SSR" | "UR" {
  if (item.kind === "card" || item.kind === "artifact") return item.rarity;
  if (item.kind === "emperor") return "UR";
  if (item.kind === "booster") return item.cards >= 10 ? "UR" : "SR";
  return (["N", "R", "SR", "SSR"] as const)[idx(tier)];
}
