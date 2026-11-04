"use server";
import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/session";
import { GuildError, createGuild, updateGuild, joinGuild, cancelGuildRequest, reviewGuildRequest, changeGuildRole, transferGuild, kickGuildMember, leaveGuild, dissolveGuild } from "@/lib/guilds";
import type { GuildInput } from "@/lib/guild-rules";

type Result = { ok: true; tag?: string; message: string } | { ok: false; error: string };
async function run(fn: (id: string) => Promise<{ tag?: string; message: string }>): Promise<Result> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Ta session a expiré, reconnecte-toi." };
  try {
    const result = await fn(user.id);
    revalidatePath("/", "layout");
    return { ok: true, ...result };
  } catch (err) {
    if (err instanceof GuildError) return { ok: false, error: err.message };
    if (err && typeof err === "object" && "code" in err && err.code === "P2002") return { ok: false, error: "Ce nom ou ce tag de guilde est déjà utilisé." };
    console.error("Échec de l’action de guilde :", err);
    return { ok: false, error: "L’opération a échoué, réessaie." };
  }
}
export async function createGuildAction(input: GuildInput) {
  return run(async (id) => ({ tag: (await createGuild(id, input)).tag, message: "Guilde créée." }));
}
export async function updateGuildAction(guildId: string, input: GuildInput) {
  return run(async (id) => ({ tag: (await updateGuild(id, String(guildId), input)).tag, message: "Guilde enregistrée." }));
}
export async function guildMemberAction(operation: string, guildId: string, targetId = "") {
  return run(async (id) => {
    guildId = String(guildId); targetId = String(targetId);
    switch (operation) {
      case "join": {
        const result = await joinGuild(id, guildId);
        return { tag: result.joined ? result.tag : undefined, message: result.joined ? "Tu as rejoint la guilde." : "Demande envoyée." };
      }
      case "cancel": await cancelGuildRequest(id, guildId); break;
      case "accept": await reviewGuildRequest(id, guildId, targetId, true); break;
      case "refuse": await reviewGuildRequest(id, guildId, targetId, false); break;
      case "promote": await changeGuildRole(id, guildId, targetId, "OFFICER"); break;
      case "demote": await changeGuildRole(id, guildId, targetId, "MEMBER"); break;
      case "transfer": await transferGuild(id, guildId, targetId); break;
      case "kick": await kickGuildMember(id, guildId, targetId); break;
      case "leave": await leaveGuild(id, guildId); return { message: "Tu as quitté la guilde. Délai de 24 h avant une nouvelle adhésion." };
      case "dissolve": await dissolveGuild(id, guildId); return { message: "Guilde dissoute. Délai de 24 h avant une nouvelle adhésion." };
      default: throw new GuildError("Action de guilde inconnue.");
    }
    return { message: "Modification enregistrée." };
  });
}
