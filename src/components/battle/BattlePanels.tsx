"use client";

import type { Side, UnitId, UnitView } from "@/lib/battle";
import { AFFINITY_COOLDOWN, BASE_SPELL, SPELL_INFO, SPELL_NAMES, type HistoryEntry, type Replay } from "@/lib/battle-replay";
import { TypeIcon } from "../icons";
import type { PlayerCharacter } from "./BattlePlayer";

const num = new Intl.NumberFormat("fr-FR");
const STATE_LABELS = { exposed: "exposé", weaken: "affaibli", elan: "en élan" } as const;

/** Sorts de la carte choisie : sort de base et sort affilié de son type. */
export function SpellsPanel({ unit, character, followsAction }: { unit: UnitView; character?: PlayerCharacter; followsAction: boolean }) {
  const affinity = SPELL_INFO[unit.type];
  return (
    <section className="bt-spells" aria-label={`Sorts de ${character?.name ?? unit.id}`}>
      <h3 className="bt-spells-title">
        {character?.name}{" "}
        <small>
          ATK {num.format(Math.round(unit.atk))} · DEF {num.format(Math.round(unit.def))} · PV {num.format(Math.round(unit.maxHp))}
        </small>
        <small>{followsAction ? "Touche une carte pour voir ses sorts" : "Touche à nouveau la carte pour suivre l'action"}</small>
      </h3>
      <div className="bt-spell-list">
        <div className="bt-spell">
          <b>{BASE_SPELL.name}</b>
          <em>{BASE_SPELL.target}</em>
          <p>{BASE_SPELL.text}</p>
        </div>
        <div className="bt-spell" data-type={unit.type}>
          <b>
            <TypeIcon type={unit.type} /> {SPELL_NAMES[unit.type]}
          </b>
          <em>{affinity.target}</em>
          <p>{affinity.text}</p>
          <small>{AFFINITY_COOLDOWN}</small>
        </div>
      </div>
    </section>
  );
}

/** Historique des actions : la plus récente en haut. */
export function History({
  entries,
  rp,
  characters,
  names,
}: {
  entries: HistoryEntry[];
  rp: Replay;
  characters: Record<number, PlayerCharacter>;
  names: Record<Side, string>;
}) {
  const name = (id: UnitId) => characters[rp.info[id].characterId]?.name ?? id;
  const line = (e: HistoryEntry["effects"][number]) => {
    switch (e.kind) {
      case "damage": {
        const notes = [e.crit && "critique", e.affinity === "strong" && "efficace", e.affinity === "weak" && "résisté", e.exposedBonus && "exposé", e.absorbed > 0 && `bouclier −${num.format(Math.round(e.absorbed))}`].filter(Boolean);
        return `−${num.format(Math.round(e.amount))} sur ${name(e.target)}${notes.length ? ` · ${notes.join(" · ")}` : ""}`;
      }
      case "dodge":
        return `${name(e.target)} esquive`;
      case "heal":
        return `+${num.format(Math.round(e.amount))} PV pour ${name(e.target)}`;
      case "shield":
        return `+${num.format(Math.round(e.amount))} bouclier pour ${name(e.target)}`;
      case "status":
        return `${name(e.target)} ${e.on ? "est" : "n'est plus"} ${STATE_LABELS[e.status]}`;
      case "ko":
        return `${name(e.target)} est K.O.`;
    }
  };
  return (
    <aside className="bt-history" aria-label="Historique des actions">
      <h3 className="bt-history-title">Historique</h3>
      {entries.length === 0 ? (
        <p className="bt-history-empty">Aucune action pour l&apos;instant.</p>
      ) : (
        <ol>
          {[...entries].reverse().map((h) => (
            <li key={h.n} data-side={h.actor[0]}>
              <b>
                {name(h.actor)} <small>{names[h.actor[0] as Side]} · tour {h.round}</small>
              </b>
              <span>
                {h.spell === "base" ? BASE_SPELL.name : SPELL_NAMES[rp.info[h.actor].type]}
                {h.target ? ` → ${name(h.target)}` : " → tous les ennemis"}
              </span>
              <ul>
                {h.effects.map((e, i) => (
                  <li key={i}>{line(e)}</li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      )}
    </aside>
  );
}
