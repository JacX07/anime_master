"use client";

import { useState } from "react";
import type { Rarity } from "@/generated/prisma/enums";
import { artifactRarity, artifactStatLabel } from "@/lib/artifact-display";
import { DUNGEONS } from "@/lib/dungeons";

type Filterable = { artifact?: { rarity: Rarity; mainStat: string; subStats: { stat: string }[]; setKey?: string; equippedCard: unknown | null } };
const RARITIES: Rarity[] = ["N", "R", "SR", "SSR", "UR"];
const STATS = ["attack", "flatAttack", "defense", "flatDefense", "hp", "flatHp", "speed", "crit", "critDamage", "magicSkill"];

/** Filtres d'artefacts (v0.3.0) : stat principale, sous-stat présente, rareté, set, non équipés. */
export function useArtifactFilter<T extends Filterable>(items: T[]) {
  const [main, setMain] = useState("");
  const [sub, setSub] = useState("");
  const [rarity, setRarity] = useState<Rarity | "">("");
  const [set, setSet] = useState("");
  const [free, setFree] = useState(false);
  const active = !!(main || sub || rarity || set || free);
  const filtered = items.filter((item) => {
    const a = item.artifact;
    if (!a) return !active;
    return (!main || a.mainStat === main) && (!sub || a.subStats.some((s) => s.stat === sub)) && (!rarity || a.rarity === rarity) && (!set || a.setKey === set) && (!free || !a.equippedCard);
  });
  return { filtered, active, state: { main, sub, rarity, set, free }, set: { setMain, setSub, setRarity, setSet, setFree }, reset: () => { setMain(""); setSub(""); setRarity(""); setSet(""); setFree(false); } };
}
export type ArtifactFilter = ReturnType<typeof useArtifactFilter>;

export function ArtifactFilterBar({ filter, sets = true }: { filter: Pick<ArtifactFilter, "state" | "set" | "active" | "reset">; sets?: boolean }) {
  const { state, set } = filter;
  return <div className="card-filters artifact-filters" role="group" aria-label="Filtrer les artefacts">
    <select aria-label="Stat principale" value={state.main} onChange={(e) => set.setMain(e.target.value)}><option value="">Toute stat principale</option>{STATS.map((s) => <option key={s} value={s}>{artifactStatLabel(s)}</option>)}</select>
    <select aria-label="Sous-stat" value={state.sub} onChange={(e) => set.setSub(e.target.value)}><option value="">Toute sous-stat</option>{STATS.map((s) => <option key={s} value={s}>{artifactStatLabel(s)}</option>)}</select>
    <select aria-label="Rareté" value={state.rarity} onChange={(e) => set.setRarity(e.target.value as Rarity | "")}><option value="">Toutes raretés</option>{RARITIES.map((r) => <option key={r} value={r}>{r} · {artifactRarity(r).label}</option>)}</select>
    {sets && <select aria-label="Set" value={state.set} onChange={(e) => set.setSet(e.target.value)}><option value="">Tous les sets</option>{DUNGEONS.map((d) => <option key={d.key} value={d.key}>{d.universe}</option>)}</select>}
    <label className="card-filters-fav"><input type="checkbox" checked={state.free} onChange={(e) => set.setFree(e.target.checked)} /> Non équipés</label>
    {filter.active && <button type="button" className="ui-button" onClick={filter.reset}>Effacer</button>}
  </div>;
}
