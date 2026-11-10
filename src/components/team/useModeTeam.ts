"use client";

import { useEffect, useState, useTransition } from "react";
import { bestTeamAction } from "@/app/battle-actions";
import type { TeamContext } from "@/lib/team-context";

/**
 * Composition propre à un mode (histoire, Tour, donjon, raid) : mémorisée dans le navigateur sous `storageKey`,
 * initialisée avec l'équipe d'attaque. Charger une squad ne modifie jamais la squad enregistrée.
 */
export function useModeTeam(storageKey: string, { ownedCards, attackIds }: Pick<TeamContext, "ownedCards" | "attackIds">, allowDuo = false) {
  const [slots, setSlots] = useState<(string | null)[]>(attackIds);
  const [duo, setDuo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  // Doublons de personnage et cartes disparues retirés.
  const clean = (ids: unknown[]) => {
    const seen = new Set<number>();
    return Array.from({ length: 4 }, (_, i) => {
      const card = ownedCards.find((c) => c.id === ids[i]);
      if (!card || seen.has(card.combat.characterId)) return null;
      seen.add(card.combat.characterId);
      return card.id;
    });
  };
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) ?? "null");
      if (saved && Array.isArray(saved.slots) && saved.slots.length === 4) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSlots(clean(saved.slots));
        setDuo(allowDuo && saved.duo === true);
      }
    } catch { /* Stockage indisponible : on garde l'équipe d'attaque. */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey, ownedCards, allowDuo]);

  function remember(nextSlots: (string | null)[], nextDuo: boolean) {
    try { localStorage.setItem(storageKey, JSON.stringify({ slots: nextSlots, duo: nextDuo })); } catch { /* Sans stockage, la composition dure le temps de la page. */ }
  }
  const size = allowDuo && duo ? 2 : 4;
  const selectedIds = slots.slice(0, size).filter((id): id is string => !!id);
  const active = selectedIds.map((id) => ownedCards.find((c) => c.id === id)!).filter(Boolean);
  const ready = active.length === size && new Set(active.map((c) => c.combat.characterId)).size === size;

  return {
    slots, duo: allowDuo && duo, size, selectedIds, ready, error, setError, pending, start,
    changeDuo(value: boolean) { setDuo(value); remember(slots, value); },
    choose(index: number, id: string) {
      const next = slots.map((old, i) => (i === index ? id : old));
      setError(null); setSlots(next); remember(next, duo);
    },
    loadSquad(ids: (string | null)[]) {
      const next = clean(ids);
      setError(null); setSlots(next); remember(next, duo);
      if (next.some((id, i) => !id && ids[i])) setError("Certaines cartes de cette squad ne sont plus disponibles.");
    },
    autoTeam() {
      setError(null);
      start(async () => {
        const res = await bestTeamAction();
        if (!res.ok) return setError(res.error);
        const next = clean(res.cardIds);
        setSlots(next); remember(next, duo);
      });
    },
  };
}
export type ModeTeam = ReturnType<typeof useModeTeam>;
