"use server";

import { revalidatePath } from "next/cache";
import { BannerError, ConcurrentOpeningError, NoPackAvailableError, openPack, type OpenedPack } from "@/lib/packs";
import { LOT_SIZES, type LotSize } from "@/lib/pull";
import { checkAchievementsSafe } from "@/lib/achievements";
import { getSessionUser } from "@/lib/session";
import { getPackState } from "@/lib/packs";
import { buyCrystals } from "@/lib/shop";
import { SaleError } from "@/lib/wallet";
import { prisma } from "@/lib/db";
import { afterGain } from "@/lib/crystal-stock";

export type OpenPackResult = { ok: true; pack: OpenedPack } | { ok: false; error: string };

/** Ouvre un lot de 5 (animation 3D) ou de 10 cartes : 1 cristal par carte. */
export async function openPackAction(size: number = 5, bannerId: string | null = null): Promise<OpenPackResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Ta session a expiré, reconnecte-toi." };
  if (!(LOT_SIZES as readonly number[]).includes(size)) return { ok: false, error: "Taille de lot invalide." };
  try {
    const pack = await openPack(user.id, size as LotSize, undefined, bannerId ? String(bannerId) : null);
    await checkAchievementsSafe(user.id);
    revalidatePath("/album"); // l'album affiche les nouvelles cartes à la prochaine visite
    return { ok: true, pack };
  } catch (err) {
    if (err instanceof BannerError) return { ok: false, error: err.message };
    if (err instanceof NoPackAvailableError) return { ok: false, error: `Il te faut ${size} cristaux pour ce tirage.` };
    if (err instanceof ConcurrentOpeningError) return { ok: false, error: "Un paquet est déjà en cours d'ouverture." };
    console.error("Échec de l'ouverture :", err);
    return { ok: false, error: "L'ouverture a échoué, réessaie." };
  }
}

export type BuyCrystalsResult = { ok: true; state: Awaited<ReturnType<typeof getPackState>> } | { ok: false; error: string };

/** Achète 5 ou 25 cristaux avec des Ryō et renvoie le nouvel état (stock, solde, achats restants). */
export async function buyCrystalsAction(count: number = 5): Promise<BuyCrystalsResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Ta session a expiré, reconnecte-toi." };
  try {
    await buyCrystals(user.id, count);
    revalidatePath("/", "layout"); // le solde du menu du haut change
    return { ok: true, state: await getPackState(user.id) };
  } catch (err) {
    if (err instanceof SaleError) return { ok: false, error: err.message };
    console.error("Échec de l'achat :", err);
    return { ok: false, error: "L'achat a échoué, réessaie." };
  }
}

/** TEMPORAIRE (tests) : donne 50 cristaux et 10 cristaux spéciaux. Refusé en production ; à retirer avant la mise en ligne. */
export async function devGrantCrystalsAction(): Promise<BuyCrystalsResult> {
  if (process.env.NODE_ENV === "production") return { ok: false, error: "Indisponible." };
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Ta session a expiré, reconnecte-toi." };
  const u = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { crystals: true, crystalsUpdatedAt: true } });
  await prisma.user.update({ where: { id: user.id }, data: { ...afterGain(u.crystals, u.crystalsUpdatedAt, new Date(), 50), specialCrystals: { increment: 10 } } });
  return { ok: true, state: await getPackState(user.id) };
}
