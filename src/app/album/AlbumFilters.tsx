"use client";

import Form from "next/form";
import { useRef } from "react";
import type { AlbumFilters as Filters } from "@/lib/album";
import { RARITY_NAMES, TYPE_LABELS } from "@/lib/labels";

const RARITIES = ["UR", "SSR", "SR", "R", "N"] as const;
const TYPES = ["COMBAT", "MYSTERE", "MAGIE", "COEUR", "AVENTURE"] as const;
const OWNED = [
  ["all", "Tous"],
  ["owned", "Possédés"],
  ["missing", "Manquants"],
  ["duplicates", "Doublons"],
] as const;

const field = "rounded-lg border border-white/10 bg-panel px-3 py-2 text-sm focus:border-violet-400 focus:outline-none";

/** Filtres de l'album dans l'URL (formulaire GET) : les listes s'appliquent dès qu'on les change. */
export function AlbumFilters({ filters }: { filters: Filters }) {
  const form = useRef<HTMLFormElement>(null);
  const submit = () => form.current?.requestSubmit();
  // Champs vides désactivés le temps de l'envoi : ils n'encombrent pas l'URL (/album?q=&rarity=…)
  const dropEmpty = (e: React.FormEvent<HTMLFormElement>) => {
    const empty = [...e.currentTarget.elements].filter(
      (el): el is HTMLInputElement | HTMLSelectElement =>
        (el instanceof HTMLInputElement || el instanceof HTMLSelectElement) && (el.value === "" || el.value === "all"),
    );
    empty.forEach((el) => (el.disabled = true));
    setTimeout(() => empty.forEach((el) => (el.disabled = false)));
  };
  return (
    <Form ref={form} action="/album" replace onSubmit={dropEmpty} className="flex flex-wrap gap-2" key={JSON.stringify(filters)}>
      <input
        type="search"
        name="q"
        defaultValue={filters.q}
        placeholder="Rechercher un personnage…"
        aria-label="Rechercher un personnage"
        className={`${field} min-w-56 flex-1`}
      />
      <select name="rarity" defaultValue={filters.rarity ?? ""} onChange={submit} aria-label="Rareté" className={field}>
        <option value="">Toutes raretés</option>
        {RARITIES.map((r) => (
          <option key={r} value={r}>
            {r} · {RARITY_NAMES[r]}
          </option>
        ))}
      </select>
      <select name="type" defaultValue={filters.type ?? ""} onChange={submit} aria-label="Type" className={field}>
        <option value="">Tous types</option>
        {TYPES.map((t) => (
          <option key={t} value={t}>
            {TYPE_LABELS[t].emoji} {TYPE_LABELS[t].name}
          </option>
        ))}
      </select>
      <select name="owned" defaultValue={filters.owned} onChange={submit} aria-label="Possession" className={field}>
        {OWNED.map(([v, label]) => (
          <option key={v} value={v}>
            {label}
          </option>
        ))}
      </select>
      <button type="submit" className="rounded-lg bg-violet-500 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-400">
        Filtrer
      </button>
    </Form>
  );
}
