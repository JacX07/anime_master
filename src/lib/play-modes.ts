import { getAdventure } from "./adventure-state";
import { readyCount } from "./expeditions";

/** Verrous et états des modes du menu JOUER et de la page /jouer (clé : identifiant du panneau). */
export async function playModeState(userId: string | null) {
  const locks: Record<string, string> = {};
  const info: Record<string, string> = {};
  if (!userId) return { locks, info };
  const [adventure, ready] = await Promise.all([getAdventure(userId), readyCount(userId)]);
  const ids = { expeditions: "expeditions", dungeon: "dungeons", raid: "raids", tower: "tower" } as const;
  for (const mode of adventure.modes) {
    if (mode.unlocked) continue;
    locks[ids[mode.key]] = adventure.level < mode.level ? `Niveau ${mode.level} requis` : "Progresse dans l’histoire";
  }
  const next = adventure.quests.find((quest) => quest.group === "Histoire" && quest.available && !quest.done);
  info.story = next ? next.title : "Tous les univers explorés";
  if (ready) info.expeditions = `${ready} expédition${ready > 1 ? "s" : ""} prête${ready > 1 ? "s" : ""}`;
  return { locks, info };
}
