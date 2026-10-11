"use client";

import { useEffect, useState } from "react";
import { TypeIcon } from "@/components/icons";
import type { StoredResult } from "@/lib/duels";
import { TYPE_LABELS } from "@/lib/labels";

const num = new Intl.NumberFormat("fr-FR");
const STEP_MS = 1400;

interface Char {
  id: number;
  name: string;
  imageUrl: string;
}

function Bar({ name, hp, max, active }: { name: string; hp: number; max: number; active: boolean }) {
  const pct = max > 0 ? (hp / max) * 100 : 0;
  return (
    <div className="duel-hp" data-active={active}>
      <span>
        <b>{name}</b>
        <span className="vt-muted">
          {num.format(hp)} / {num.format(max)} PV · {Math.round(pct)} %
        </span>
      </span>
      <div>
        <span style={{ width: `${pct}%` }} data-low={pct < 25} />
      </div>
    </div>
  );
}

/** Replay tour par tour du combat calculé par le serveur (rien n'est recalculé ici). */
export function Replay({ result, characters, nameA, nameB, me }: { result: StoredResult; characters: Record<number, Char>; nameA: string; nameB: string; me: "A" | "B" }) {
  const total = result.turns.length;
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (shown >= total) return;
    const t = setTimeout(() => setShown((s) => s + 1), shown === 0 ? 600 : STEP_MS);
    return () => clearTimeout(t);
  }, [shown, total]);

  const last = shown > 0 ? result.turns[shown - 1] : null;
  const hpA = last ? last.hpA : result.maxA;
  const hpB = last ? last.hpB : result.maxB;
  const over = shown >= total;
  const verdict = result.winner === null ? "Match nul" : result.winner === me ? "Victoire" : "Défaite";

  return (
    <section className="duel-replay" aria-label="Replay du combat">
      <div className="duel-bars">
        <Bar name={nameA} hp={hpA} max={result.maxA} active={last?.side === "A"} />
        <Bar name={nameB} hp={hpB} max={result.maxB} active={last?.side === "B"} />
      </div>
      <ol className="duel-turns" aria-live="polite">
        {result.turns.slice(0, shown).map((t, i) => {
          const c = characters[t.characterId];
          return (
            <li key={i} data-side={t.side}>
              {c && <img src={c.imageUrl} alt="" />}
              <div>
                <b>
                  {t.side === "A" ? nameA : nameB} · {c?.name ?? "?"} <TypeIcon type={t.type} title={TYPE_LABELS[t.type].name} />
                </b>
                <span className="vt-muted">
                  {t.errors} erreur{t.errors > 1 ? "s" : ""} sur 4 · ATK {num.format(t.atk)}
                </span>
              </div>
              <span className="duel-dmg">
                −{num.format(t.damage)}
                {t.heal > 0 && <small> +{num.format(t.heal)} PV</small>}
              </span>
            </li>
          );
        })}
      </ol>
      {over ? (
        <p className="duel-verdict" data-outcome={result.winner === null ? "draw" : result.winner === me ? "win" : "loss"}>
          {verdict}
          {result.hpA === 0 || result.hpB === 0 ? " par KO" : " aux PV restants"}
        </p>
      ) : (
        <button type="button" className="vt-btn ghost" onClick={() => setShown(total)}>
          Passer le replay
        </button>
      )}
    </section>
  );
}
