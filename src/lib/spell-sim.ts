// Simulation d'un sort du Spell Builder (docs/specs/combat.md §12).
// Le brouillon et le sort d'origine affrontent les mêmes équipes avec les mêmes graines.

import type { Rarity } from "../generated/prisma/enums";
import { battle, seededRandom, type BattleCard, type Random } from "./battle";
import { prisma } from "./db";
import type { CharacterSpell } from "./spells";
import type { BasicAttack } from "./basic-attacks";
import { parseBuilderValue, type BuilderSlot, type BuilderValue } from "./builder-slots";
import { builderEntries } from "./builder-catalog";

export interface SimResult {
  /** Nombre de paires de combats brouillon/référence. */
  games: number;
  /** Impact du brouillon face à la copie sans capacités personnalisées, en points de victoire. */
  weight: number;
  referenceWeight: number;
  /** Différence de taux de victoire brouillon − sort d'origine. */
  delta: number;
  /** Demi-largeur de l'intervalle de confiance à 95 % de cette différence appariée. */
  margin: number;
  /** SSR seulement : victoires de 4 SSR (dont la carte testée) contre 4 UR sans capacités personnalisées. */
  ssrVsUr: number | null;
  verdict: "inchangé" | "plus fort" | "plus faible" | "comparable";
}

export const cardRows = () =>
  prisma.character.findMany({
    where: { disabled: false, rarity: { in: ["SSR", "UR"] } },
    select: { id: true, name: true, imageUrl: true, rarity: true, type: true, attack: true, defense: true, power: true, mainMediaId: true, mainMedia: { select: { franchiseId: true } } },
    orderBy: [{ power: "desc" }, { id: "asc" }],
  });

type Row = Awaited<ReturnType<typeof cardRows>>[number];
export const toCard = (r: Row): BattleCard => ({
  characterId: r.id, rarity: r.rarity, type: r.type, attack: r.attack, defense: r.defense, power: r.power,
  franchiseId: r.mainMedia?.franchiseId ?? r.mainMediaId,
});

const tick = () => new Promise<void>((r) => setImmediate(r));
const plain = (c: BattleCard): BattleCard => ({ ...c, noBasicAttack: true, noSpell: true, noTertiary: true, noUltimate: true });

function withSlot(card: BattleCard, slot: BuilderSlot, spell: BuilderValue): BattleCard {
  if (slot === "base") return { ...card, noBasicAttack: false, basicAttack: spell as BasicAttack };
  if (slot === "secondary") return { ...card, noSpell: false, spell: spell as CharacterSpell };
  if (slot === "tertiary") return { ...card, noTertiary: false, tertiary: spell as CharacterSpell };
  return { ...card, noUltimate: false, ultimate: spell as CharacterSpell };
}

export async function simulateSpell(
  characterId: number,
  spell: BuilderValue,
  games: number,
  onProgress: (done: number, total: number) => void,
  seed = 42,
  slot: BuilderSlot = "secondary",
): Promise<SimResult> {
  const rows = await cardRows();
  const row = rows.find((r) => r.id === characterId);
  if (!row) throw new Error("Personnage introuvable (ou ni SSR ni UR)");
  const original = builderEntries(row.id, row.rarity, row.type).find((s) => s.slot === slot)?.original;
  const candidate = parseBuilderValue(slot, spell);
  const reference = original && parseBuilderValue(slot, original);
  if (!candidate || !reference) throw new Error("Sort ou emplacement invalide");
  // Un changement de nom ne change pas les mécaniques du sort.
  const unchanged = JSON.stringify({ ...candidate, name: "" }) === JSON.stringify({ ...reference, name: "" });
  const rng: Random = seededRandom(seed);
  const any = <T>(l: T[]) => l[Math.floor(rng() * l.length)];
  const by = (r: Rarity) => rows.filter((x) => x.rarity === r).map(toCard);
  const same = by(row.rarity), urs = by("UR"), ssrs = by("SSR");
  const baseline = plain(toCard(row));
  const card = withSlot(baseline, slot, candidate);
  const referenceCard = withSlot(baseline, slot, reference);
  const ssrGames = row.rarity === "SSR" ? Math.round(games / 2) : 0;
  const total = 2 * games + ssrGames;
  let done = 0;

  const score = (a: BattleCard[], b: BattleCard[], battleSeed: number, swap: boolean) => {
    const random = seededRandom(battleSeed);
    const result = swap ? battle(b, a, random) : battle(a, b, random);
    return result.winner === null ? 0.5 : result.winner === (swap ? "B" : "A") ? 1 : 0;
  };
  let wins = 0, referenceWins = 0, sumDiff = 0, sumDiffSquared = 0;
  for (let g = 0; g < games; g++) {
    const mates = [0, 1, 2].map(() => plain(any(same)));
    const foes = [baseline, ...mates];
    const battleSeed = Math.floor(rng() * 0x100000000);
    const win = score([card, ...mates], foes, battleSeed, g % 2 === 1);
    const referenceWin = score([referenceCard, ...mates], foes, battleSeed, g % 2 === 1);
    wins += win; referenceWins += referenceWin;
    const difference = win - referenceWin;
    sumDiff += difference; sumDiffSquared += difference * difference;
    done += 2;
    if (done % 100 === 0) { onProgress(done, total); await tick(); }
  }
  const delta = sumDiff / games;
  const variance = games > 1 ? Math.max(0, (sumDiffSquared - games * delta * delta) / (games - 1)) : 0;
  const margin = 1.96 * Math.sqrt(variance / games);
  let ssrVsUr: number | null = null;
  if (ssrGames) {
    let wins = 0;
    for (let g = 0; g < ssrGames; g++) {
      const a = [card, any(ssrs), any(ssrs), any(ssrs)];
      const b = [0, 1, 2, 3].map(() => plain(any(urs)));
      wins += score(a, b, Math.floor(rng() * 0x100000000), g % 2 === 1);
      if (++done % 100 === 0) { onProgress(done, total); await tick(); }
    }
    ssrVsUr = wins / ssrGames;
  }
  onProgress(total, total);
  return {
    games, weight: wins / games - 0.5, referenceWeight: referenceWins / games - 0.5,
    delta, margin, ssrVsUr,
    verdict: unchanged ? "inchangé" : delta > margin ? "plus fort" : delta < -margin ? "plus faible" : "comparable",
  };
}
