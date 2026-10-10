"use client";

import { useState, useTransition } from "react";
import { previewDuplicatesAction, sellDuplicatesAction } from "@/app/economy-actions";
import { Money } from "@/components/icons";
import type { SalePreview } from "@/lib/wallet";

const RARITY_ORDER = ["UR", "SSR", "SR", "R", "N"] as const;

/** Vente groupée des doublons : on choisit les raretés, on voit le total, on confirme. */
export function DuplicateSale({ initialRarities, initialPreview }: { initialRarities: string[]; initialPreview: SalePreview }) {
  const [open, setOpen] = useState(false);
  const [rarities, setRarities] = useState(initialRarities);
  const [preview, setPreview] = useState(initialPreview);
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState<React.ReactNode>(null);
  const [pending, start] = useTransition();

  function toggle(r: string) {
    const next = rarities.includes(r) ? rarities.filter((x) => x !== r) : [...rarities, r];
    setRarities(next);
    setConfirming(false);
    start(async () => {
      const res = await previewDuplicatesAction(next);
      if (res.ok) setPreview(res.preview);
    });
  }

  function sell() {
    start(async () => {
      const res = await sellDuplicatesAction(rarities);
      if (res.ok) {
        setMessage(<>{res.count} carte{res.count > 1 ? "s" : ""} vendue{res.count > 1 ? "s" : ""} : +<Money n={res.total} />.</>);
        setConfirming(false);
        const p = await previewDuplicatesAction(rarities);
        if (p.ok) setPreview(p.preview);
      } else setMessage(res.error);
    });
  }

  return (
    <section className="vt-sale">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex w-full items-center justify-between font-bold">
        Vendre mes doublons
        <span className="text-muted">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="mt-4 flex flex-col gap-3 text-sm">
          <p className="text-muted">
            Pour chaque personnage, ton meilleur exemplaire est gardé (finition la plus rare, puis le plus petit numéro). Les cartes verrouillées ne sont jamais vendues.
          </p>
          <div className="flex flex-wrap gap-2">
            {RARITY_ORDER.map((r) => (
              <label key={r} className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 has-[:checked]:border-[#4b8bff]">
                <input type="checkbox" checked={rarities.includes(r)} onChange={() => toggle(r)} className="accent-[#4b8bff]" />
                <b style={{ color: `var(--rarity-${r})` }}>{r}</b>
              </label>
            ))}
          </div>
          <p aria-live="polite">
            {preview.count === 0 ? (
              "Aucun doublon à vendre pour cette sélection."
            ) : (
              <>
                <b>{preview.count}</b> carte{preview.count > 1 ? "s" : ""} ({preview.characters} personnage{preview.characters > 1 ? "s" : ""}) pour{" "}
                <b className="text-amber-300"><Money n={preview.total} /></b>
              </>
            )}
          </p>
          {!confirming ? (
            <button
              type="button"
              disabled={pending || preview.count === 0 || rarities.length === 0}
              onClick={() => setConfirming(true)}
              className="self-start rounded-lg bg-amber-400/90 px-4 py-2 font-bold text-black hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Vendre…
            </button>
          ) : (
            <div role="alertdialog" aria-label="Confirmer la vente groupée" className="rounded-xl border border-amber-400/40 bg-black/40 p-4">
              <p>
                ⚠ Tu vas vendre <b>{preview.count} carte{preview.count > 1 ? "s" : ""}</b> pour <b><Money n={preview.total} /></b>. Elles seront définitivement retirées de ta collection,
                cette action est irréversible.
              </p>
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={() => setConfirming(false)} className="rounded-lg border border-white/15 px-4 py-2 hover:bg-white/5">
                  Annuler
                </button>
                <button type="button" disabled={pending} onClick={sell} className="rounded-lg bg-rose-500 px-4 py-2 font-bold text-white hover:bg-rose-400 disabled:opacity-50">
                  {pending ? "Vente…" : "Confirmer la vente"}
                </button>
              </div>
            </div>
          )}
          {message && <p role="status">{message}</p>}
        </div>
      )}
    </section>
  );
}
