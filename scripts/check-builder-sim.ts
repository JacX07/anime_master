// Régression Gojo : un sort d'origine ne doit jamais être signalé comme une modification trop forte.
import assert from "node:assert/strict";
import { builderEntries } from "../src/lib/builder-catalog";
import { parseBuilderValue } from "../src/lib/builder-slots";
import { cardRows, simulateSpell } from "../src/lib/spell-sim";
import { prisma } from "../src/lib/db";

async function main() {
  const row = (await cardRows()).find((r) => r.id === 127691);
  assert.ok(row, "Gojo doit être présent dans la base locale");
  const entries = builderEntries(row.id, row.rarity, row.type);
  for (const entry of entries) {
    // Même normalisation que la route HTTP, qui complète les champs optionnels.
    const input = parseBuilderValue(entry.slot, entry.original);
    assert.ok(input);
    let done = 0, total = 0;
    const result = await simulateSpell(row.id, input, 500, (d, t) => { done = d; total = t; }, 42, entry.slot);
    assert.equal(result.verdict, "inchangé", entry.slot);
    assert.equal(result.delta, 0, entry.slot);
    assert.equal(result.margin, 0, entry.slot);
    assert.equal(result.weight, result.referenceWeight, entry.slot);
    assert.equal(done, total);
    console.log(`Gojo/${entry.slot} : inchangé, écart nul, progression complète`);
  }
  const secondary = entries.find((e) => e.slot === "secondary")!.original;
  const renamed = await simulateSpell(row.id, { ...secondary, name: "Autre nom" }, 100, () => {});
  assert.equal(renamed.verdict, "inchangé", "Un nom ne change pas la puissance");
  const weak = { name: "Frappe faible", target: "foe" as const, effects: [{ k: "damage" as const, mult: 0.05 }] };
  const reduced = await simulateSpell(row.id, weak, 500, () => {});
  assert.ok(reduced.delta < 0);
  assert.equal(reduced.verdict, "plus faible");
  assert.ok(reduced.margin > 0);
  const strong = { name: "Frappe renforcée", target: null, effects: [{ k: "damage" as const, mult: 5, zone: true, pierce: true, critSure: true }] };
  const increased = await simulateSpell(row.id, strong, 500, () => {});
  assert.ok(increased.delta > 0);
  assert.equal(increased.verdict, "plus fort");
  assert.equal(increased.referenceWeight, reduced.referenceWeight, "La référence doit garder les mêmes équipes et graines quel que soit le brouillon");
  console.log("Sorts affaibli et renforcé détectés face à une référence fixe, renommage sans impact : OK.");
}
main().finally(() => prisma.$disconnect()).catch((e) => { console.error(e); process.exitCode = 1; });
