"use server";
import { refresh } from "next/cache";
import { getSessionUser } from "@/lib/session";
import { forgeEmperorWeapon, forgeWeapon } from "@/lib/forge";
import { BattleError } from "@/lib/battles";

export async function forgeAction(_previous: string, form: FormData): Promise<string> {
  const user = await getSessionUser();
  if (!user) return "Ta session a expiré.";
  try {
    const weapon = String(form.get("weapon") ?? "");
    if (weapon) await forgeEmperorWeapon(user.id, String(form.get("cardId") ?? ""), weapon);
    else await forgeWeapon(user.id, String(form.get("cardId") ?? ""));
    refresh();
    return "Arme forgée et équipée.";
  } catch (error) {
    if (error instanceof BattleError) return error.message;
    console.error("Forge :", error);
    return "La forge a échoué, réessaie.";
  }
}
