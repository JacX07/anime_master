import type { Metadata } from "next";
import { Suspense } from "react";
import { BattleArena, type OpponentChoice } from "@/components/battle/BattleArena";
import { prisma } from "@/lib/db";
import { getAttackTeam, getBattle, PVM_OPPONENTS } from "@/lib/battles";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Combat — Anime Masters", robots: { index: false } };

const HINTS: Record<string, string> = {
  test: "4 personnages SR fixes, toujours les mêmes.",
  donjon: "4 personnages tirés au hasard, de mêmes raretés que ton équipe.",
};
const OPPONENTS: OpponentChoice[] = Object.entries(PVM_OPPONENTS).map(([key, o]) => ({ key, name: o.name, hint: HINTS[key] ?? "" }));

export default function CombatPage() {
  return (
    <main className="vt">
      <div className="vt-inner">
        <h1 className="vt-title">Combat</h1>
        <p className="vt-sub">Page de test : choisis l&apos;adversaire, puis joue en automatique ou en manuel. Aucune récompense pour l&apos;instant.</p>
        <Suspense fallback={<p className="vt-muted">Chargement…</p>}>
          <Arena />
        </Suspense>
      </div>
    </main>
  );
}

async function Arena() {
  const user = await requireUser();
  const [team, open, cards] = await Promise.all([
    getAttackTeam(user.id),
    prisma.battle.findFirst({ where: { userId: user.id, manual: true, status: "RUNNING", mode: "TEST" }, select: { id: true } }),
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
  return <BattleArena initial={initial} bestCardIds={best} teamReady={team.every((s) => s)} opponents={OPPONENTS} />;
}
