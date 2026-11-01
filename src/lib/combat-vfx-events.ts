import type { BattleEvent, UnitId } from "./battle";
import { holdFor } from "./battle-replay";

/** Replay time until each actual hit; support targets never become attack targets. */
export function actionVisualTargets(log: BattleEvent[], index: number): { target: UnitId; at: number; dodge: boolean }[] {
  if (log[index]?.kind !== "action") return [];
  const targets = new Map<UnitId, { target: UnitId; at: number; dodge: boolean }>();
  let at = holdFor(log, index);
  for (let i = index + 1; i < log.length; i++) {
    const event = log[i];
    if (["action", "skip", "end", "round"].includes(event.kind)) break;
    if ((event.kind === "damage" || event.kind === "dodge") && !targets.has(event.target)) {
      targets.set(event.target, { target: event.target, at, dodge: event.kind === "dodge" });
    }
    at += holdFor(log, i);
  }
  return [...targets.values()];
}
