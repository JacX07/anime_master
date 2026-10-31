// Code TypeScript d'un sort, prêt à coller dans CHARACTER_SPELLS (src/lib/spells.ts) : même format que `calibrate:spells`.

import type { CharacterSpell, Effect } from "./spells";

const num = (x: number) => String(+x.toFixed(2));

function effectSrc(e: Effect): string {
  switch (e.k) {
    case "damage": {
      const o = [e.zone && "zone: true", e.ignoreDef && `ignoreDef: ${e.ignoreDef}`, e.pierce && "pierce: true", e.drain && `drain: ${e.drain}`, e.critSure && "critSure: true"].filter(Boolean);
      return `dmg(${num(e.mult)}${o.length ? `, { ${o.join(", ")} }` : ""})`;
    }
    case "mod": return `mod("${e.stat}", ${e.amount}, ${e.turns}, "${e.to}")`;
    default: return JSON.stringify(e).replace(/"(\w+)":/g, "$1: ").replace(/,/g, ", ").replace(/^\{/, "{ ").replace(/\}$/, " }");
  }
}

export const spellSource = (id: number, who: string, sp: CharacterSpell) =>
  `  ${id}: S(${JSON.stringify(sp.name)}, ${sp.target === null ? "null" : `"${sp.target}"`}, ${sp.effects.map(effectSrc).join(", ")}), // ${who}`;
