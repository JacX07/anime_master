import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SceneBody } from "@/components/SceneBody";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { tradableCards } from "@/lib/trades";
import { TradeComposer } from "./TradeComposer";

export const metadata: Metadata = { title: "Nouvelle offre — Anime Masters" };

export default function NewTradePage({ searchParams }: PageProps<"/trades/new">) {
  return (
    <main className="vt">
      <SceneBody night scroll />
      <Suspense fallback={<p className="vt-inner vt-muted">Chargement…</p>}>
        <Composer searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Composer({ searchParams }: { searchParams: PageProps<"/trades/new">["searchParams"] }) {
  const user = await requireUser();
  const sp = await searchParams;
  const to = typeof sp.to === "string" ? sp.to.trim().toLowerCase() : "";
  const ask = typeof sp.ask === "string" ? sp.ask : null;
  const other = to ? await prisma.user.findUnique({ where: { username: to }, select: { id: true, username: true } }) : null;
  const header = (
    <header>
      <Link href="/trades" className="vt-muted">
        ← Échanges
      </Link>
      <h1 className="vt-title">Nouvelle offre</h1>
    </header>
  );
  if (!other || other.id === user.id) {
    return (
      <div className="vt-inner">
        {header}
        <p className="vt-empty">{other ? "Tu ne peux pas échanger avec toi-même." : "Joueur introuvable."}</p>
      </div>
    );
  }
  const [mine, theirs, me] = await Promise.all([
    tradableCards(user.id),
    tradableCards(other.id),
    prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { balance: true } }),
  ]);
  return (
    <div className="vt-inner">
      {header}
      <TradeComposer to={other.username} mine={mine} theirs={theirs} balance={me.balance} presetAsk={ask} />
    </div>
  );
}
