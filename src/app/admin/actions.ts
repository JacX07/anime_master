"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/admin";
import { AdminError, adjustCrystals, adjustRyo, adjustSpecialCrystals, banUser, changeRole, giveCard, removeCard, resetPity, unbanUser, type Role } from "@/lib/admin-actions";
import { searchCharacters } from "@/lib/admin-players";
import { prisma } from "@/lib/db";

export type StaffState = { ok: boolean; message: string } | null;

const text = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();

/** Point d'entrée unique des actions de l'équipe : droits relus en base, puis action métier (qui vérifie la cible et écrit l'audit). */
export async function staffAction(_prev: StaffState, fd: FormData): Promise<StaffState> {
  const staff = await requireRole("moderator");
  const op = text(fd, "op");
  const targetId = text(fd, "target");
  const reason = text(fd, "reason");
  const n = Number(text(fd, "amount"));
  try {
    switch (op) {
      case "ryo": await adjustRyo(staff, targetId, n, reason); break;
      case "crystals": await adjustCrystals(staff, targetId, n, reason); break;
      case "special": await adjustSpecialCrystals(staff, targetId, n, reason); break;
      case "pity": await resetPity(staff, targetId, reason); break;
      case "ban": await banUser(staff, targetId, reason); break;
      case "unban": await unbanUser(staff, targetId, reason); break;
      case "role": await changeRole(staff, targetId, text(fd, "role") as Role, reason); break;
      case "remove": await removeCard(staff, targetId, text(fd, "card"), reason); break;
      case "give": {
        const name = text(fd, "character");
        const found = await prisma.character.findMany({ where: { name: { equals: name, mode: "insensitive" } }, select: { id: true } });
        if (found.length !== 1) {
          const hints = (await searchCharacters(name)).map((c) => `${c.name} (${c.rarity})`).join(", ");
          throw new AdminError(`Nom exact requis.${hints ? ` Propositions : ${hints}.` : " Aucun personnage trouvé."}`);
        }
        await giveCard(staff, targetId, found[0].id, reason);
        break;
      }
      default: throw new AdminError("Action inconnue.");
    }
    revalidatePath(`/admin/joueurs/${targetId}`);
    return { ok: true, message: "Fait. L'action est inscrite au journal d'audit." };
  } catch (err) {
    if (err instanceof AdminError) return { ok: false, message: err.message };
    console.error("Échec d'une action d'équipe :", err);
    return { ok: false, message: "L'opération a échoué, rien n'a été modifié." };
  }
}
