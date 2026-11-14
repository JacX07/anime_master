import type { UnitId } from "./battle";
import type { Effect } from "./spells";

/** UI confirmation only: a global spell still sends target=null to the engine. */
export type ConfirmationScope = "self" | "team" | "foes" | "fallen-allies";
export function confirmationScope(effects: readonly Effect[]): ConfirmationScope {
  if (effects.some((effect) => effect.k === "arise")) return "fallen-allies";
  if (effects.some((effect) => ("to" in effect && effect.to === "team") || effect.k === "resetCd")) return "team";
  if (effects.some((effect) => ("to" in effect && effect.to === "foes") || effect.k === "damage" || effect.k === "stun" || effect.k === "sleep")) return "foes";
  return "self";
}

/** Individual targets come exclusively from the server, including dead allies. */
export function confirmationTargets(actor: UnitId, targets: readonly (UnitId | null)[], scope: ConfirmationScope, units: Partial<Record<UnitId, { ko: boolean }>>): UnitId[] {
  if (!targets.includes(null)) return targets.filter((id): id is UnitId => id !== null);
  return (Object.keys(units) as UnitId[]).filter((id) => {
    if (scope === "self") return id === actor && !units[id]?.ko;
    if (scope === "foes") return id[0] !== actor[0] && !units[id]?.ko;
    return id[0] === actor[0] && (scope === "fallen-allies" ? !!units[id]?.ko : !units[id]?.ko);
  });
}
