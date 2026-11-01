import { LEVELS } from "./story";

interface Progress {
  key: string;
  maxLevel: number;
  unlocked: boolean;
}

/** Reprise depuis la progression serveur, y compris au passage vers l'univers suivant. */
export function storyResume(universes: Progress[]) {
  const open = universes.filter((u) => u.unlocked);
  const universe = open.find((u) => u.maxLevel < LEVELS) ?? open[open.length - 1];
  return universe ? { key: universe.key, level: Math.min(universe.maxLevel + 1, LEVELS) } : null;
}
