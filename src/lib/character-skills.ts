import type { CharacterSpell, Effect } from "./spells";

/** Modère les valeurs d'un secondaire ; contrôle, perforation et effets de zone reçoivent des plafonds distincts. */
export function balanceSecondary(spell: CharacterSpell, scale: number): CharacterSpell {
  if (spell.final) return spell;
  const turns = (n: number) => Math.max(1, Math.round(n * scale));
  const hasSilence = spell.effects.some((effect) => effect.k === "silence");
  const balancedDamage = (effect: Extract<Effect, { k: "damage" }>) => {
    const mult = effect.critSure && scale < 1
      ? Math.max(1, effect.mult) * (1 + 0.395 * scale)
      : effect.mult >= 1 ? 1 + (effect.mult - 1) * scale : effect.mult;
    if (effect.zone) return Math.max(0.4, Math.min(0.5, effect.mult * scale));
    const cap = hasSilence ? 1.1 : effect.pierce ? 1.25 : Infinity;
    return Math.min(mult, cap);
  };
  const effects: Effect[] = spell.effects.map((effect) => {
    switch (effect.k) {
      case "damage":
        return {
          ...effect,
          mult: balancedDamage(effect),
          ...(effect.ignoreDef === undefined ? {} : { ignoreDef: Math.min(effect.ignoreDef * scale, effect.pierce ? 0.1 : 0.15) }),
          ...(effect.drain === undefined ? {} : { drain: effect.drain * scale }),
          ...(effect.critSure && scale < 1 ? { critSure: false } : {}),
        };
      case "mod": {
        const amount = effect.amount * scale;
        const isTeamEffect = effect.to === "team" || effect.to === "foes";
        const cap = !isTeamEffect
          ? Infinity
          : effect.stat === "dodge" || (effect.stat === "atk" && effect.to === "foes" && amount < 0)
            ? 0.05
            : 0.08;
        return {
          ...effect,
          amount: Math.sign(amount) * Math.min(Math.abs(amount), cap),
          turns: turns(effect.turns),
        };
      }
      case "heal": return { ...effect, pct: effect.pct * scale };
      case "regen": return { ...effect, pct: effect.pct * scale, turns: turns(effect.turns) };
      case "shield": {
        const pct = effect.pct * scale;
        return { ...effect, pct: effect.to === "team" ? Math.min(pct, 0.03) : pct };
      }
      case "poison": return { ...effect, pct: Math.min(0.03, effect.pct * scale), turns: turns(effect.turns) };
      case "silence": return { ...effect, turns: turns(effect.turns) };
      case "stun": return { ...effect, turns: turns(effect.turns) };
      case "immune": return { ...effect, turns: turns(effect.turns) };
      case "revive": return { ...effect, pct: Math.min(0.2, Math.max(0.15, effect.pct * scale)) };
      case "purge":
      case "taunt":
      case "arise":
      case "resetCd":
      case "bloodlust":
      case "seal":
      case "steal":
      case "counter":
      case "reduce": return effect;
    }
  });
  return { ...spell, effects };
}

/** Le tertiaire est léger mais ne doit pas perdre de dégâts face à une attaque de base standard. */
export function powerTertiaryDamage(spell: CharacterSpell, scale: number): CharacterSpell {
  if (spell.final) return spell;
  return {
    ...spell,
    effects: spell.effects.map((effect) => effect.k === "damage" ? { ...effect, mult: effect.mult * scale } : effect),
  };
}
