"use client";

import { useState } from "react";

import type { CardType } from "@/generated/prisma/enums";
import { affinity as typeAffinity, BATTLE, hasCharacterSlots, type Spell, type UnitId, type UnitView } from "@/lib/battle";
import { TYPE_LABELS } from "@/lib/labels";
import { BOSS_SKILLS } from "@/lib/boss-skills";
import { basicAttackOf, describeBasicAttack } from "@/lib/basic-attacks";
import { AFFINITY_COOLDOWN, BASE_SPELL, SPELL_INFO, SPELL_NAMES } from "@/lib/battle-replay";
import { describeSpell, spellOf, SPELL_COOLDOWN, SPELL_TARGET_LABEL } from "@/lib/spells";
import { describeElement, effectElement } from "@/lib/attack-element";
import { TERTIARY_SPELLS } from "@/lib/tertiary-catalog";
import { ULTIMATE_CATALOG } from "@/lib/ultimate-catalog";
import { balanceSecondary, powerTertiaryDamage } from "@/lib/character-skills";
import { TypeIcon } from "../icons";
import { SpellHand, UltimateEmblem, ULT_COLOR, type HandCard } from "./SpellHand";
import type { PlayerCharacter } from "./BattlePlayer";

const num = new Intl.NumberFormat("fr-FR");

