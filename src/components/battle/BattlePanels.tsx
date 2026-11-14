"use client";

import { useId, useState } from "react";

import { BATTLE, hasCharacterSlots, type Spell, type UnitId, type UnitView } from "@/lib/battle";
import { BOSS_SKILLS } from "@/lib/boss-skills";
import { basicAttackOf, describeBasicAttack } from "@/lib/basic-attacks";
import { AFFINITY_COOLDOWN, BASE_SPELL, SPELL_INFO, SPELL_NAMES } from "@/lib/battle-replay";
import { describeSpell, spellOf, SPELL_COOLDOWN, SPELL_TARGET_LABEL } from "@/lib/spells";
import { describeElement, effectElement } from "@/lib/attack-element";
import { TERTIARY_SPELLS } from "@/lib/tertiary-catalog";
import { ULTIMATE_CATALOG } from "@/lib/ultimate-catalog";
import { balanceSecondary, powerTertiaryDamage } from "@/lib/character-skills";
import { Icon, TypeIcon } from "../icons";
import { SpellHand, UltimateEmblem, ULT_COLOR, type HandCard } from "./SpellHand";
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
  const [expanded, setExpanded] = useState(false);
  const [inspected, setInspected] = useState<Spell | null>(null);
  const handId = useId();
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
    key: s.key, name: s.name, kind: s.kind, cost: s.cost, text: s.text, accent: s.accent,
    ready: !choose || choose.choices.some((c) => c.spell === s.key), wait: waitOf(s.key),
    selected: selected === s.key,
  }));
  const detail = spells.find((entry) => entry.key === selected);
  const isGlobal = choose?.choices.find((entry) => entry.spell === selected)?.targets.includes(null);
  const hint = !isGlobal ? "Touche une carte surlignée sur le plateau pour confirmer." : detail?.confirm === "team"
    ? "Touche le lanceur ou un allié surligné pour confirmer l’effet de groupe." : detail?.confirm === "foes"
      ? "Touche un ennemi surligné pour confirmer l’effet de groupe." : detail?.confirm === "fallen-allies"
        ? "Touche un allié K.O. surligné pour confirmer." : "Touche le lanceur surligné pour confirmer.";
  const choose_ = (key: Spell) => {
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
      <button type="button" className="bt-hand-toggle" aria-expanded={expanded} aria-controls={handId} onClick={() => {
        setExpanded(!expanded);
        if (expanded) { setInspected(null); choose?.onSpell(null, "self"); }
      }}><Icon name="magie" /><span>Sorts de {character?.name ?? unit.id}</span><small>{expanded ? "Replier" : "Afficher"}</small></button>
      <div id={handId} className="bt-expanded-hand" hidden={!expanded}>
        {detail && <div className="bt-spell-preview" aria-live="polite"><b>{detail.name}</b><p>{detail.tooltip}</p><small>{choose ? hint : detail.note}</small></div>}
      <div className="bt-hand-zone">
        <SpellHand cards={cards} portrait={character?.imageUrl} interactive={!!choose} busy={!!choose?.busy} onHover={() => {}}
          onChoose={(k) => choose_(k as Spell)} />
        {ultimateSpell && (
          <UltimateEmblem gauge={ultimateGauge} max={ultimateGaugeMax} name={ultimateSpell.name} portrait={character?.imageUrl} color="#ff4d6d"
            interactive={!!choose} ready={!choose || choose.choices.some((c) => c.spell === "ultimate")} armed={selected === "ultimate"} busy={!!choose?.busy}
            onClick={() => choose_("ultimate")} />
        )}
      </div>
      </div>
    </section>
  );
}
