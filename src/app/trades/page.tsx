import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SceneBody } from "@/components/SceneBody";
import { requireUser } from "@/lib/session";
import { listTrades } from "@/lib/trades";
import { NewTradeForm } from "./NewTradeForm";
import { TradeList } from "./TradeList";

export const metadata: Metadata = { title: "Échanges — Anime Masters" };

const TABS = [
  ["recues", "Reçues"],
  ["envoyees", "Envoyées"],
  ["historique", "Historique"],
] as const;
type Tab = (typeof TABS)[number][0];

export default function TradesPage({ searchParams }: PageProps<"/trades">) {
  return (
    <main className="vt">
      <SceneBody night scroll />
      <Suspense fallback={<p className="vt-inner vt-muted">Chargement…</p>}>
        <Trades searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Trades({ searchParams }: { searchParams: PageProps<"/trades">["searchParams"] }) {
  const user = await requireUser();
  const raw = (await searchParams).tab;
  const asked = Array.isArray(raw) ? raw[0] : raw;
  const trades = await listTrades(user.id);
  const pending = trades.filter((t) => t.status === "PENDING");
  const lists: Record<Tab, { trades: typeof trades; empty: string }> = {
    recues: { trades: pending.filter((t) => !t.mine), empty: "Aucune offre reçue." },
    envoyees: { trades: pending.filter((t) => t.mine), empty: "Aucune offre en attente." },
    historique: { trades: trades.filter((t) => t.status !== "PENDING"), empty: "Aucun échange terminé." },
  };
  // Sans onglet demandé : les offres reçues d'abord, sinon les envoyées
  const tab: Tab = TABS.some(([k]) => k === asked) ? (asked as Tab) : lists.recues.trades.length === 0 && lists.envoyees.trades.length > 0 ? "envoyees" : "recues";
  return (
    <div className="vt-inner">
      <header className="pg-head">
        <h1 className="vt-title">Échanges</h1>
        <p className="vt-sub">Cartes et Ryō contre cartes et Ryō, entre joueurs. Réservé aux comptes de plus de 24 h ayant ouvert 20 paquets.</p>
      </header>
      <div className="pg-tabs">
        <nav aria-label="Échanges">
          {TABS.map(([k, label]) => (
            <Link key={k} href={`/trades?tab=${k}`} aria-current={tab === k ? "page" : undefined} replace>
              {label}
              <small>{lists[k].trades.length}</small>
            </Link>
          ))}
        </nav>
        <NewTradeForm />
      </div>
      <TradeList trades={lists[tab].trades} empty={lists[tab].empty} />
    </div>
  );
}
