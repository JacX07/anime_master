"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { applyGearPresetAction, deleteGearPresetAction, listGearPresetsAction, saveGearPresetAction } from "@/app/gear-preset-actions";
import { GEAR_PRESET_MAX } from "@/lib/gear-presets-shared";

type Preset = { id: string; name: string; count: number };

/** Sauvegardes d'équipement sur la fiche d'un personnage : enregistrer ce qu'il porte, appliquer ou supprimer une sauvegarde. */
export function GearPresets({ cardId, cardName }: { cardId: string; cardName: string }) {
  const router = useRouter();
  const [presets, setPresets] = useState<Preset[] | null>(null);
  const [chosen, setChosen] = useState("");
  const [name, setName] = useState("");
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  useEffect(() => {
    let live = true;
    listGearPresetsAction().then((r) => { if (live && r.ok) setPresets(r.value); });
    return () => { live = false; };
  }, []);
  const act = (fn: () => Promise<{ ok: true; value: Preset[] } | { ok: false; error: string }>, done: string) => start(async () => {
    const r = await fn();
    if (!r.ok) return setMsg(r.error);
    setPresets(r.value); setMsg(done);
  });
  const current = presets?.find((p) => p.id === chosen) ?? null;
  return <section className="gear-presets" aria-label="Sauvegardes d’équipement">
    <div className="gear-presets-row">
      <select aria-label="Sauvegarde d’équipement" value={chosen} disabled={pending || !presets?.length} onChange={(e) => { setChosen(e.target.value); setMsg(""); }}>
        <option value="">{presets?.length ? "Choisir une sauvegarde…" : "Aucune sauvegarde"}</option>
        {presets?.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.count} objet{p.count > 1 ? "s" : ""})</option>)}
      </select>
      <button type="button" className="ui-button" disabled={pending || !current} onClick={() => start(async () => {
        const r = await applyGearPresetAction(chosen, cardId);
        if (!r.ok) return setMsg(r.error);
        setMsg(`« ${current!.name} » appliquée sur ${cardName}${r.value.missing ? ` (${r.value.missing} objet${r.value.missing > 1 ? "s" : ""} recyclé${r.value.missing > 1 ? "s" : ""} ignoré${r.value.missing > 1 ? "s" : ""})` : ""}.`);
        router.refresh();
      })}>Appliquer</button>
      <button type="button" className="ui-button" disabled={pending || !current} onClick={() => act(() => deleteGearPresetAction(chosen), "Sauvegarde supprimée.")}>Supprimer</button>
    </div>
    <form className="gear-presets-row" onSubmit={(e) => { e.preventDefault(); act(() => saveGearPresetAction(cardId, name), "Équipement enregistré."); setName(""); }}>
      <input aria-label="Nom de la sauvegarde" placeholder={`Ex. : set crit ${cardName}`} maxLength={40} value={name} onChange={(e) => setName(e.target.value)} />
      <button type="submit" className="ui-button" disabled={pending || !name.trim() || (presets?.length ?? 0) >= GEAR_PRESET_MAX}>Enregistrer l’équipement</button>
    </form>
    {msg && <p className="gear-message" role="status">{msg}</p>}
  </section>;
}
