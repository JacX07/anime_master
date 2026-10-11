"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { buyNowAction, cancelAuctionAction, placeBidAction } from "@/app/auction-actions";
import { Money } from "@/components/icons";

type Role = "guest" | "seller" | "seller-bids" | "leader" | "bidder";

export function BidPanel({ auctionId, minBid, buyNowPrice, role }: { auctionId: string; minBid: number; buyNowPrice: number | null; role: Role }) {
  const router = useRouter();
  const [amount, setAmount] = useState(minBid);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const run = (action: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) =>
    start(async () => {
      const r = await action();
      setError(r.ok ? null : (r.error ?? "Échec."));
      if (r.ok) after?.();
      router.refresh();
    });

  if (role === "guest") return <p className="vt-muted">Connecte-toi pour enchérir.</p>;
  if (role === "seller" || role === "seller-bids")
    return (
      <div className="bid-panel">
        <p className="vt-muted">C&apos;est ton enchère.</p>
        {role === "seller" && (
          <button type="button" className="vt-btn ghost" disabled={pending} onClick={() => run(() => cancelAuctionAction(auctionId), () => router.push("/market"))}>
            Annuler l&apos;enchère
          </button>
        )}
        {role === "seller-bids" && <p className="vt-muted">Elle a déjà une offre : elle ne peut plus être annulée.</p>}
        {error && <p role="alert" className="trade-error">{error}</p>}
      </div>
    );
  return (
    <div className="bid-panel">
      {role === "leader" ? (
        <p className="vt-muted">Tu es le meilleur enchérisseur : tes Ryō sont réservés.</p>
      ) : (
        <div className="bid-row">
          <input type="number" min={minBid} value={amount} onChange={(e) => setAmount(Math.floor(Number(e.target.value) || 0))} aria-label="Montant de l'offre" />
          <button type="button" className="vt-btn" disabled={pending} onClick={() => run(() => placeBidAction(auctionId, amount), () => setAmount(amount + 1))}>
            Enchérir · <Money n={amount} />
          </button>
          <small className="vt-muted">minimum {minBid}</small>
        </div>
      )}
      {buyNowPrice !== null && (
        <button type="button" className="vt-btn ghost" disabled={pending} onClick={() => run(() => buyNowAction(auctionId))}>
          Acheter maintenant · <Money n={buyNowPrice} />
        </button>
      )}
      {error && <p role="alert" className="trade-error">{error}</p>}
    </div>
  );
}