/** Sorts de la carte choisie : base, affilié, secondaire, tertiaire et ultime. */
export function SpellsPanel({
  unit,
  character,
  followsAction,
  choose,
  effects,
}: {
  /** Panneau des effets actifs, accessible dans les détails */
  effects?: React.ReactNode;
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
  const [inspected, setInspected] = useState<{ unit: UnitId; spell: Spell } | null>(null);
  const [hover, setHover] = useState<Spell | null>(null);
  const affinity = SPELL_INFO[unit.type];
  const types = Object.keys(TYPE_LABELS) as CardType[];
  const strongVs = types.find((t) => typeAffinity(unit.type, t) > 1)!;
  const weakVs = types.find((t) => typeAffinity(unit.type, t) < 1)!;
  const boss = unit.boss ? BOSS_SKILLS[unit.characterId] : undefined;
  const basic = boss?.basicAttack ?? basicAttackOf(unit.characterId, unit.rarity, unit.type);
  const spells: { key: Spell; title: React.ReactNode; name: string; kind: string; cost: string; accent: string; target: string; text: string; tooltip: string; note: string | null }[] = [
    { key: "base" as const, title: <>{basic?.name ?? BASE_SPELL.name}</>, name: basic?.name ?? BASE_SPELL.name, kind: "Attaque de base", cost: "0", accent: "#c4a76d", target: BASE_SPELL.target, text: basic ? describeBasicAttack(basic) : BASE_SPELL.text, tooltip: basic ? describeBasicAttack(basic) : BASE_SPELL.details, note: null },
  ];
  // Les SSR et UR n'ont pas de sort de type : leurs 4 emplacements sont personnalisés
  if (!hasCharacterSlots(unit.rarity)) {
    spells.push({ key: "affinity" as const, title: <><TypeIcon type={unit.type} /> {SPELL_NAMES[unit.type]}</>, name: SPELL_NAMES[unit.type], kind: "Affinité", cost: String(BATTLE.spellCooldown), accent: "#d1bd8e", target: affinity.target, text: affinity.text, tooltip: affinity.details, note: AFFINITY_COOLDOWN });
  }
  const rawOwn = spellOf(unit.characterId, unit.rarity, unit.type);
  const element = effectElement(unit.characterId);
  const own = boss?.spell ?? (rawOwn ? balanceSecondary(rawOwn, BATTLE.secondaryEffectScale) : null);
  if (own) {
    spells.push({
      key: "special" as const,
      title: <>★ {own.name}</>, name: own.name, kind: "★ Secondaire", cost: String(SPELL_COOLDOWN), accent: "#5aa9ff",
      target: SPELL_TARGET_LABEL[own.target ?? "none"],
      text: [describeSpell(own, true), element && describeElement(element)].filter(Boolean).join(" "),
      tooltip: [describeSpell(own, true), element && describeElement(element)].filter(Boolean).join(" "),
      note: `Rechargement : ${SPELL_COOLDOWN} tours.`,
    });
  }
  const ultimateGauge = unit.ultimateGauge ?? 0;
  const ultimateGaugeMax = unit.ultimateGaugeMax ?? BATTLE.ultimateGaugeMax;
  const rawTertiary = !boss?.noTertiary && hasCharacterSlots(unit.rarity) ? TERTIARY_SPELLS[unit.characterId] : undefined;
  const tertiary = rawTertiary ? powerTertiaryDamage(rawTertiary, BATTLE.tertiaryDamageScale) : undefined;
  if (tertiary) {
    spells.push({
      key: "tertiary",
      title: <>◇ {tertiary.name}</>, name: tertiary.name, kind: "◇ Tertiaire", cost: String(BATTLE.tertiaryCooldown), accent: "#a98bd9",
      target: SPELL_TARGET_LABEL[tertiary.target ?? "none"],
      text: describeSpell(tertiary, true),
      tooltip: describeSpell(tertiary, true),
      note: `Rechargement : ${BATTLE.tertiaryCooldown} tours.`,
    });
  }
  const ultimate = boss?.ultimate ?? (hasCharacterSlots(unit.rarity) ? ULTIMATE_CATALOG[unit.characterId] : undefined);
  if (ultimate) {
    spells.push({
      key: "ultimate",
      title: <>✦ {ultimate.name}</>, name: ultimate.name, kind: "✦ Ultime", cost: "", accent: ULT_COLOR[unit.type],
      target: SPELL_TARGET_LABEL[ultimate.target ?? "none"],
      text: describeSpell(ultimate, true),
      tooltip: describeSpell(ultimate, true),
      note: `Jauge : ${ultimateGauge}/${ultimateGaugeMax} · +${BATTLE.ultimateGaugeBase} par attaque de base réussie, +${BATTLE.ultimateGaugePerHit} par sort offensif réussi.`,
    });
  }
  const detail = spells.find((s) => s.key === (hover ?? choose?.spell ?? (inspected?.unit === unit.id ? inspected.spell : "base"))) ?? spells[0];
  const ultimateSpell = spells.find((s) => s.key === "ultimate");
  const handSpells = spells.filter((s) => s.key !== "ultimate");
  const waitOf = (key: Spell) => (key === "special" ? choose?.waitSpecial ?? 0 : key === "tertiary" ? choose?.waitTertiary ?? 0 : choose?.wait ?? 0);
  const cards: HandCard[] = handSpells.map((s) => ({
    key: s.key, name: s.name, kind: s.kind, cost: s.cost, text: s.text, accent: s.accent,
    ready: !choose || choose.choices.some((c) => c.spell === s.key), wait: waitOf(s.key),
    selected: choose?.spell === s.key,
  }));
  const choose_ = (key: Spell) => { setInspected({ unit: unit.id, spell: key }); choose?.onSpell(key); };
  return (
    <section className="bt-spells" aria-label={`Sorts de ${character?.name ?? unit.id}`} data-choosing={choose ? "" : undefined}>
      <h3 className="bt-spells-title">
        {character?.name}{" "}
        <small>
          ATK {num.format(Math.round(unit.atk))} · DEF {num.format(Math.round(unit.def))} · VIT {num.format(Math.round(unit.speed))} · PV {num.format(Math.round(unit.maxHp))}
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
      {choose?.error && (
        <p className="bt-error" role="alert">
          {choose.error}
        </p>
      )}
      <div className="bt-hand-zone">
        <SpellHand cards={cards} portrait={character?.imageUrl} interactive={!!choose} busy={!!choose?.busy} onHover={(k) => setHover(k as Spell | null)}
          onChoose={(k) => (choose ? choose_(k as Spell) : setInspected({ unit: unit.id, spell: k as Spell }))} />
        {ultimateSpell && (
          <UltimateEmblem gauge={ultimateGauge} max={ultimateGaugeMax} name={ultimateSpell.name} portrait={character?.imageUrl} color="#ff4d6d"
            interactive={!!choose} ready={!choose || choose.choices.some((c) => c.spell === "ultimate")} armed={choose?.spell === "ultimate"} busy={!!choose?.busy}
            onClick={() => (choose ? choose_("ultimate") : setInspected({ unit: unit.id, spell: "ultimate" }))} />
        )}
      </div>
      <p className="bt-selected-description" aria-live="polite">{detail.text}</p>
      <details className="bt-inspect-details" onKeyDown={(event) => { if (event.key === "Escape") { event.currentTarget.open = false; event.currentTarget.querySelector("summary")?.focus(); } }}>
        <summary>Sorts, effets et statistiques</summary>
        <div className="bt-inspect-content">
          <p>ATK {num.format(Math.round(unit.atk))} · DEF {num.format(Math.round(unit.def))} · VIT {num.format(Math.round(unit.speed))} · PV {num.format(Math.round(unit.maxHp))}</p>
          <p className="bt-legend">
            <span data-aff="strong">
              ▲ ×1,1 sur <TypeIcon type={strongVs} /> {TYPE_LABELS[strongVs].name}
            </span>
            <span data-aff="weak">
              ▼ ×0,95 sur <TypeIcon type={weakVs} /> {TYPE_LABELS[weakVs].name} <small>(qui le frappe ×1,1)</small>
            </span>
          </p>

          {spells.map((s) => <div key={s.key} className="bt-spell-detail"><b>{s.title}</b><small>{s.target}</small><p>{s.text}</p>{s.note && <small>{s.note}</small>}</div>)}
          {effects}
        </div>
      </details>
    </section>
  );
}
