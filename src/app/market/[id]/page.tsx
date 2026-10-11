import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Money, RarityGem } from "@/components/icons";
import { SceneBody } from "@/components/SceneBody";
import { getAuction } from "@/lib/auctions";
import { FINISH_NAMES, RARITY_NAMES } from "@/lib/labels";
import { getSessionUser } from "@/lib/session";
import { Countdown } from "../Countdown";
import { BidPanel } from "./BidPanel";

export const metadata: Metadata = { title: "Enchère — Anime Masters" };
const dateFmt = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "medium" });

export default function AuctionPage({ params }: PageProps<"/market/[id]">) {
  return (
    <main className="vt">
      <SceneBody night scroll />
      <Suspense fallback={<p className="vt-inner vt-muted">Chargement…</p>}>
        <Auction params={params} />
      </Suspense>
    </main>
  );
}

async function Auction({ params }: { params: PageProps<"/market/[id]">["params"] }) {
  const { id } = await params;
  const [a, user] = await Promise.all([getAuction(id), getSessionUser()]);
  if (!a) notFound();
  const ch = a.card.character;
  const active = a.status === "ACTIVE";
  return (
    <div className="vt-inner">
      <Link href="/market" className="vt-muted">← Marché</Link>
      <div className="auction-detail">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={ch.imageUrl} alt={ch.name} referrerPolicy="no-referrer" />
        <div className="auction-info">
          <h1 className="vt-title">{ch.name}</h1>
          <p className="vt-sub">
            <RarityGem rarity={ch.rarity} /> {RARITY_NAMES[ch.rarity]} · #{a.card.serial} · {FINISH_NAMES[a.card.finish]} ·{" "}
            <Link href={`/character/${ch.id}`} className="underline">fiche</Link>
          </p>
          <p>Vendeur : <b>{a.seller.username}</b></p>
          {active ? (
            <>
              <p className="auction-big">
                <Money n={a.currentBid ?? a.startPrice} />{" "}
                <small className="vt-muted">{a.currentBid === null ? "prix de départ" : `offre de ${a.currentBidder?.username}`}</small>
              </p>
              <p>Fin dans <Countdown endsAt={a.endsAt.toISOString()} /> <small className="vt-muted">(une offre dans les 2 dernières minutes repousse la fin)</small></p>
              <BidPanel
                auctionId={a.id}
                minBid={a.minBid}
                buyNowPrice={a.buyNowPrice}
                role={!user ? "guest" : user.id === a.sellerId ? (a.currentBidderId ? "seller-bids" : "seller") : user.id === a.currentBidderId ? "leader" : "bidder"}
              />
            </>
          ) : (
            <p className="auction-big">
              {a.status === "SOLD" ? <>Vendue <Money n={a.finalPrice ?? 0} /> à {a.currentBidder?.username}</> : a.status === "UNSOLD" ? "Terminée sans offre" : "Annulée"}
            </p>
          )}
          <h2 className="vt-h2">Offres</h2>
          {a.bids.length === 0 ? (
            <p className="vt-muted">Aucune offre.</p>
          ) : (
            <ul className="bid-list">
              {a.bids.map((b, i) => (
                <li key={i}>
                  <b>{b.bidder.username}</b> <Money n={b.amount} /> <time className="vt-muted">{dateFmt.format(b.createdAt)}</time>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
