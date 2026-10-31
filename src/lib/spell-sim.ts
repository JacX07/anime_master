// Simulation d'un sort du Spell Builder (docs/specs/combat.md §12) : mêmes mesures que scripts/simulate-spells.ts.
// Asynchrone par paquets de combats pour que la progression puisse être diffusée.

import type { Rarity } from "../generated/prisma/enums";
import { battle, seededRandom, type BattleCard, type Random } from "./battle";
import { prisma } from "./db";
import type { CharacterSpell } from "./spells";

export const TARGET = 0.04, TOO_STRONG = 0.06, USELESS = 0.01;

export interface SimResult {
  games: number;
  /** Poids du sort : victoires de l'équipe avec le sort − 0,5 (même équipe sans le sort, camps alternés) */
  weight: number;
  /** SSR seulement : victoires de 4 SSR (dont la carte, avec sorts) contre 4 UR sans sorts */
  ssrVsUr: number | null;
  verdict: "trop fort" | "ok" | "inutile";
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

export async function simulateSpell(
  characterId: number,
  spell: CharacterSpell,
  games: number,
  onProgress: (done: number, total: number) => void,
  seed = 42,
): Promise<SimResult> {
  const rows = await cardRows();
  const row = rows.find((r) => r.id === characterId);
  if (!row) throw new Error("Personnage introuvable (ou ni SSR ni UR)");
  const rng: Random = seededRandom(seed);
  const any = <T>(l: T[]) => l[Math.floor(rng() * l.length)];
  const by = (r: Rarity) => rows.filter((x) => x.rarity === r).map(toCard);
  const same = by(row.rarity), urs = by("UR"), ssrs = by("SSR");
  const card: BattleCard = { ...toCard(row), spell };
  const ssrGames = row.rarity === "SSR" ? Math.round(games / 2) : 0;
  const total = games + ssrGames;
  let done = 0;

  /** Victoire du camp A, camps alternés d'un combat à l'autre */
  const run = async (n: number, make: () => [BattleCard[], BattleCard[]]) => {
    let w = 0;
    for (let g = 0; g < n; g++) {
      const [a, b] = make();
      const swap = g % 2 === 1;
      const r = swap ? battle(b, a, rng) : battle(a, b, rng);
      const win = swap ? r.winner === "B" : r.winner === "A";
      w += win ? 1 : r.winner === null ? 0.5 : 0;
      if (++done % 100 === 0) {
        onProgress(done, total);
        await tick();
      }
    }
    return w / n;
  };

  const weight =
    (await run(games, () => {
      const mates = [0, 1, 2].map(() => ({ ...any(same), noSpell: true }));
      return [[card, ...mates], [{ ...card, noSpell: true, spell: undefined }, ...mates.map((m) => ({ ...m }))]];
    })) - 0.5;
  const ssrVsUr = ssrGames
    ? await run(ssrGames, () => [[card, any(ssrs), any(ssrs), any(ssrs)], [0, 1, 2, 3].map(() => ({ ...any(urs), noSpell: true }))])
    : null;
  onProgress(total, total);
  return { games, weight, ssrVsUr, verdict: weight > TOO_STRONG ? "trop fort" : weight < USELESS ? "inutile" : "ok" };
}
