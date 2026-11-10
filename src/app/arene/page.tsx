import type { Metadata } from "next";
import { Suspense } from "react";
import { SceneBody } from "@/components/SceneBody";
import { PageHeading } from "@/components/mq/PageHeading";
import { arenaState } from "@/lib/arena";
import { getAttackTeam } from "@/lib/battles";
import { TEAM_BUDGET, teamCost } from "@/lib/team-budget";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { ArenaBoard } from "./ArenaBoard";
import "./arene.css";

export const metadata: Metadata = { title: "Arène live — Anime Masters", robots: { index: false } };

export default function ArenaPage() {
  return <main className="vt"><SceneBody night scroll /><Suspense fallback={<p className="vt-inner vt-muted">Chargement de l’arène…</p>}><Arena /></Suspense></main>;
}

async function Arena() {
  const user = await requireUser();
  const [initial, team, me] = await Promise.all([
    arenaState(user.id, 0),
    getAttackTeam(user.id),
    prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { elo: true, username: true, name: true } }),
  ]);
  const cards = team.filter((c): c is NonNullable<typeof c> => !!c);
  const teamInfo = { names: cards.map((c) => c.character.name), complete: cards.length === 4, cost: teamCost(cards.map((c) => c.character.rarity)) };
  return <div className="vt-inner arena-page">
    <PageHeading eyebrow="Combat en direct" title="Arène live" description="4 contre 4 : à chaque tour, tu choisis le sort et la cible de ta carte. 20 secondes par action." />
    <ArenaBoard initial={initial} elo={me.elo} name={me.username ?? me.name} team={teamInfo} budget={TEAM_BUDGET} />
  </div>;
}
