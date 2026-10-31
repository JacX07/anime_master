import type { Metadata } from "next";
import { Suspense } from "react";
import { ManualArena } from "@/components/battle/ManualArena";
import { prisma } from "@/lib/db";
import { getAttackTeam, getBattle } from "@/lib/battles";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Combat manuel — Anime Masters", robots: { index: false } };

export default function ManualBattlePage() {
  return (
    <main className="vt">
      <div className="vt-inner">
        <h1 className="vt-title">Combat manuel</h1>
        <p className="vt-sub">Page de test : tu choisis le sort et la cible de chaque carte contre une équipe d&apos;essai.</p>
        <Suspense fallback={<p className="vt-muted">Chargement…</p>}>
          <Manual />
        </Suspense>
      </div>
    </main>
  );
}

async function Manual() {
  const user = await requireUser();
  const [team, open, cards] = await Promise.all([
    getAttackTeam(user.id),
    prisma.battle.findFirst({ where: { userId: user.id, manual: true, status: "RUNNING" }, select: { id: true } }),
    prisma.card.findMany({
      where: { ownerId: user.id, inAuction: false, inExpedition: false },
      orderBy: [{ character: { power: "desc" } }, { id: "asc" }],
      select: { id: true, characterId: true },
      take: 40,
    }),
  ]);
  const best: string[] = [];
  const seen = new Set<number>();
  for (const c of cards) {
    if (seen.has(c.characterId)) continue;
    seen.add(c.characterId);
    best.push(c.id);
    if (best.length === 4) break;
  }
  const initial = open ? await getBattle(user.id, open.id) : null;
  return <ManualArena initial={initial} bestCardIds={best} teamReady={team.every((s) => s)} />;
}
