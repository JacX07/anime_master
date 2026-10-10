"use client";

import { useEffect, useState, useTransition } from "react";
import { CharacterCard } from "@/components/CharacterCard";
import { MAX_PACKS, PACK_INTERVAL_MS } from "@/lib/pack-stock";
import type { OpenedCard, PlayerPackState } from "@/lib/packs";
import { SSR_PITY, UR_PITY } from "@/lib/pull";
import { openPackAction } from "./actions";

/** Stock affiché, recalculé localement à chaque seconde à partir de l'état serveur. */
function useLiveStock(state: PlayerPackState) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);

  if (now === null || !state.nextPackAt) return { available: state.available, msLeft: null };
  const next = new Date(state.nextPackAt).getTime();
  if (now < next) return { available: state.available, msLeft: next - now };
  const gained = 1 + Math.floor((now - next) / PACK_INTERVAL_MS);
  const available = Math.min(MAX_PACKS, state.available + gained);
  return {
    available,
    msLeft: available >= MAX_PACKS ? null : next + gained * PACK_INTERVAL_MS - now,
  };
}

function formatDuration(ms: number) {
  const total = Math.ceil(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

export function PackOpener({ initialState }: { initialState: PlayerPackState }) {
  const [state, setState] = useState(initialState);
  const [cards, setCards] = useState<OpenedCard[] | null>(null);
  const [revealed, setRevealed] = useState<boolean[]>([]);
  const [pity, setPity] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { available, msLeft } = useLiveStock(state);

  const allRevealed = cards !== null && revealed.every(Boolean);

  function open() {
    setError(null);
    startTransition(async () => {
      const result = await openPackAction();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setState(result.pack.state);
      setCards(result.pack.cards);
      setRevealed(result.pack.cards.map(() => false));
      setPity(
        result.pack.pity === "UR" ? "Pity UR déclenché !" : result.pack.pity === "SSR" ? "Pity SSR déclenché !" : null,
      );
    });
  }

  const reveal = (i: number) => setRevealed((r) => r.map((v, j) => v || j === i));

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-wrap items-center gap-x-8 gap-y-4 rounded-2xl bg-panel p-5">
        <div>
          <div className="text-3xl font-extrabold tabular-nums">
            {available} <span className="text-base font-medium text-muted">/ {MAX_PACKS} paquets</span>
          </div>
          <div className="text-sm text-muted">
            {msLeft === null ? "Stock plein" : `Prochain paquet dans ${formatDuration(msLeft)}`}
          </div>
        </div>
        <div className="text-sm text-muted">
          <div>
            SSR garanti dans <b className="text-[var(--rarity-SSR)]">{SSR_PITY - state.packsSinceSSR}</b> paquet(s)
          </div>
          <div>
            UR garanti dans <b className="text-[var(--rarity-UR)]">{UR_PITY - state.packsSinceUR}</b> paquet(s)
          </div>
        </div>
        <button
          type="button"
          onClick={open}
          disabled={pending || available < 1 || (cards !== null && !allRevealed)}
          className="ml-auto rounded-xl bg-[#2b6cff] px-6 py-3 font-bold text-white shadow-lg shadow-[#2b6cff]/20 hover:bg-[#4b8bff] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Ouverture…" : cards ? "Ouvrir le suivant" : "Ouvrir un paquet"}
        </button>
      </section>

      {error && (
        <p role="alert" className="rounded-lg bg-rose-500/15 px-4 py-3 text-rose-300">
          {error}
        </p>
      )}

      {cards && (
        <section className="flex flex-col items-center gap-6">
          {pity && <p className="font-bold text-amber-300">{pity}</p>}
          <div className="grid w-full max-w-5xl grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {cards.map((card, i) => (
              <div
                key={card.cardId}
                className="flip"
                data-revealed={revealed[i]}
                onClick={() => reveal(i)}
                role="button"
                tabIndex={revealed[i] ? -1 : 0}
                aria-label={revealed[i] ? card.name : `Retourner la carte ${i + 1}`}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && reveal(i)}
              >
                <div className="flip-inner">
                  <div className="flip-face card-back">
                    <span className="text-2xl font-black tracking-widest text-[#8fb5ff]/70">AM</span>
                  </div>
                  <div className="flip-face flip-front" aria-hidden={!revealed[i]}>
                    <CharacterCard {...card} />
                  </div>
                </div>
              </div>
            ))}
          </div>
          {!allRevealed && (
            <button
              type="button"
              onClick={() => setRevealed((r) => r.map(() => true))}
              className="rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold hover:bg-white/5"
            >
              Tout révéler
            </button>
          )}
        </section>
      )}
    </div>
  );
}
