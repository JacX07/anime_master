"use client";

import { useEffect, useId, useState } from "react";

import { BATTLE, hasCharacterSlots, type Spell, type UnitId, type UnitView } from "@/lib/battle";
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
import { SpellInspection } from "./SpellInspection";
import type { InspectSpell } from "./useHoldInspection";
import type { PlayerCharacter } from "./BattlePlayer";
import { confirmationScope, type ConfirmationScope } from "@/lib/combat-selection";

/** Sorts de la carte choisie : base, affilié, secondaire, tertiaire et ultime. */
export function SpellsPanel({
  unit,
  character,
  choose,
}: {
  unit: UnitView;
  character?: PlayerCharacter;
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
    onSpell: (spell: Spell | null, scope: ConfirmationScope) => void;
  };
}) {
  const [inspected, setInspected] = useState<Spell | null>(null);
  const [inspection, setInspection] = useState<{ key: string; anchor: HTMLElement } | null>(null);
  const handId = useId();
  const inspectionId = `${handId}-inspection`;
  const onInspect: InspectSpell = (key, anchor) => setInspection(key && anchor ? { key, anchor } : null);
  useEffect(() => {
    if (!inspection) return;
    const outside = (event: Event) => {
      const target = event.target as Node;
      if (!inspection.anchor.contains(target) && !document.getElementById(inspectionId)?.contains(target)) setInspection(null);
    };
    document.addEventListener("pointerdown", outside, true);
    document.addEventListener("focusin", outside);
    return () => {
      document.removeEventListener("pointerdown", outside, true);
      document.removeEventListener("focusin", outside);
    };
  }, [inspection, inspectionId]);
  const selected = choose ? choose.spell : inspected;
  const affinity = SPELL_INFO[unit.type];
  const boss = unit.boss ? BOSS_SKILLS[unit.characterId] : undefined;
  const basic = boss?.basicAttack ?? basicAttackOf(unit.characterId, unit.rarity, unit.type);
  const spells: { key: Spell; title: React.ReactNode; name: string; kind: string; cost: string; accent: string; target: string; text: string; tooltip: string; note: string | null; confirm?: ConfirmationScope }[] = [
    { key: "base" as const, title: <>{basic?.name ?? BASE_SPELL.name}</>, name: basic?.name ?? BASE_SPELL.name, kind: "Attaque de base", cost: "0", accent: "#c4a76d", target: BASE_SPELL.target, text: basic ? describeBasicAttack(basic) : BASE_SPELL.text, tooltip: basic ? describeBasicAttack(basic) : BASE_SPELL.details, note: null },
  ];
  // Les SSR et UR n'ont pas de sort de type : leurs 4 emplacements sont personnalisés
  if (!hasCharacterSlots(unit.rarity)) {
    spells.push({ key: "affinity" as const, title: <><TypeIcon type={unit.type} /> {SPELL_NAMES[unit.type]}</>, name: SPELL_NAMES[unit.type], kind: "Affinité", cost: String(BATTLE.spellCooldown), accent: "#d1bd8e", target: affinity.target, text: affinity.text, tooltip: affinity.details, confirm: unit.type === "AVENTURE" ? "team" : "self", note: AFFINITY_COOLDOWN });
  }
  const rawOwn = spellOf(unit.characterId, unit.rarity, unit.type);
  const element = effectElement(unit.characterId);
  const own = boss?.spell ?? (rawOwn ? balanceSecondary(rawOwn, BATTLE.secondaryEffectScale) : null);
  if (own) {
    spells.push({
      key: "special" as const,
      title: <>★ {own.name}</>, name: own.name, kind: "★ Secondaire", cost: String(SPELL_COOLDOWN), accent: "#5aa9ff",
      target: SPELL_TARGET_LABEL[own.target ?? "none"], confirm: confirmationScope(own.effects),
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
      target: SPELL_TARGET_LABEL[tertiary.target ?? "none"], confirm: confirmationScope(tertiary.effects),
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
      target: SPELL_TARGET_LABEL[ultimate.target ?? "none"], confirm: confirmationScope(ultimate.effects),
      text: describeSpell(ultimate, true),
      tooltip: describeSpell(ultimate, true),
      note: `Jauge : ${ultimateGauge}/${ultimateGaugeMax} · +${BATTLE.ultimateGaugeBase} par attaque de base réussie, +${BATTLE.ultimateGaugePerHit} par sort offensif réussi.`,
    });
  }
  const ultimateSpell = spells.find((s) => s.key === "ultimate");
  const handSpells = spells.filter((s) => s.key !== "ultimate");
  const waitOf = (key: Spell) => (key === "special" ? choose?.waitSpecial ?? 0 : key === "tertiary" ? choose?.waitTertiary ?? 0 : choose?.wait ?? 0);
  const cards: HandCard[] = handSpells.map((s) => ({
    key: s.key, name: s.name, kind: s.kind, cost: s.cost, text: s.target === "Aucune cible" ? ({ self: "Sur soi", team: "Toute l’équipe", foes: "Tous les ennemis", "fallen-allies": "Allié K.O." }[s.confirm ?? "self"]) : s.target, details: s.tooltip, accent: s.accent,
    ready: !choose || choose.choices.some((c) => c.spell === s.key), wait: waitOf(s.key),
    selected: selected === s.key,
  }));
  const detail = spells.find((entry) => entry.key === inspection?.key);
  const choose_ = (key: Spell) => {
    setInspection(null);
    const next = selected === key ? null : key;
    setInspected(next);
    choose?.onSpell(next, spells.find((entry) => entry.key === key)?.confirm ?? "self");
  };
  return (
    <section className="bt-spells" aria-label={`Sorts de ${character?.name ?? unit.id}`} data-choosing={choose ? "" : undefined}>
      {choose?.error && (
        <p className="bt-error" role="alert">
          {choose.error}
        </p>
      )}
      <div id={handId} className="bt-expanded-hand">
        {detail && inspection && <SpellInspection id={inspectionId} anchor={inspection.anchor} name={detail.name} target={detail.target} description={detail.tooltip} note={detail.note} />}
      <div className="bt-hand-zone">
        <SpellHand cards={cards} portrait={character?.imageUrl} interactive={!!choose} busy={!!choose?.busy} inspecting={inspection?.key ?? null} inspectionId={inspectionId} enabled={true} onInspect={onInspect}
          onChoose={(k) => choose_(k as Spell)} />
        {ultimateSpell && (
          <UltimateEmblem gauge={ultimateGauge} max={ultimateGaugeMax} name={ultimateSpell.name} portrait={character?.imageUrl} color="#ff4d6d"
            interactive={!!choose} ready={!choose || choose.choices.some((c) => c.spell === "ultimate")} armed={selected === "ultimate"} busy={!!choose?.busy} inspecting={inspection?.key === "ultimate"} inspectionId={inspectionId} enabled={true} onInspect={onInspect}
            onClick={() => choose_("ultimate")} />
        )}
      </div>
      </div>
    </section>
  );
}
