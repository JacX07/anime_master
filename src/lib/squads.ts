export type SquadSlots = (string | null)[];
export interface SavedSquad { id: string; name: string; slots: SquadSlots }

export function validateSquad(name: unknown, slots: unknown) {
  if (typeof name !== "string" || !name.trim() || name.trim().length > 60) throw new Error("Le nom doit contenir entre 1 et 60 caractères.");
  if (!Array.isArray(slots) || slots.length !== 4 || slots.some((id) => id !== null && (typeof id !== "string" || !id || id.length > 200))) throw new Error("Une squad contient 4 emplacements.");
  const ids = slots.filter((id): id is string => id !== null);
  if (new Set(ids).size !== ids.length) throw new Error("Une carte ne peut occuper qu’un emplacement.");
  return { name: name.trim(), slots: slots as SquadSlots, ids };
}
