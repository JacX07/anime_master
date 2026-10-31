// Compare role mixes on the real combat engine. Orientation is only a simulator label from skill-data.json.
// Usage: npm run simulate:compositions -- [--games 500] [--seed 42]
import { battle, type BattleCard, seededRandom } from "../src/lib/battle";
import { orientationOf } from "../src/lib/skill-data";
import { prisma } from "../src/lib/db";

const arg = (name: string, fallback: number) => {
  const i = process.argv.indexOf(name);
  return i < 0 ? fallback : Number(process.argv[i + 1]);
};
const GAMES = arg("--games", 500);
const SEED = arg("--seed", 42);
if (!Number.isInteger(GAMES) || GAMES < 1 || !Number.isFinite(SEED)) throw new Error("--games doit être un entier positif et --seed un nombre fini");
const rng = seededRandom(SEED);
const any = <T>(items: T[]) => items[Math.floor(rng() * items.length)];
const pct = (score: number, n: number) => `${(score / n * 100).toFixed(1)} %`;
const profiles = {
  "Tout-attaque": ["attaque", "attaque", "attaque", "attaque"],
  "Mix équilibré": ["attaque", "soutien", "tank", "controle"],
  "Défense + soutien": ["attaque", "soutien", "tank", "soutien"],
  "Soutien + contrôle": ["attaque", "soutien", "controle", "controle"],
  "Sans soutien": ["attaque", "attaque", "tank", "controle"],
} as const;
type Profile = keyof typeof profiles;

async function main() {
  const rows = await prisma.character.findMany({
    where: { disabled: false, rarity: { in: ["SSR", "UR"] } },
    select: { id: true, rarity: true, type: true, attack: true, defense: true, power: true, mainMediaId: true, mainMedia: { select: { franchiseId: true } } },
  });
  const pool = rows.map((r) => ({
    orientation: orientationOf(r.id),
    card: { characterId: r.id, rarity: r.rarity, type: r.type, attack: r.attack, defense: r.defense, power: r.power, franchiseId: r.mainMedia?.franchiseId ?? r.mainMediaId } as BattleCard,
  })).filter((r) => r.orientation);
  const makeTeam = (profile: Profile): BattleCard[] | null => {
    const result: BattleCard[] = [];
    const roles = [...profiles[profile]];
    for (let index = roles.length - 1; index > 0; index--) {
      const other = Math.floor(rng() * (index + 1));
      [roles[index], roles[other]] = [roles[other], roles[index]];
    }
    for (const [i, role] of roles.entries()) {
      const rarity = i < 2 ? "SSR" : "UR";
      const options = pool.filter((r) => r.orientation === role && r.card.rarity === rarity && !result.some((c) => c.characterId === r.card.characterId));
      if (!options.length) return null;
      result.push(any(options).card);
    }
    return result;
  };
  const makePair = (a: Profile, b: Profile) => {
    // Try several independently sampled teams, then pick the closest total power to limit stat bias.
    const candidates = Array.from({ length: 30 }, () => makeTeam(b)).filter((t): t is BattleCard[] => !!t);
    const teamA = makeTeam(a);
    if (!teamA || !candidates.length) return null;
    const powerA = teamA.reduce((sum, c) => sum + c.power, 0);
    const teamB = candidates.reduce((best, t) => Math.abs(t.reduce((sum, c) => sum + c.power, 0) - powerA) < Math.abs(best.reduce((sum, c) => sum + c.power, 0) - powerA) ? t : best);
    return [teamA, teamB] as const;
  };
  const names = Object.keys(profiles) as Profile[];
  let rounds = 0, timeouts = 0, games = 0;
  console.log(`SSR/UR pool: ${pool.length} personnages avec orientation, ${GAMES} combats par matchup, graine ${SEED}`);
  console.log("Chaque équipe : 2 SSR + 2 UR. Puissance totale appariée au mieux parmi 30 tirages; camps alternés.");
  console.log("Lignes = équipe comparée; cellules = victoires de la ligne. Nuls comptés pour 0,5.");
  console.log(["", ...names].join("\t"));
  for (const a of names) {
    const cells: string[] = [a];
    for (const b of names) {
      let score = 0, n = 0;
      for (let game = 0; game < GAMES; game++) {
        const pair = makePair(a, b);
        if (!pair) continue;
        const [left, right] = pair;
        const swap = game % 2 === 1;
        const result = swap ? battle(right, left, rng) : battle(left, right, rng);
        rounds += result.rounds;
        timeouts += Number(result.timeout);
        games++;
        score += result.winner === null ? 0.5 : (swap ? result.winner === "B" : result.winner === "A") ? 1 : 0;
        n++;
      }
      cells.push(`${pct(score, n)} (${n})`);
    }
    console.log(cells.join("\t"));
  }
  console.log(`Durée moyenne : ${(rounds / games).toFixed(1)} tours ; limite de tours atteinte : ${pct(timeouts, games)}.`);
}
main().finally(() => prisma.$disconnect());
