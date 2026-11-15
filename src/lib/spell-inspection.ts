/** Only effect names are colored; numbers, durations and damage formulas stay plain. */
const effectName = /(?<![\p{L}\p{N}])(?:(?:dégâts critiques|dégâts subis|critique|esquive|vitesse|ATK|DEF)(?=\s*[+−-])|soin sur la durée|immunité aux malus|domaine du monarque|soif de sang|concentration|provocation|régénération|affaiblissement|affaibli(?:e)?|expos(?:é|ée|ition)|élan|boucliers?|poison|silence|étourdit|étourdissement|endort|endormi|intouchable|scelle|scellé|saignement|brûlure|trempé|en duel|marque|zombies?)(?![\p{L}\p{N}])/giu;

export function spellDescriptionParts(text: string): { text: string; effect: boolean }[] {
  const parts: { text: string; effect: boolean }[] = [];
  let offset = 0;
  for (const match of text.matchAll(effectName)) {
    if (match.index > offset) parts.push({ text: text.slice(offset, match.index), effect: false });
    parts.push({ text: match[0], effect: true });
    offset = match.index + match[0].length;
  }
  if (offset < text.length) parts.push({ text: text.slice(offset), effect: false });
  return parts;
}

export function inspectionPosition(anchor: { left: number; top: number; width: number }, popup: { width: number; height: number }, viewportWidth: number) {
  return {
    left: Math.max(12, Math.min(viewportWidth - popup.width - 12, anchor.left + anchor.width / 2 - popup.width / 2)),
    top: Math.max(12, anchor.top - popup.height - 12),
  };
}
