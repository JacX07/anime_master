"use client";

import { useState, useTransition } from "react";
import { sellCardAction, toggleLockAction } from "@/app/economy-actions";
import { toggleForTradeAction } from "@/app/trade-actions";
import { Icon, Money } from "@/components/icons";

interface Props {
  cardId: string;
  locked: boolean;
  forTrade: boolean;
  price: number;
  /** Description de la carte pour l'avertissement, ex. « #12 · Holo » */
  label: string;
  characterName: string;
  /** C'est le seul exemplaire possédé de ce personnage */
  lastCopy: boolean;
}


/** Cadenas et vente rapide d'un exemplaire, avec avertissement avant la vente. */
export function CopyActions({ cardId, locked, forTrade, price, label, characterName, lastCopy }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const run = (action: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      const r = await action();
      setError(r.ok ? null : (r.error ?? "Échec."));
      if (r.ok) setConfirming(false);
    });

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => toggleLockAction(cardId, !locked))}
          aria-pressed={locked}
          title={locked ? "Déverrouiller" : "Verrouiller (empêche la vente)"}
          className="rounded-lg border border-white/10 px-2.5 py-1 hover:bg-white/5 disabled:opacity-50"
        >
          <Icon name={locked ? "lock" : "unlock"} title={locked ? "Verrouillée" : "Déverrouillée"} />
        </button>
        <button
          type="button"
          disabled={pending || locked}
          onClick={() => run(() => toggleForTradeAction(cardId, !forTrade))}
          aria-pressed={forTrade}
          title={locked ? "Déverrouille la carte pour la proposer" : forTrade ? "Ne plus proposer à l'échange" : "Proposer à l'échange"}
          className={`rounded-lg border px-2.5 py-1 text-xs font-semibold hover:bg-white/5 disabled:opacity-40 ${forTrade ? "border-[#00c8b4] text-[#00c8b4]" : "border-white/10"}`}
        >
          {forTrade ? "À échanger ✓" : "À échanger"}
        </button>
        <button
          type="button"
          disabled={pending || locked}
          onClick={() => setConfirming((v) => !v)}
          title={locked ? "Déverrouille la carte pour la vendre" : undefined}
          className="rounded-lg bg-amber-400/90 px-3 py-1 text-xs font-bold text-black hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Vendre · <Money n={price} />
        </button>
      </div>

      {confirming && (
        <div role="alertdialog" aria-label="Confirmer la vente" className="w-72 rounded-xl border border-amber-400/40 bg-black/40 p-3 text-left text-xs leading-relaxed">
          <p>
            Vendre <b>{characterName}</b> ({label}) pour <b><Money n={price} /></b> ?
          </p>
          <p className="mt-1 text-muted">La carte est définitivement retirée de ta collection. Cette action est irréversible.</p>
          {lastCopy && (
            <p className="mt-1 font-semibold text-rose-300">
              ⚠ C&apos;est ton seul exemplaire de ce personnage : il disparaîtra de ton album.
            </p>
          )}
          <div className="mt-2 flex justify-end gap-2">
            <button type="button" onClick={() => setConfirming(false)} className="rounded-lg border border-white/15 px-3 py-1 hover:bg-white/5">
              Annuler
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => sellCardAction(cardId))}
              className="rounded-lg bg-rose-500 px-3 py-1 font-bold text-white hover:bg-rose-400 disabled:opacity-50"
            >
              {pending ? "Vente…" : "Confirmer la vente"}
            </button>
          </div>
        </div>
      )}
      {error && (
        <p role="alert" className="text-xs text-rose-300">
          {error}
        </p>
      )}
    </div>
  );
}
