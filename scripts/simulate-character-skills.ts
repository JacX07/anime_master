// Mesure chaque slot personnalisé et le chargement complet SSR/UR contre une copie sans ces effets.
// Usage : npx tsx scripts/simulate-character-skills.ts [--games 1000] [--seed 42] [--report docs/reports/character-skills-simulation.md]
import { mkdirSync, writeFileSync } from "node:fs";
import type { Rarity } from "../src/generated/prisma/enums";
import { BATTLE, battle, seededRandom, type BattleCard, type BattleResult, type Random } from "../src/lib/battle";
import { basicAttackOf, describeBasicRider } from "../src/lib/basic-attacks";
import { spellOf, describeSpell } from "../src/lib/spells";
import { balanceSecondary, powerTertiaryDamage } from "../src/lib/character-skills";
import { TERTIARY_SPELLS } from "../src/lib/tertiary-catalog";
import { ULTIMATE_CATALOG } from "../src/lib/ultimate-catalog";
import { prisma } from "../src/lib/db";

type Slot = "base" | "secondary" | "tertiary" | "ultimate";
const SLOTS: Slot[] = ["base", "secondary", "tertiary", "ultimate"];
const arg = (name: string, fallback: number) => {
  const index = process.argv.indexOf(name);
  return index < 0 ? fallback : Number(process.argv[index + 1]);
};
const GAMES = arg("--games", 1000);
const SEED = arg("--seed", 42);
const reportIndex = process.argv.indexOf("--report");
const reportPath = reportIndex < 0 ? "docs/reports/character-skills-simulation.md" : process.argv[reportIndex + 1];
const pct = (n: number) => `${n.toFixed(2)} %`;
const pp = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(2)} pp`;
const pick = <T>(list: T[], rng: Random) => list[Math.floor(rng() * list.length)];
const SCORE = (result: BattleResult, side: "A" | "B") => result.winner === side ? 1 : result.winner === null ? 0.5 : 0;
const SLOT_LABEL: Record<Slot, string> = { base: "Base", secondary: "Secondaire", tertiary: "Tertiaire", ultimate: "Ultime" };

function seedFor(...parts: number[]) {
  let value = SEED | 0;
  for (const part of parts) value = (Math.imul(value ^ part, 1664525) + 1013904223) | 0;
  return value >>> 0;
}

function withOnlySlot(card: BattleCard, slot: Slot): BattleCard {
  return {
    ...card,
    noBasicAttack: slot !== "base",
    noSpell: slot !== "secondary",
    noTertiary: slot !== "tertiary",
    noUltimate: slot !== "ultimate",
  };
}

const withoutCustom = (card: BattleCard): BattleCard => ({
  ...card, noBasicAttack: true, noSpell: true, noTertiary: true, noUltimate: true,
});
const fullCustom = (card: BattleCard): BattleCard => ({
  ...card, noBasicAttack: false, noSpell: false, noTertiary: false, noUltimate: false,
});

function meanCI(values: number[]) {
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / Math.max(1, values.length - 1);
  return { mean, ci: 1.96 * Math.sqrt(variance / values.length) };
}

function roundOfFirstUltimate(result: BattleResult, side: "A" | "B") {
  let round = 0;
  for (const event of result.log) {
    if (event.kind === "round") round = event.round;
    if (event.kind === "action" && event.spell === "ultimate" && event.actor.startsWith(side)) return round;
  }
  return null;
}

async function main() {
  if (!Number.isInteger(GAMES) || GAMES < 1) throw new Error("--games doit être un entier positif");
  const rows = await prisma.character.findMany({
    where: { disabled: false, rarity: { in: ["SSR", "UR"] } },
    select: { id: true, name: true, rarity: true, type: true, attack: true, defense: true, power: true, mainMediaId: true, mainMedia: { select: { franchiseId: true } } },
    orderBy: { id: "asc" },
  });
  if (rows.length !== 236) throw new Error(`Roster SSR/UR attendu : 236 personnages, reçu : ${rows.length}`);
  const entries = rows.map((row) => ({
    name: row.name,
    card: {
      characterId: row.id, rarity: row.rarity, type: row.type, attack: row.attack, defense: row.defense,
      power: row.power, franchiseId: row.mainMedia?.franchiseId ?? row.mainMediaId,
    } satisfies BattleCard,
  }));
  const byRarity = (rarity: Rarity) => entries.filter((entry) => entry.card.rarity === rarity).map((entry) => entry.card);

  const catalogMissing = entries.filter(({ card }) =>
    !basicAttackOf(card.characterId, card.rarity, card.type) || !spellOf(card.characterId, card.rarity, card.type)
      || !TERTIARY_SPELLS[card.characterId] || !ULTIMATE_CATALOG[card.characterId],
  );
  if (catalogMissing.length) throw new Error(`Fiche manquante pour : ${catalogMissing.map((entry) => entry.name).join(", ")}`);

  const details: { id: number; name: string; rarity: Rarity; slot: Slot; skill: string; effect: string; rate: number; delta: number; ci: number }[] = [];
  for (const entry of entries) {
    for (const [slotIndex, slot] of SLOTS.entries()) {
      let skillName: string;
      let effect: string;
      if (slot === "base") {
        const skill = basicAttackOf(entry.card.characterId, entry.card.rarity, entry.card.type)!;
        skillName = skill.name;
        effect = describeBasicRider(skill.rider);
      } else {
        const skill = slot === "secondary"
          ? balanceSecondary(spellOf(entry.card.characterId, entry.card.rarity, entry.card.type)!, BATTLE.secondaryEffectScale)
          : slot === "tertiary"
            ? powerTertiaryDamage(TERTIARY_SPELLS[entry.card.characterId], BATTLE.tertiaryDamageScale)
            : ULTIMATE_CATALOG[entry.card.characterId];
        skillName = skill.name;
        effect = describeSpell(skill);
      }
      const diffs: number[] = [];
      const pool = byRarity(entry.card.rarity);
      for (let game = 0; game < GAMES; game++) {
        const sample = seededRandom(seedFor(entry.card.characterId, slotIndex, game, 17));
        const mates = [0, 1, 2].map(() => pick(pool, sample));
        const plain = [entry.card, ...mates].map(withoutCustom);
        const armed = [withOnlySlot(entry.card, slot), ...mates.map(withoutCustom)];
        const battleSeed = seedFor(entry.card.characterId, slotIndex, game, 29);
        let diff = 0;
        for (const startingSide of ["A", "B"] as const) {
          const on = battle(armed, plain, seededRandom(battleSeed), { startingSide });
          const off = battle(plain, plain, seededRandom(battleSeed), { startingSide });
          diff += SCORE(on, "A") - SCORE(off, "A");
        }
        diffs.push(diff / 2);
      }
      const { mean, ci } = meanCI(diffs);
      details.push({ id: entry.card.characterId, name: entry.name, rarity: entry.card.rarity, slot, skill: skillName, effect, rate: 50 + mean * 100, delta: mean * 100, ci: ci * 100 });
    }
  }

  const fullResults: { label: string; rate: number; delta: number; ci: number; ultimates: number; launched: number; firstRound: number | null; rounds: number }[] = [];
  const compositions: { label: string; rarity: Rarity[] }[] = [
    { label: "4 SSR", rarity: ["SSR", "SSR", "SSR", "SSR"] },
    { label: "2 UR + 2 SSR", rarity: ["UR", "UR", "SSR", "SSR"] },
    { label: "4 UR", rarity: ["UR", "UR", "UR", "UR"] },
  ];
  for (const [scenarioIndex, scenario] of compositions.entries()) {
    const scores: number[] = [];
    let ultimates = 0, launched = 0, firstRoundSum = 0, rounds = 0;
    for (let game = 0; game < GAMES; game++) {
      const sample = seededRandom(seedFor(scenarioIndex, game, 101));
      const team = scenario.rarity.map((rarity) => pick(byRarity(rarity), sample));
      const full = team.map(fullCustom), plain = team.map(withoutCustom);
      const gameSeed = seedFor(scenarioIndex, game, 211);
      let diff = 0;
      for (const startingSide of ["A", "B"] as const) {
        const result = battle(full, plain, seededRandom(gameSeed), { startingSide });
        const baseline = battle(plain, plain, seededRandom(gameSeed), { startingSide });
        diff += SCORE(result, "A") - SCORE(baseline, "A");
        const firstUlt = roundOfFirstUltimate(result, "A");
        const count = result.log.filter((event) => event.kind === "action" && event.spell === "ultimate" && event.actor.startsWith("A")).length;
        ultimates += count / 2;
        if (count > 0) launched += 0.5;
        if (firstUlt !== null) firstRoundSum += firstUlt / 2;
        rounds += result.rounds / 2;
      }
      scores.push(diff / 2);
    }
    const { mean, ci } = meanCI(scores);
    fullResults.push({
      label: scenario.label, rate: 50 + mean * 100, delta: mean * 100, ci: ci * 100,
      ultimates: ultimates / GAMES, launched: launched / GAMES * 100,
      firstRound: launched ? firstRoundSum / launched : null, rounds: rounds / GAMES,
    });
  }

  const summaries = SLOTS.map((slot) => {
    const group = details.filter((entry) => entry.slot === slot);
    const avg = group.reduce((sum, entry) => sum + entry.delta, 0) / group.length;
    const ssr = group.filter((entry) => entry.rarity === "SSR").reduce((sum, entry) => sum + entry.delta, 0) / group.filter((entry) => entry.rarity === "SSR").length;
    const ur = group.filter((entry) => entry.rarity === "UR").reduce((sum, entry) => sum + entry.delta, 0) / group.filter((entry) => entry.rarity === "UR").length;
    return { slot, count: group.length, avg, ssr, ur };
  });
  const extremes = SLOTS.flatMap((slot) => {
    const group = details.filter((entry) => entry.slot === slot);
    return [
      ...[...group].sort((a, b) => b.delta - a.delta).slice(0, 5).map((entry) => ({ ...entry, group: `${SLOT_LABEL[slot]} — plus forts` })),
      ...[...group].sort((a, b) => a.delta - b.delta).slice(0, 5).map((entry) => ({ ...entry, group: `${SLOT_LABEL[slot]} — plus faibles` })),
    ];
  });
  const verdict = (row: (typeof details)[number]) => row.delta - row.ci > 6 ? "trop fort" : row.delta + row.ci < 1 ? "à renforcer" : "dans la marge";
  const lines = [
    "# Simulation des quatre slots personnalisés SSR/UR",
    "",
    `- Roster : **${entries.length} SSR/UR** ; 4 slots testés par personnage (${details.length} mesures). Graine ${SEED}.`,
    `- Méthode : **${GAMES} paires par personnage et par slot**, soit ${GAMES * 2} combats pour chaque mesure ; équipe miroir avec une seule capacité active contre les mêmes cartes sans capacités personnalisées. Les camps sont inversés. Les passifs UR, la franchise, le type, les statistiques et les sorts affiliés restent identiques. L'impact mesure la capacité isolée, pas la qualité du personnage.`,
    `- Jauge : ${BATTLE.ultimateGaugeMax} points, +${BATTLE.ultimateGaugePerHit} par action offensive réussie, une seule fois même si l'action touche plusieurs adversaires ; l'ultime dépense toute la jauge et ne la recharge pas.`,
    "",
    "## Impact moyen par slot",
    "",
    "| Slot | Fiches | Ensemble | SSR | UR | Cible indicative |",
    "|---|---:|---:|---:|---:|---|",
    ...summaries.map((row) => `| ${SLOT_LABEL[row.slot]} | ${row.count} | ${pp(row.avg)} | ${pp(row.ssr)} | ${pp(row.ur)} | ${row.slot === "base" ? "0 à +1 pp" : "de +1 à +6 pp"} |`),
    "",
    "## Équipe complète",
    "",
    "Les équipes chargées ont leurs quatre slots ; leur clone garde les attaques et sorts affiliés standards. Les deux camps utilisent les mêmes personnages et la simulation inverse le premier joueur.",
    "",
    "| Composition | Victoires de l'équipe complète | Impact vs clone | IC 95 % | Ultimes par combat | Combats avec ultime | 1er ultime (tour moyen) | Durée moyenne |",
    "|---|---:|---:|---:|---:|---:|---:|---:|",
    ...fullResults.map((row) => `| ${row.label} | ${pct(row.rate)} | ${pp(row.delta)} | ±${row.ci.toFixed(2)} pp | ${row.ultimates.toFixed(2)} | ${pct(row.launched)} | ${row.firstRound === null ? "—" : row.firstRound.toFixed(1)} | ${row.rounds.toFixed(1)} tours |`),
    "",
    "## Extrêmes par slot",
    "",
    "L'IC à 95 % provient de la dispersion des paires de combats. Un verdict hors marge sert à repérer les fiches à retoucher ; il ne juge pas la puissance brute du personnage.",
    "",
    "| Groupe | Personnage | Compétence | Effet | Impact | IC 95 % | Verdict |",
    "|---|---|---|---|---:|---:|---|",
    ...extremes.map((row) => `| ${row.group} | ${row.name} (${row.rarity}) | ${row.skill} | ${row.effect} | ${pp(row.delta)} | ±${row.ci.toFixed(2)} pp | ${verdict(row)} |`),
    "",
    "## Détail complet des 944 fiches",
    "",
    "| ID | Personnage | Rareté | Slot | Compétence | Effet | Taux traité | Impact | IC 95 % | Verdict |",
    "|---:|---|---|---|---|---|---:|---:|---:|---|",
    ...details.sort((a, b) => a.id - b.id || SLOTS.indexOf(a.slot) - SLOTS.indexOf(b.slot)).map((row) => `| ${row.id} | ${row.name} | ${row.rarity} | ${SLOT_LABEL[row.slot]} | ${row.skill} | ${row.effect} | ${pct(row.rate)} | ${pp(row.delta)} | ±${row.ci.toFixed(2)} pp | ${verdict(row)} |`),
    "",
  ];
  mkdirSync("docs/reports", { recursive: true });
  writeFileSync(reportPath, `${lines.join("\n").trimEnd()}\n`);
  console.log(lines.slice(0, 44).join("\n"));
  console.log(`\nRapport détaillé écrit dans ${reportPath}`);
}

main().finally(() => prisma.$disconnect());
