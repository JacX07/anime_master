import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SceneBody } from "@/components/SceneBody";
import { prisma } from "@/lib/db";
import { duelCards } from "@/lib/duels";
import { requireUser } from "@/lib/session";
import { TeamPicker } from "../TeamPicker";

export const metadata: Metadata = { title: "Nouveau duel — Anime Masters" };

export default function NewDuelPage({ searchParams }: PageProps<"/duels/new">) {
  return (
    <main className="vt">
      <SceneBody night scroll />
      <Suspense fallback={<p className="vt-inner vt-muted">Chargement…</p>}>
        <NewDuel searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function NewDuel({ searchParams }: { searchParams: PageProps<"/duels/new">["searchParams"] }) {
  const user = await requireUser();
  const sp = await searchParams;
  const to = typeof sp.to === "string" ? sp.to.trim().toLowerCase() : "";
  const other = to ? await prisma.user.findUnique({ where: { username: to }, select: { id: true, username: true, elo: true } }) : null;
  return (
    <div className="vt-inner">
      <header>
        <Link href="/duels" className="vt-muted">
          ← Duels
        </Link>
        <h1 className="vt-title">Nouveau duel</h1>
        {other && other.id !== user.id && (
          <p className="vt-sub">
            Contre <b>{other.username}</b> (Elo {other.elo}). Le challenger attaque en premier. Les stats de tes cartes sont figées au moment du choix ; les cartes restent libres ensuite.
          </p>
        )}
      </header>
      {!other || other.id === user.id ? (
        <p className="vt-empty">{other ? "Tu ne peux pas te défier toi-même." : "Joueur introuvable."}</p>
      ) : (
        <TeamPicker cards={await duelCards(user.id)} to={other.username} />
      )}
    </div>
  );
}
