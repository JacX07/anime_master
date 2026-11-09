"use server";
import { refresh } from "next/cache";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { validateSquad, type SavedSquad } from "@/lib/squads";

export async function saveSquadAction(id: string | null, name: string, slots: (string | null)[]): Promise<{ ok: true; squad: SavedSquad } | { ok: false; error: string }> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Ta session a expiré, reconnecte-toi." };
  if (id !== null && (typeof id !== "string" || !id || id.length > 200)) return { ok: false, error: "Squad introuvable." };
  let input;
  try { input = validateSquad(name, slots); }
  catch (error) { return { ok: false, error: (error as Error).message }; }
  try {
    const squad = await prisma.$transaction(async (tx) => {
      const owned = await tx.card.count({ where: { id: { in: input.ids }, ownerId: user.id, inAuction: false } });
      if (owned !== input.ids.length) throw new Error("Une carte n’est plus disponible dans ta collection.");
      if (id !== null) {
        const result = await tx.squad.updateMany({ where: { id, userId: user.id }, data: { name: input.name, cardIds: input.slots } });
        if (!result.count) throw new Error("Squad introuvable.");
        return { id, name: input.name, slots: input.slots };
      }
      const created = await tx.squad.create({ data: { userId: user.id, name: input.name, cardIds: input.slots } });
      return { id: created.id, name: created.name, slots: input.slots };
    });
    refresh();
    return { ok: true, squad };
  } catch (error) {
    console.error("Enregistrement de squad :", error);
    return { ok: false, error: error instanceof Error && ["Une carte n’est plus disponible dans ta collection.", "Squad introuvable."].includes(error.message) ? error.message : "Enregistrement impossible, réessaie." };
  }
}
