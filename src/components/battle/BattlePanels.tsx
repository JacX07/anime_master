"use client";

import type { CardType } from "@/generated/prisma/enums";
import { affinity as typeAffinity, type Side, type Spell, type UnitId, type UnitView } from "@/lib/battle";
import { TYPE_LABELS } from "@/lib/labels";
import { AFFINITY_COOLDOWN, BASE_SPELL, SPELL_INFO, SPELL_NAMES, type HistoryEntry, type Replay } from "@/lib/battle-replay";
import { TypeIcon } from "../icons";
import type { PlayerCharacter } from "./BattlePlayer";

const num = new Intl.NumberFormat("fr-FR");
const STATE_LABELS = { exposed: "exposé", weaken: "affaibli", elan: "en élan" } as const;

/** Sorts de la carte choisie : sort de base et sort affilié de son type. */
export function SpellsPanel({
  unit,
  character,
  followsAction,
  choose,
}: {
  unit: UnitView;
  character?: PlayerCharacter;
  followsAction: boolean;
  /** Mode manuel, à ton tour : les sorts deviennent des boutons */
  choose?: {
    choices: { spell: Spell; targets: (UnitId | null)[] }[];
    spell: Spell | null;
    /** Actions à attendre avant le sort affilié de cette carte */
    wait: number;
    busy: boolean;
    error?: string | null;
    onSpell: (spell: Spell) => void;
  };
}) {
  const affinity = SPELL_INFO[unit.type];
  const types = Object.keys(TYPE_LABELS) as CardType[];
  const strongVs = types.find((t) => typeAffinity(unit.type, t) > 1)!;
  const weakVs = types.find((t) => typeAffinity(unit.type, t) < 1)!;
  const spells = [
    { key: "base" as const, title: <>{BASE_SPELL.name}</>, target: BASE_SPELL.target, text: BASE_SPELL.text, note: null },
    { key: "affinity" as const, title: <><TypeIcon type={unit.type} /> {SPELL_NAMES[unit.type]}</>, target: affinity.target, text: affinity.text, note: AFFINITY_COOLDOWN },
  ];
  return (
    <section className="bt-spells" aria-label={`Sorts de ${character?.name ?? unit.id}`} data-choosing={choose ? "" : undefined}>
      <h3 className="bt-spells-title">
        {character?.name}{" "}
        <small>
          ATK {num.format(Math.round(unit.atk))} · DEF {num.format(Math.round(unit.def))} · PV {num.format(Math.round(unit.maxHp))}
        </small>
        <small>
          {choose
            ? choose.busy
              ? "Envoi…"
              : choose.spell
                ? "Touche la cible sur le plateau"
                : "À toi de jouer : choisis un sort"
            : followsAction
              ? "Touche une carte pour voir ses sorts"
              : "Touche à nouveau la carte pour suivre l'action"}
        </small>
      </h3>
      <p className="bt-legend">
        <span data-aff="strong">
          ▲ ×1,1 sur <TypeIcon type={strongVs} /> {TYPE_LABELS[strongVs].name}
        </span>
        <span data-aff="weak">
          ▼ ×0,95 sur <TypeIcon type={weakVs} /> {TYPE_LABELS[weakVs].name} <small>(qui le frappe ×1,1)</small>
        </span>
      </p>
      {choose?.error && (
        <p className="bt-error" role="alert">
          {choose.error}
        </p>
      )}
      <div className="bt-spell-list">
        {spells.map((s) => {
          const ready = !choose || choose.choices.some((c) => c.spell === s.key);
          const body = (
            <>
              <b>{s.title}</b>
              <em>{s.target}</em>
              <p>{s.text}</p>
              {s.note && <small>{choose && !ready ? `Prêt dans ${choose.wait} action${choose.wait > 1 ? "s" : ""}.` : s.note}</small>}
              {choose && !ready && s.key === "affinity" && (
                <span className="bt-wait" aria-hidden>
                  {choose.wait}
                </span>
              )}
            </>
          );
          return choose ? (
            <button
              key={s.key}
              type="button"
              className="bt-spell"
              data-type={s.key === "affinity" ? unit.type : undefined}
              aria-pressed={choose.spell === s.key}
              disabled={!ready || choose.busy}
              onClick={() => choose.onSpell(s.key)}
            >
              {body}
            </button>
          ) : (
            <div key={s.key} className="bt-spell" data-type={s.key === "affinity" ? unit.type : undefined}>
              {body}
            </div>
          );
        })}
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
