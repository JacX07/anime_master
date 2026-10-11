import type { Metadata } from "next";
import { Suspense } from "react";
import { SceneBody } from "@/components/SceneBody";
import { requireUser } from "@/lib/session";
import { listTrades } from "@/lib/trades";
import { NewTradeForm } from "./NewTradeForm";
import { TradeList } from "./TradeList";

export const metadata: Metadata = { title: "Échanges — Anime Masters" };

export default function TradesPage() {
  return (
    <main className="vt">
      <SceneBody night scroll />
      <Suspense fallback={<p className="vt-inner vt-muted">Chargement…</p>}>
        <Trades />
      </Suspense>
    </main>
  );
}

async function Trades() {
  const user = await requireUser();
  const trades = await listTrades(user.id);
  const pending = trades.filter((t) => t.status === "PENDING");
  return (
    <div className="vt-inner">
      <header>
        <h1 className="vt-title">Échanges</h1>
        <p className="vt-sub">Cartes et Ryō contre cartes et Ryō, entre joueurs. Réservé aux comptes de plus de 24 h ayant ouvert 20 paquets.</p>
      </header>
      <NewTradeForm />
      <section>
        <h2 className="vt-h2">Reçues</h2>
        <TradeList trades={pending.filter((t) => !t.mine)} empty="Aucune offre reçue." />
      </section>
      <section>
        <h2 className="vt-h2">Envoyées</h2>
        <TradeList trades={pending.filter((t) => t.mine)} empty="Aucune offre en attente." />
      </section>
      <section>
        <h2 className="vt-h2">Historique</h2>
        <TradeList trades={trades.filter((t) => t.status !== "PENDING")} empty="Aucun échange terminé." />
      </section>
    </div>
  );
}
