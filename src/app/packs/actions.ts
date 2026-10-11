"use server";

import { revalidatePath } from "next/cache";
import { BULK_SIZES, ConcurrentOpeningError, NoPackAvailableError, openPack, openPacks, type OpenedBulk, type OpenedPack } from "@/lib/packs";
import { checkAchievementsSafe } from "@/lib/achievements";
import { getSessionUser } from "@/lib/session";
import { getPackState } from "@/lib/packs";
import { buyPack } from "@/lib/shop";
import { SaleError } from "@/lib/wallet";

export type OpenPackResult = { ok: true; pack: OpenedPack } | { ok: false; error: string };

export async function openPackAction(): Promise<OpenPackResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Ta session a expiré, reconnecte-toi." };
  try {
    const pack = await openPack(user.id);
    await checkAchievementsSafe(user.id);
    revalidatePath("/album"); // l'album affiche les nouvelles cartes à la prochaine visite
    return { ok: true, pack };
  } catch (err) {
    if (err instanceof NoPackAvailableError) return { ok: false, error: "Aucun paquet disponible pour l'instant." };
    if (err instanceof ConcurrentOpeningError) return { ok: false, error: "Un paquet est déjà en cours d'ouverture." };
    console.error("Échec de l'ouverture :", err);
    return { ok: false, error: "L'ouverture a échoué, réessaie." };
  }
}

export type OpenPacksResult = { ok: true; bulk: OpenedBulk } | { ok: false; error: string };

/** Ouverture groupée (×5 ou ×10) : les cartes sont toutes enregistrées, l'animation est remplacée par un résumé. */
export async function openPacksAction(count: number): Promise<OpenPacksResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Ta session a expiré, reconnecte-toi." };
  if (!(BULK_SIZES as readonly number[]).includes(count)) return { ok: false, error: "Nombre de paquets invalide." };
  try {
    const bulk = await openPacks(user.id, count);
    await checkAchievementsSafe(user.id);
    revalidatePath("/album");
    return { ok: true, bulk };
  } catch (err) {
    if (err instanceof NoPackAvailableError) return { ok: false, error: `Il te faut ${count} paquets en réserve.` };
    if (err instanceof ConcurrentOpeningError) return { ok: false, error: "Un paquet est déjà en cours d'ouverture." };
    console.error("Échec de l'ouverture groupée :", err);
    return { ok: false, error: "L'ouverture a échoué, réessaie." };
  }
}

export type BuyPackResult = { ok: true; state: Awaited<ReturnType<typeof getPackState>> } | { ok: false; error: string };

/** Achète un paquet avec des Ryō et renvoie le nouvel état (stock, solde, achats restants). */
export async function buyPackAction(): Promise<BuyPackResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Ta session a expiré, reconnecte-toi." };
  try {
    await buyPack(user.id);
    revalidatePath("/", "layout"); // le solde du menu du haut change
    return { ok: true, state: await getPackState(user.id) };
  } catch (err) {
    if (err instanceof SaleError) return { ok: false, error: err.message };
    console.error("Échec de l'achat :", err);
    return { ok: false, error: "L'achat a échoué, réessaie." };
  }
}
