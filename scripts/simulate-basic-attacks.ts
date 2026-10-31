// Mesure l'effet isolé des attaques de base SSR/UR contre une copie identique sans leur petit effet.
// Usage : PATH=/.../node/v24/bin:$PATH npx tsx scripts/simulate-basic-attacks.ts [--games 5000] [--seed 42]
import { mkdirSync, writeFileSync } from "node:fs";
import type { Rarity } from "../src/generated/prisma/enums";
import { battle, seededRandom, type BattleCard, type Random } from "../src/lib/battle";
import { basicAttackOf, describeBasicRider } from "../src/lib/basic-attacks";
import { prisma } from "../src/lib/db";

const arg = (name: string, fallback: number) => {
  const index = process.argv.indexOf(name);
  return index < 0 ? fallback : Number(process.argv[index + 1]);
};
const GAMES = arg("--games", 5000);
const SEED = arg("--seed", 42);
const idsIndex = process.argv.indexOf("--ids");
const onlyIds = idsIndex < 0 ? null : process.argv[idsIndex + 1].split(",").map(Number);
const reportIndex = process.argv.indexOf("--report");
const reportPath = reportIndex < 0 ? "docs/reports/basic-attacks-simulation.md" : process.argv[reportIndex + 1];
const pct = (n: number) => `${n.toFixed(2)} %`;
const pp = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(2)} pp`;
const pick = <T>(list: T[], rng: Random) => list[Math.floor(rng() * list.length)];
const withoutRiders = (team: BattleCard[]) => team.map((card) => ({ ...card, noBasicAttack: true }));

async function main() {
  if (!Number.isInteger(GAMES) || GAMES < 1) throw new Error("--games doit être un entier positif");
  const rows = await prisma.character.findMany({
    where: { disabled: false, rarity: { in: ["SSR", "UR"] } },
    select: {
      id: true, name: true, rarity: true, type: true, attack: true, defense: true, power: true,
      mainMediaId: true, mainMedia: { select: { franchiseId: true } },
    },
    orderBy: { id: "asc" },
  });
  if (rows.length < 236) throw new Error(`Roster SSR/UR incomplet : ${rows.length} personnages`);
  const pool = rows.map((row) => ({
    name: row.name,
    card: {
      characterId: row.id, rarity: row.rarity, type: row.type, attack: row.attack, defense: row.defense,
      power: row.power, franchiseId: row.mainMedia?.franchiseId ?? row.mainMediaId,
    } satisfies BattleCard,
  }));
  const cardsByRarity = (rarity: Rarity) => pool.filter((entry) => entry.card.rarity === rarity).map((entry) => entry.card);
  const selected = onlyIds ? pool.filter((entry) => onlyIds.includes(entry.card.characterId)) : pool;
  if (onlyIds && selected.length !== onlyIds.length) throw new Error(`ID SSR/UR absent : ${onlyIds.join(",")}`);
  const results: { id: number; name: string; rarity: Rarity; attackName: string; effect: string; rate: number; delta: number; ci: number; baseActions: number }[] = [];

  for (const entry of selected) {
    const attack = basicAttackOf(entry.card.characterId, entry.card.rarity, entry.card.type);
    if (!attack) throw new Error(`Attaque absente : ${entry.name} (${entry.card.characterId})`);
    const pairScores: number[] = [];
    let treatmentBaseActions = 0;
    const roster = cardsByRarity(entry.card.rarity);
    for (let game = 0; game < GAMES; game++) {
      const sample = seededRandom(SEED + entry.card.characterId * 104729 + game);
      const mates = [0, 1, 2].map(() => pick(roster, sample));
      const armed = [entry.card, ...withoutRiders(mates)];
      const plain = withoutRiders(armed);
      const battleSeed = SEED + entry.card.characterId * 1000003 + game * 2;
      let pairWins = 0;
      for (const treatmentSide of ["A", "B"] as const) {
        const treatedFirst = treatmentSide === "A";
        const result = treatedFirst
          ? battle(armed, plain, seededRandom(battleSeed))
          : battle(plain, armed, seededRandom(battleSeed));
        const treatedWinner = result.winner === treatmentSide;
        if (treatedWinner) pairWins += 1;
        else if (result.winner === null) pairWins += 0.5;
        const actor = treatmentSide === "A" ? "A1" : "B1";
        treatmentBaseActions += result.log.filter((event) => event.kind === "action" && event.actor === actor && event.spell === "base").length;
      }
      pairScores.push(pairWins / 2);
    }
    const rate = pairScores.reduce((sum, value) => sum + value, 0) / GAMES;
    const delta = (rate - 0.5) * 100;
    const variance = pairScores.reduce((sum, value) => sum + (value - rate) ** 2, 0) / Math.max(1, GAMES - 1);
    const ci = 1.96 * Math.sqrt(variance / GAMES) * 100;
    results.push({
      id: entry.card.characterId, name: entry.name, rarity: entry.card.rarity,
      attackName: attack.name, effect: describeBasicRider(attack.rider), rate: rate * 100,
      delta, ci, baseActions: treatmentBaseActions / (GAMES * 2),
    });
  }

  const aggregatePairs: number[] = [];
  for (let game = 0; game < GAMES; game++) {
    const sample = seededRandom(SEED * 7 + game);
    const mixed = [
      ...[0, 1].map(() => pick(cardsByRarity("UR"), sample)),
      ...[0, 1].map(() => pick(cardsByRarity("SSR"), sample)),
    ];
    const plain = withoutRiders(mixed);
    const seed = SEED * 11 + game;
    const first = battle(mixed, plain, seededRandom(seed));
    const second = battle(plain, mixed, seededRandom(seed));
    const score = (result: typeof first, side: "A" | "B") => result.winner === side ? 1 : result.winner === null ? 0.5 : 0;
    aggregatePairs.push((score(first, "A") + score(second, "B")) / 2);
  }
  const aggregateRate = aggregatePairs.reduce((sum, value) => sum + value, 0) / GAMES;
  const aggregateVariance = aggregatePairs.reduce((sum, value) => sum + (value - aggregateRate) ** 2, 0) / Math.max(1, GAMES - 1);
  const aggregateCi = 1.96 * Math.sqrt(aggregateVariance / GAMES) * 100;
  const deltas = results.map((result) => result.delta);
  const averageDelta = deltas.reduce((sum, value) => sum + value, 0) / deltas.length;
  const low = [...results].sort((a, b) => a.delta - b.delta).slice(0, 8);
  const high = [...results].sort((a, b) => b.delta - a.delta).slice(0, 8);
  const sorted = [...results].sort((a, b) => a.id - b.id);
  const lines = [
    `# Simulation : ${results.length} attaque${results.length > 1 ? "s" : ""} de base SSR/UR`,
    "",
    `- Échantillon : **${GAMES} paires de combats par personnage** (${GAMES * 2} combats/personnage), graine ${SEED}.`,
    "- Méthode : même équipe et mêmes stats des deux côtés ; l'équipe traitée garde ses effets de base et son adversaire miroir les désactive. Chaque paire réutilise la même graine avec les camps inversés, pour neutraliser le premier joueur et réduire le bruit aléatoire. Les sorts, passifs, synergies, raretés, types et stats réels restent actifs. Le tableau estime l'effet du rider de base, pas la qualité brute du personnage.",
    `- Ensemble des riders actifs : **${pct(aggregateRate * 100)} de victoires** contre le même roster sans riders (${pp((aggregateRate - 0.5) * 100)}, ±${aggregateCi.toFixed(2)} pp à 95 %).`,
    `- Effet moyen par personnage : **${pp(averageDelta)}** ; ${results.filter((result) => result.delta - result.ci > 1).length} attaque(s) dépasse(nt) +1 pp au-delà de l'IC 95 %, ${results.filter((result) => result.delta + result.ci < 0).length} effet(s) sont probablement négatifs (IC 95 % entièrement sous 0).`,
    "",
    "## Plus forts",
    "",
    "| Personnage | Attaque | Effet | Impact estimé | IC 95 % |",
    "|---|---|---|---:|---:|",
    ...high.map((result) => `| ${result.name} (${result.rarity}) | ${result.attackName} | ${result.effect} | ${pp(result.delta)} | ±${result.ci.toFixed(2)} pp |`),
    "",
    "## Plus faibles",
    "",
    "| Personnage | Attaque | Effet | Impact estimé | IC 95 % |",
    "|---|---|---|---:|---:|",
    ...low.map((result) => `| ${result.name} (${result.rarity}) | ${result.attackName} | ${result.effect} | ${pp(result.delta)} | ±${result.ci.toFixed(2)} pp |`),
    "",
    "## Résultats complets",
    "",
    "L'impact est la variation du taux de victoire face au clone sans rider. La cible indicative de la spec est de 0 à +1 point ; les intervalles à 95 % sont calculés sur la dispersion des paires de combats communes.",
    "",
    "| ID | Personnage | Rareté | Attaque | Effet | Victoires | Impact | IC 95 % | Attaques de base par combat | Verdict |",
    "|---:|---|---|---|---|---:|---:|---:|---:|---|",
    ...sorted.map((result) => {
      const verdict = result.delta - result.ci > 1 ? "au-dessus de la cible" : result.delta + result.ci < 0 ? "probablement négatif" : "dans la marge";
      return `| ${result.id} | ${result.name} | ${result.rarity} | ${result.attackName} | ${result.effect} | ${pct(result.rate)} | ${pp(result.delta)} | ±${result.ci.toFixed(2)} pp | ${result.baseActions.toFixed(2)} | ${verdict} |`;
    }),
    "",
  ];
  mkdirSync("docs/reports", { recursive: true });
  writeFileSync(reportPath, `${lines.join("\n")}\n`);
  console.log(lines.join("\n"));
}

main().finally(() => prisma.$disconnect());
