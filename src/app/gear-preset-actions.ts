"use server";
import { refresh } from "next/cache";
import { getSessionUser } from "@/lib/session";
import { applyGearPreset, deleteGearPreset, GearPresetError, listGearPresets, saveGearPreset } from "@/lib/gear-presets";

async function run<T>(fn: (userId: string) => Promise<T>) {
  const user = await getSessionUser();
  if (!user) return { ok: false as const, error: "Ta session a expiré." };
  try {
    return { ok: true as const, value: await fn(user.id) };
  } catch (error) {
    if (error instanceof GearPresetError) return { ok: false as const, error: error.message };
    console.error("Sauvegarde d'équipement :", error);
    return { ok: false as const, error: "L'opération a échoué, réessaie." };
  }
}

export async function listGearPresetsAction() { return run((id) => listGearPresets(id)); }
export async function saveGearPresetAction(cardId: string, name: string) { return run(async (id) => { await saveGearPreset(id, String(cardId), String(name)); return listGearPresets(id); }); }
export async function deleteGearPresetAction(presetId: string) { return run(async (id) => { await deleteGearPreset(id, String(presetId)); return listGearPresets(id); }); }
export async function applyGearPresetAction(presetId: string, cardId: string) {
  return run(async (id) => { const r = await applyGearPreset(id, String(presetId), String(cardId)); refresh(); return r; });
}
