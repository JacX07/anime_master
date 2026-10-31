import { basicAttackOf } from "./basic-attacks";
import { BATTLE } from "./battle";
import { balanceSecondary, powerTertiaryDamage } from "./character-skills";
import { spellOf, SPELL_COOLDOWN } from "./spells";
import { TERTIARY_SPELLS } from "./tertiary-catalog";
import { ULTIMATE_CATALOG } from "./ultimate-catalog";
import { readSlotDrafts, type BuilderEntry } from "./builder-slots";
import type { CardType, Rarity } from "../generated/prisma/enums";

/** Valeurs réellement jouées, après les éventuels coefficients des anciens catalogues. */
export function builderEntries(id: number, rarity: Rarity, type: CardType, saved?: unknown): BuilderEntry[] {
  const drafts = readSlotDrafts(saved);
  const base = basicAttackOf(id, rarity, type);
  const secondary = spellOf(id, rarity, type);
  const tertiary = TERTIARY_SPELLS[id];
  const ultimate = ULTIMATE_CATALOG[id];
  return [
    ...(base ? [{ slot: "base" as const, original: base, custom: drafts.base ?? null, timing: "Chaque action · 1× ATK et un petit effet" }] : []),
    ...(secondary ? [{ slot: "secondary" as const, original: balanceSecondary(secondary, BATTLE.secondaryEffectScale), custom: drafts.secondary ?? null, timing: `Dès la première action · recharge ${SPELL_COOLDOWN} actions` }] : []),
    ...(tertiary ? [{ slot: "tertiary" as const, original: powerTertiaryDamage(tertiary, BATTLE.tertiaryDamageScale), custom: drafts.tertiary ?? null, timing: `Dès la première action · recharge ${BATTLE.tertiaryCooldown} actions` }] : []),
    ...(ultimate ? [{ slot: "ultimate" as const, original: ultimate, custom: drafts.ultimate ?? null, timing: `Jauge ${BATTLE.ultimateGaugeMax} · base réussie +${BATTLE.ultimateGaugeBase}, sort offensif réussi +${BATTLE.ultimateGaugePerHit}` }] : []),
  ];
}
