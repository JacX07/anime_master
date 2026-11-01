import type { CardType } from "../generated/prisma/enums";
import type { CharacterSpell } from "./spells";

export type MagicSpellSlot = "base" | "affinity" | "special" | "tertiary" | "ultimate";
/** Marquage initial explicite des sorts magiques. Une attaque de base n'est jamais déduite du personnage. */
const MAGIC_SLOTS: Record<number, readonly MagicSpellSlot[]> = Object.fromEntries(
  // Roy Mustang, Roxy, Aqua, Megumin, Emilia, Rem, Howl, Tatsumaki.
  [68, 88350, 89362, 89361, 88572, 88575, 507, 81929].map((id) => [id, ["special", "tertiary", "ultimate"]]),
);
export function isMagicalSpell(card: { characterId: number; type: CardType }, slot: MagicSpellSlot, spell?: CharacterSpell | null) {
  if (spell?.damageKind) return spell.damageKind === "magic";
  if (slot === "affinity") return card.type === "MAGIE";
  return MAGIC_SLOTS[card.characterId]?.includes(slot) ?? false;
}
export const magicSkillMultiplier = (skill: number) => 1 + Math.max(0, skill);
