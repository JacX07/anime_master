"use server";
import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/session";
import { forgeWeapon } from "@/lib/forge";
import { BattleError } from "@/lib/battles";

export async function forgeAction(_previous: string, form: FormData): Promise<string> {
  const user = await getSessionUser();
  if (!user) return "Ta session a expiré.";
  try {
    await forgeWeapon(user.id, String(form.get("cardId") ?? ""));
    revalidatePath("/forge");
    revalidatePath("/equipe");
    return "Arme forgée et équipée.";
  } catch (error) {
    if (error instanceof BattleError) return error.message;
    console.error("Forge :", error);
    return "La forge a échoué, réessaie.";
  }
}
