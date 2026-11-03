"use client";

import { useState, useTransition } from "react";
import { ResourceArt } from "@/components/ResourceArt";
import { RESOURCE_NAMES, universeOf } from "@/lib/story";
import { STAR_TIERS, starTierLoot, UNIVERSE_MAX_STARS } from "@/lib/story-star-rewards";
import type { UniverseView } from "./StoryBoard";

/** Paliers de récompense d'étoiles de l'univers affiché sur la carte. */
export function StarRewards({ universe, onClaim }: { universe: UniverseView; onClaim?: (universe: string, tier: number) => Promise<{ ok: boolean; error?: string }> }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const def = universeOf(universe.key)!;
  const total = Object.values(universe.stars).reduce((n, s) => n + s, 0);

  function claim(tier: number) {
    setError(null);
    start(async () => {
      const res = await onClaim?.(universe.key, tier);
      if (res && !res.ok) setError(res.error ?? "L'opération a échoué.");
    });
  }

  return (
    <section className="hs-rewards" aria-label={`Récompenses d'étoiles : ${universe.name}`}>
      <h3>Récompenses d’étoiles · {universe.name} <span>{total} / {UNIVERSE_MAX_STARS} ★</span></h3>
      <ul>
        {STAR_TIERS.map((t) => {
          const loot = starTierLoot(def, t);
          const done = universe.claimed.includes(t.tier);
          const ready = !done && universe.unlocked && total >= t.stars;
          return (
            <li key={t.tier} className={done ? "is-claimed" : ready ? "is-ready" : undefined}>
              <strong>{t.stars} ★</strong>
              <span>{loot.ryo} Ryō · {loot.crystals} cristaux</span>
              <span>{Object.entries(loot.resources).map(([k, n]) => <span key={k}><ResourceArt resource={k} /> {n} {RESOURCE_NAMES[k] ?? k} </span>)}</span>
              <button type="button" className="bt-btn ui-button text-action" disabled={!ready || pending} onClick={() => claim(t.tier)}>{done ? "Réclamé ✓" : ready ? "Réclamer" : `Encore ${t.stars - total} ★`}</button>
            </li>
          );
        })}
      </ul>
      {error && <p className="hs-error" role="alert">{error}</p>}
    </section>
  );
}
