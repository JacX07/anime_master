// Vérifie les quatre catalogues, leurs limites et l'injection dans le moteur, sans base de données.
import assert from "node:assert/strict";
import { BASIC_ATTACK_ROSTER } from "../src/lib/basic-attack-roster";
import { builderEntries } from "../src/lib/builder-catalog";
import { BUILDER_SLOTS, parseBuilderValue, readSlotDrafts } from "../src/lib/builder-slots";
import { applyAction, createBattle, seededRandom, type BattleCard } from "../src/lib/battle";

let count = 0;
for (const id of Object.keys(BASIC_ATTACK_ROSTER).map(Number)) {
  const entries = builderEntries(id, "SSR", "COMBAT");
  assert.deepEqual(entries.map((s) => s.slot), BUILDER_SLOTS, `Quatre emplacements pour ${id}`);
  for (const entry of entries) {
    const parsed = parseBuilderValue(entry.slot, entry.original);
    assert.ok(parsed, `Sort valide : ${id}/${entry.slot}`);
    // Aucun champ numérique existant ne doit être arrondi ou plafonné à l'enregistrement.
    const numbers = (v: unknown): number[] => {
      if (typeof v === "number") return [v];
      if (!v || typeof v !== "object") return [];
      return Object.entries(v).filter(([k]) => k !== "final").flatMap(([, x]) => numbers(x));
    };
    // parseSpell complète les champs optionnels ; compare seulement les valeurs originales.
    const unchanged = (original: unknown, saved: unknown) => {
      if (!original || typeof original !== "object") return;
      for (const [key, value] of Object.entries(original)) {
        if (typeof value === "number") assert.equal((saved as Record<string, unknown>)[key], value, `${id}/${entry.slot}/${key}`);
        else if (value && typeof value === "object") unchanged(value, (saved as Record<string, unknown>)[key]);
      }
    };
    assert.ok(numbers(parsed).every(Number.isFinite));
    unchanged(entry.original, parsed);
    count++;
  }
}
const entries = builderEntries(13, "SSR", "COMBAT");
const speedSpell = parseBuilderValue("secondary", { name: "Accélération", target: null, effects: [{ k: "mod", stat: "speed", amount: 0.6, turns: 2, to: "team" }] });
assert.ok(speedSpell && "effects" in speedSpell && speedSpell.effects[0].k === "mod" && speedSpell.effects[0].stat === "speed" && speedSpell.effects[0].amount === 0.6);
const secondary = entries[1].original;
assert.deepEqual(readSlotDrafts(secondary), { secondary });
assert.deepEqual(readSlotDrafts({ slots: { secondary, ultimate: entries[3].original } }), { secondary, ultimate: entries[3].original });
assert.equal(parseBuilderValue("base", { name: "Interdit", rider: { kind: "silence", pct: 0.1 } }), null);
assert.equal(parseBuilderValue("base", { name: "Interdit", rider: { kind: "heal", pct: 0.5 } }), null);
assert.equal(parseBuilderValue("base", { name: "Interdit", rider: { kind: "mod", stat: "atk", amount: 0.04, to: "self" } }), null);
const card: BattleCard = { characterId: 13, rarity: "SSR", type: "COMBAT", attack: 1000, defense: 1000, power: 100, franchiseId: null };
const basicAttack = { name: "Base de test", rider: { kind: "heal" as const, pct: 0.01 } };
const st = createBattle([{ ...card, basicAttack }], [card], seededRandom(1), { startingSide: "A" });
st.teams.A[0].hp -= 100;
applyAction(st, { spell: "base", target: "B1" });
assert.ok(st.log.some((e) => e.kind === "action" && e.name === "Base de test"));
assert.ok(st.log.some((e) => e.kind === "heal" && e.target === "A1"));
console.log(`${count} sorts vérifiés, quatre emplacements, sauvegarde historique, limites de base et injection moteur OK.`);
