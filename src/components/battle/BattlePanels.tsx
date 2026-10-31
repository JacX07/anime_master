"use client";

import { useEffect, useRef } from "react";
import type { CardType } from "@/generated/prisma/enums";
import { affinity as typeAffinity, BATTLE, hasCharacterSlots, type Side, type Spell, type UnitId, type UnitView } from "@/lib/battle";
import { TYPE_LABELS } from "@/lib/labels";
import { basicAttackOf, describeBasicAttack } from "@/lib/basic-attacks";
import { AFFINITY_COOLDOWN, BASE_SPELL, SPELL_INFO, SPELL_NAMES, spellLabel, STATUS_INFO, type HistoryEntry, type Replay } from "@/lib/battle-replay";
import { describeSpell, spellOf, SPELL_COOLDOWN, SPELL_TARGET_LABEL } from "@/lib/spells";
import { TERTIARY_SPELLS } from "@/lib/tertiary-catalog";
import { ULTIMATE_CATALOG } from "@/lib/ultimate-catalog";
import { balanceSecondary, powerTertiaryDamage } from "@/lib/character-skills";
import { TypeIcon } from "../icons";
import type { PlayerCharacter } from "./BattlePlayer";

const num = new Intl.NumberFormat("fr-FR");

/** Sorts de la carte choisie : base, affilié, secondaire, tertiaire et ultime. */
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
    /** Actions à attendre avant le sort de personnage */
    waitSpecial: number;
    /** Actions à attendre avant le tertiaire */
    waitTertiary: number;
    busy: boolean;
    error?: string | null;
    onSpell: (spell: Spell) => void;
  };
}) {
  const affinity = SPELL_INFO[unit.type];
  const types = Object.keys(TYPE_LABELS) as CardType[];
  const strongVs = types.find((t) => typeAffinity(unit.type, t) > 1)!;
  const weakVs = types.find((t) => typeAffinity(unit.type, t) < 1)!;
  const basic = basicAttackOf(unit.characterId, unit.rarity, unit.type);
  const spells: { key: Spell; title: React.ReactNode; target: string; text: string; tooltip: string; note: string | null }[] = [
    { key: "base" as const, title: <>{basic?.name ?? BASE_SPELL.name}</>, target: BASE_SPELL.target, text: basic ? describeBasicAttack(basic, false) : BASE_SPELL.text, tooltip: basic ? describeBasicAttack(basic) : BASE_SPELL.details, note: null },
  ];
  // Les SSR et UR n'ont pas de sort de type : leurs 4 emplacements sont personnalisés
  if (!hasCharacterSlots(unit.rarity)) {
    spells.push({ key: "affinity" as const, title: <><TypeIcon type={unit.type} /> {SPELL_NAMES[unit.type]}</>, target: affinity.target, text: affinity.text, tooltip: affinity.details, note: AFFINITY_COOLDOWN });
  }
  const rawOwn = spellOf(unit.characterId, unit.rarity, unit.type);
  const own = rawOwn ? balanceSecondary(rawOwn, BATTLE.secondaryEffectScale) : null;
  if (own) {
    spells.push({
      key: "special" as const,
      title: <>★ {own.name}</>,
      target: SPELL_TARGET_LABEL[own.target ?? "none"],
      text: describeSpell(own),
      tooltip: describeSpell(own, true),
      note: `Rechargement : ${SPELL_COOLDOWN} tours.`,
    });
  }
  const ultimateGauge = unit.ultimateGauge ?? 0;
  const ultimateGaugeMax = unit.ultimateGaugeMax ?? BATTLE.ultimateGaugeMax;
  const rawTertiary = hasCharacterSlots(unit.rarity) ? TERTIARY_SPELLS[unit.characterId] : undefined;
  const tertiary = rawTertiary ? powerTertiaryDamage(rawTertiary, BATTLE.tertiaryDamageScale) : undefined;
  if (tertiary) {
    spells.push({
      key: "tertiary",
      title: <>◇ {tertiary.name}</>,
      target: SPELL_TARGET_LABEL[tertiary.target ?? "none"],
      text: describeSpell(tertiary),
      tooltip: describeSpell(tertiary, true),
      note: `Rechargement : ${BATTLE.tertiaryCooldown} tours.`,
    });
  }
  const ultimate = hasCharacterSlots(unit.rarity) ? ULTIMATE_CATALOG[unit.characterId] : undefined;
  if (ultimate) {
    spells.push({
      key: "ultimate",
      title: <>✦ {ultimate.name}</>,
      target: SPELL_TARGET_LABEL[ultimate.target ?? "none"],
      text: describeSpell(ultimate),
      tooltip: describeSpell(ultimate, true),
      note: `Jauge : ${ultimateGauge}/${ultimateGaugeMax} · +${BATTLE.ultimateGaugeBase} par attaque de base réussie, +${BATTLE.ultimateGaugePerHit} par sort offensif réussi.`,
    });
  }
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
              : "Touche à nouveau la carte pour suivre le tour"}
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
          const wait = s.key === "special" ? choose?.waitSpecial ?? 0 : s.key === "tertiary" ? choose?.waitTertiary ?? 0 : choose?.wait ?? 0;
          const ready = !choose || choose.choices.some((c) => c.spell === s.key);
          const turnsWait = s.key === "affinity" || s.key === "special" || s.key === "tertiary";
          const body = (
            <>
              <b>{s.title}</b>
              <em>{s.target}</em>
              <p>{s.text}</p>
              {s.note && <small>{choose && !ready && turnsWait ? `Prêt dans ${wait} tour${wait > 1 ? "s" : ""}.` : s.note}</small>}
              {choose && !ready && turnsWait && s.key !== "base" && wait > 0 && (
                <span className="bt-wait" aria-hidden>
                  {wait}
                </span>
              )}
              <span id={`bt-spell-detail-${unit.id}-${s.key}`} hidden>{s.tooltip}</span>
            </>
          );
          return choose ? (
            <button
              key={s.key}
              type="button"
              className="bt-spell"
              title={s.tooltip}
              aria-describedby={`bt-spell-detail-${unit.id}-${s.key}`}
              data-type={s.key === "affinity" ? unit.type : undefined} data-special={s.key === "special" || s.key === "tertiary" || s.key === "ultimate" || undefined} data-ultimate={s.key === "ultimate" || undefined}
              aria-pressed={choose.spell === s.key}
              disabled={!ready || choose.busy}
              onClick={() => choose.onSpell(s.key)}
            >
              {body}
            </button>
          ) : (
            <div key={s.key} className="bt-spell" tabIndex={0} title={s.tooltip} aria-describedby={`bt-spell-detail-${unit.id}-${s.key}`} data-type={s.key === "affinity" ? unit.type : undefined} data-special={s.key === "special" || s.key === "tertiary" || s.key === "ultimate" || undefined} data-ultimate={s.key === "ultimate" || undefined}>
              {body}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/** Historique des actions : de haut en bas, la plus récente en bas. */
export function History({
  entries,
  rp,
  characters,
  names,
  open,
  onClose,
}: {
  /** Téléphone : tiroir ouvert par-dessus le plateau */
  open: boolean;
  onClose: () => void;
  entries: HistoryEntry[];
  rp: Replay;
  characters: Record<number, PlayerCharacter>;
  names: Record<Side, string>;
}) {
  // Ordre chronologique, la plus récente en bas : la liste suit le combat
  const list = useRef<HTMLOListElement>(null);
  const size = entries.reduce((n, h) => n + 1 + h.effects.length, 0);
  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight });
  }, [size, open]);
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
        return `${name(e.target)} ${e.on ? "reçoit" : "perd"} : ${STATUS_INFO[e.status].label}`;
      case "poison":
        return `−${num.format(Math.round(e.amount))} PV de poison pour ${name(e.target)}`;
      case "revive":
        return `${name(e.target)} revient au combat`;
      case "resist":
        return `${name(e.target)} résiste`;
      case "ko":
        return `${name(e.target)} est K.O.`;
    }
  };
  return (
    <aside className="bt-history" aria-label="Historique des tours" data-open={open || undefined}>
      <h3 className="bt-history-title">
        Historique
        <button type="button" className="bt-btn bt-history-close" onClick={onClose}>
          Fermer
        </button>
      </h3>
      {entries.length === 0 ? (
        <p className="bt-history-empty">Aucun tour pour l&apos;instant.</p>
      ) : (
        <ol ref={list}>
          {entries.map((h) => (
            <li key={h.n} data-side={h.actor[0]}>
              <b>
                {name(h.actor)} <small>{names[h.actor[0] as Side]} · tour {h.round}</small>
              </b>
              <span>
                {spellLabel(h.spell, rp.info[h.actor].type, h.name)}
                {h.target ? ` → ${name(h.target)}` : ""}
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
