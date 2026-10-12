"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { sellCardAction, toggleLockAction } from "@/app/economy-actions";
import { createAuctionAction } from "@/app/auction-actions";
import { toggleForTradeAction } from "@/app/trade-actions";
import { Icon, Money } from "@/components/icons";

interface Props {
  cardId: string;
  locked: boolean;
  forTrade: boolean;
  inAuction: boolean;
  inExpedition: boolean;
  price: number;
  /** Description de la carte pour l'avertissement, ex. « #12 · Holo » */
  label: string;
  characterName: string;
  /** C'est le seul exemplaire possédé de ce personnage */
  lastCopy: boolean;
}


/** Cadenas et vente rapide d'un exemplaire, avec avertissement avant la vente. */
export function CopyActions({ cardId, locked, forTrade, inAuction, inExpedition, price, label, characterName, lastCopy }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [auctioning, setAuctioning] = useState(false);
  const [start, setStart] = useState(price * 2);
  const [buyNow, setBuyNow] = useState(0);
  const [hours, setHours] = useState(24);
  const [error, setError] = useState<string | null>(null);
  const [pending, start2] = useTransition();

  const run = (action: () => Promise<{ ok: boolean; error?: string }>) =>
    start2(async () => {
      const r = await action();
      setError(r.ok ? null : (r.error ?? "Échec."));
      if (r.ok) setConfirming(false);
    });

  if (inAuction)
    return (
      <Link href="/market" className="rounded-lg border border-[#4b8bff] px-3 py-1 text-xs font-semibold text-[#8fb5ff]">
        Aux enchères →
      </Link>
    );

  if (inExpedition)
    return (
      <Link href="/expeditions" className="rounded-lg border border-[#4b8bff] px-3 py-1 text-xs font-semibold text-[#8fb5ff]">
        En expédition →
      </Link>
    );

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
          onClick={() => setAuctioning((v) => !v)}
          title={locked ? "Déverrouille la carte pour la mettre aux enchères" : undefined}
          className="rounded-lg border border-white/10 px-2.5 py-1 text-xs font-semibold hover:bg-white/5 disabled:opacity-40"
        >
          Enchères
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

      {auctioning && (
        <form
          className="sell-form"
          onSubmit={(e) => {
            e.preventDefault();
            start2(async () => {
              const r = await createAuctionAction({ cardId, startPrice: start, durationHours: hours, buyNowPrice: buyNow > 0 ? buyNow : null });
              setError(r.ok ? null : r.error);
            });
          }}
        >
          <label className="text-xs">
            Départ <input type="number" min={1} value={start} onChange={(e) => setStart(Math.floor(Number(e.target.value) || 0))} /> Ryō
          </label>
          <label className="text-xs">
            Achat immédiat <input type="number" min={0} value={buyNow} onChange={(e) => setBuyNow(Math.floor(Number(e.target.value) || 0))} /> (0 = aucun)
          </label>
          <select value={hours} onChange={(e) => setHours(Number(e.target.value))} aria-label="Durée">
            {[1, 6, 24, 72].map((h) => (
              <option key={h} value={h}>{h} h</option>
            ))}
          </select>
          <button type="submit" disabled={pending} className="vt-btn">Mettre aux enchères</button>
          <p className="w-full text-xs text-muted">La carte est bloquée jusqu&apos;à la fin. Taxe de 5 % sur le prix de vente ; l&apos;enchère ne peut pas être annulée dès qu&apos;il y a une offre.</p>
        </form>
      )}
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
