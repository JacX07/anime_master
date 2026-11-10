"use client";

import { useMemo, useState, useTransition } from "react";
import type { CardType, Rarity } from "@/generated/prisma/enums";
import { toggleFavoriteAction } from "@/app/favorite-actions";
import { ROLE_LABELS, ROLES, rolesOf, type Role } from "@/lib/character-roles";
import { RARITY_NAMES, TYPE_LABELS } from "@/lib/labels";

type Filterable = { characterId: number; name: string; rarity: Rarity; type: CardType; series?: string | null };

/** Favoris du joueur, mis à jour tout de suite à l'écran puis enregistrés (v0.3.0). */
export function useFavorites(initial: number[]) {
  const [ids, setIds] = useState(() => new Set(initial));
  const [, start] = useTransition();
  return {
    has: (characterId: number) => ids.has(characterId),
    toggle(characterId: number) {
      const on = !ids.has(characterId);
      setIds((s) => { const n = new Set(s); if (on) n.add(characterId); else n.delete(characterId); return n; });
      start(async () => {
        const r = await toggleFavoriteAction(characterId, on);
        if (!r.ok) setIds((s) => { const n = new Set(s); if (on) n.delete(characterId); else n.add(characterId); return n; });
      });
    },
  };
}
export type Favorites = ReturnType<typeof useFavorites>;

/** Filtres communs des listes de personnages : nom ou anime, rareté, type, rôle, favoris ; favoris en premier. */
export function useCardFilter<T extends Filterable>(cards: T[], favorites: Favorites) {
  const [query, setQuery] = useState("");
  const [rarity, setRarity] = useState<Rarity | "">("");
  const [type, setType] = useState<CardType | "">("");
  const [role, setRole] = useState<Role | "">("");
  const [favOnly, setFavOnly] = useState(false);
  const roles = useMemo(() => new Map(cards.map((c) => [c.characterId, rolesOf(c)])), [cards]);
  const needle = query.trim().toLocaleLowerCase("fr");
  const filtered = cards
    .filter((c) => (!rarity || c.rarity === rarity) && (!type || c.type === type) && (!role || roles.get(c.characterId)!.includes(role))
      && (!favOnly || favorites.has(c.characterId)) && (!needle || `${c.name} ${c.series ?? ""}`.toLocaleLowerCase("fr").includes(needle)))
    .sort((a, b) => Number(favorites.has(b.characterId)) - Number(favorites.has(a.characterId)));
  const reset = () => { setQuery(""); setRarity(""); setType(""); setRole(""); setFavOnly(false); };
  return { filtered, roles, reset, state: { query, rarity, type, role, favOnly }, set: { setQuery, setRarity, setType, setRole, setFavOnly } };
}
export type CardFilter = ReturnType<typeof useCardFilter>;

export function CardFilterBar({ filter, onChange }: { filter: Pick<CardFilter, "state" | "set">; onChange?: () => void }) {
  const { state, set } = filter;
  const after = (fn: () => void) => { fn(); onChange?.(); };
  return <div className="card-filters">
    <input type="search" aria-label="Rechercher une carte" placeholder="Nom ou anime…" value={state.query} onChange={(e) => after(() => set.setQuery(e.target.value))} />
    <select aria-label="Rareté" value={state.rarity} onChange={(e) => after(() => set.setRarity(e.target.value as Rarity | ""))}><option value="">Toutes raretés</option>{Object.entries(RARITY_NAMES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
    <select aria-label="Type" value={state.type} onChange={(e) => after(() => set.setType(e.target.value as CardType | ""))}><option value="">Tous types</option>{Object.entries(TYPE_LABELS).map(([k, l]) => <option key={k} value={k}>{l.name}</option>)}</select>
    <select aria-label="Rôle" value={state.role} onChange={(e) => after(() => set.setRole(e.target.value as Role | ""))}><option value="">Tous rôles</option>{ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}</select>
    <label className="card-filters-fav"><input type="checkbox" checked={state.favOnly} onChange={(e) => after(() => set.setFavOnly(e.target.checked))} /> ★ Favoris</label>
  </div>;
}

/** Étoile de favori (bouton autonome, à placer hors d'un autre bouton). */
export function FavoriteStar({ on, onToggle, name }: { on: boolean; onToggle: () => void; name: string }) {
  return <button type="button" className="fav-star" aria-pressed={on} aria-label={on ? `Retirer ${name} des favoris` : `Ajouter ${name} aux favoris`} title={on ? "Retirer des favoris" : "Ajouter aux favoris"} onClick={onToggle}>{on ? "★" : "☆"}</button>;
}
