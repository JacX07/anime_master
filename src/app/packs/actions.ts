"use server";

import { ConcurrentOpeningError, NoPackAvailableError, openPack, type OpenedPack } from "@/lib/packs";
import { getSessionUser } from "@/lib/session";

export type OpenPackResult = { ok: true; pack: OpenedPack } | { ok: false; error: string };

export async function openPackAction(): Promise<OpenPackResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Ta session a expiré, reconnecte-toi." };
  try {
    return { ok: true, pack: await openPack(user.id) };
  } catch (err) {
    if (err instanceof NoPackAvailableError) return { ok: false, error: "Aucun paquet disponible pour l'instant." };
    if (err instanceof ConcurrentOpeningError) return { ok: false, error: "Un paquet est déjà en cours d'ouverture." };
    console.error("Échec de l'ouverture :", err);
    return { ok: false, error: "L'ouverture a échoué, réessaie." };
  }
}
