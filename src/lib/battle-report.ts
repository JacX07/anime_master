import type { BattleEvent, UnitId, UnitView } from "./battle";

export type BattleReportRow = { id: UnitId; characterId: number; dealt: number; taken: number; absorbed: number; healing: number; shields: number; actions: number; kos: number };
/** Scores effectifs : PV réellement retirés + bouclier absorbé, sans sur-dégâts ni sur-soins. */
export function battleReport(log: BattleEvent[]) {
  const rows = new Map<UnitId, BattleReportRow>();
  const hp = new Map<UnitId, number>();
  const pendingKO = new Map<UnitId, UnitId>();
  let unattributed = 0;
  for (const event of log) {
    if (event.kind === "start") for (const unit of event.units) {
      rows.set(unit.id, { id: unit.id, characterId: unit.characterId, dealt: 0, taken: 0, absorbed: 0, healing: 0, shields: 0, actions: 0, kos: 0 });
      hp.set(unit.id, unit.hp);
    }
    if (event.kind === "action") { const row = rows.get(event.actor); if (row) row.actions++; }
    if (event.kind === "damage" || event.kind === "poison") {
      const lost = Math.max(0, (hp.get(event.target) ?? event.hp) - event.hp);
      const absorbed = event.kind === "damage" ? Math.max(0, event.absorbed) : 0;
      const target = rows.get(event.target);
      if (target) { target.taken += lost; target.absorbed += absorbed; }
      const source = event.source;
      if (source && source[0] !== event.target[0]) {
        const attacker = rows.get(source);
        if (attacker) attacker.dealt += lost + absorbed;
        if (lost > 0 && event.hp <= 0) pendingKO.set(event.target, source);
      } else if (event.kind === "poison" && !source) unattributed += lost;
      hp.set(event.target, event.hp);
    }
    if (event.kind === "heal") {
      const amount = Math.max(0, event.hp - (hp.get(event.target) ?? event.hp));
      const healer = rows.get(event.source); if (healer) healer.healing += amount;
      hp.set(event.target, event.hp);
    }
    if (event.kind === "revive") { hp.set(event.target, event.hp); pendingKO.delete(event.target); }
    if (event.kind === "shield" && event.source && event.amount > 0) { const row = rows.get(event.source); if (row) row.shields += event.amount; }
    if (event.kind === "ko") {
      const killer = pendingKO.get(event.target); const row = killer ? rows.get(killer) : null;
      if (row) row.kos++;
      pendingKO.delete(event.target);
      hp.set(event.target, 0);
    }
  }
  return { rows: [...rows.values()], unattributed };
}

/** Longueur du bandeau « Ordre » : un tour complet de 4 contre 4. */
export const TURN_ORDER_LENGTH = 8;

/** En replay, le journal est l'ordre exact ; en direct rattrapé, la file serveur fait autorité. */
export function replayTurnOrder(log: BattleEvent[], index: number, current: UnitId | null, info: Partial<Record<UnitId, UnitView>>, dead: (id: UnitId) => boolean, live?: UnitId[], pending: UnitId[] = []) {
  // La prévision doit correspondre à l'action visible, même si le serveur a déjà joué la suite.
  const action = log.slice(0, index).findLast(event => event.kind === "action" && event.actor === current);
  const forecast = action?.kind === "action" ? action.turnOrder : undefined;
  const ids = live ?? (forecast ? [...forecast, ...pending] : [ ...(current ? [current] : []), ...log.slice(index).flatMap((event) => event.kind === "action" || event.kind === "skip" ? [event.actor] : []), ...pending ]);
  // v0.3.0 : toute la file prévue (alliés et ennemis), pas seulement les 5 prochains
  return ids.filter((id) => info[id] && !dead(id)).slice(0, TURN_ORDER_LENGTH);
}
