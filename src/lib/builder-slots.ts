import { describeBasicAttack, type BasicAttack } from "./basic-attacks";
import { parseSpell } from "./spell-schema";
import { describeSpell, type CharacterSpell } from "./spells";

export const SLOT_LABELS = { base: "Attaque de base", secondary: "Secondaire", tertiary: "Tertiaire", ultimate: "Ultime" } as const;
export type BuilderSlot = keyof typeof SLOT_LABELS;
export const BUILDER_SLOTS = Object.keys(SLOT_LABELS) as BuilderSlot[];
export type BuilderValue = BasicAttack | CharacterSpell;
export type SlotDrafts = Partial<Record<BuilderSlot, BuilderValue>>;
export interface BuilderEntry { slot: BuilderSlot; original: BuilderValue; custom: BuilderValue | null; timing: string }
export const isBuilderSlot = (s: unknown): s is BuilderSlot => typeof s === "string" && Object.hasOwn(SLOT_LABELS, s);
export const describeBuilderSpell = (s: BuilderValue, detailed = false) => "rider" in s ? describeBasicAttack(s, detailed) : describeSpell(s, detailed);

/** Les anciennes sauvegardes sont des secondaires seuls. */
export function readSlotDrafts(raw: unknown): SlotDrafts {
  if (!raw || typeof raw !== "object") return {};
  if ("slots" in raw && raw.slots && typeof raw.slots === "object") return raw.slots as SlotDrafts;
  return "effects" in raw ? { secondary: raw as CharacterSpell } : {};
}

/** La base garde 1× ATK et un seul petit effet, conformément au §4 ter. */
export function parseBuilderValue(slot: BuilderSlot, raw: unknown): BuilderValue | null {
  if (slot !== "base") {
    const spell = parseSpell(raw);
    return spell ? { ...spell, final: true } : null;
  }
  if (!raw || typeof raw !== "object" || !("name" in raw) || typeof raw.name !== "string" || !raw.name.trim() || !("rider" in raw)) return null;
  const r = raw.rider;
  if (!r || typeof r !== "object" || !("kind" in r)) return null;
  const name = raw.name.trim().slice(0, 60);
  if (r.kind === "mod" && "stat" in r && ["atk", "def", "crit", "dodge"].includes(String(r.stat)) &&
      "to" in r && (r.to === "self" || r.to === "target") && "amount" in r && typeof r.amount === "number" && Number.isFinite(r.amount) && Math.abs(r.amount) <= 0.03) {
    return { name, rider: { kind: "mod", stat: r.stat as "atk" | "def" | "crit" | "dodge", to: r.to, amount: r.amount } };
  }
  const caps = { heal: 0.02, shield: 0.02, poison: 0.005, drain: 0.02, ignoreDef: 0.03 };
  if (typeof r.kind !== "string" || !Object.hasOwn(caps, r.kind) || !("pct" in r) || typeof r.pct !== "number" || !Number.isFinite(r.pct) || r.pct < 0 || r.pct > caps[r.kind as keyof typeof caps]) return null;
  return { name, rider: { kind: r.kind as keyof typeof caps, pct: r.pct } };
}

export function builderSpellSource(id: number, slot: BuilderSlot, value: BuilderValue): string {
  if (slot === "base") return `// BASIC_ATTACK_ROSTER[${id}].attack\n${JSON.stringify(value, null, 2)}`;
  return `// skill-data.json : entrée ${id}, emplacement ${slot}\n${JSON.stringify(value, null, 2)}`;
}
