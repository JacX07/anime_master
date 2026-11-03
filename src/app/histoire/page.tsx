import type { Metadata } from "next";
import { Suspense } from "react";
import { SceneBody } from "@/components/SceneBody";
import { prisma } from "@/lib/db";
import { getAttackTeam, getStoryProgress, getStoryRoster } from "@/lib/battles";
import { requireUser } from "@/lib/session";
import { LEVELS, mixFor } from "@/lib/story";
import { getStarClaims } from "@/lib/story-star-claims";
import { StoryBoard } from "./StoryBoard";

export const metadata: Metadata = { title: "Histoire — Anime Masters" };

export default function StoryPage() {
  return (
    <main className="vt">
      <SceneBody night scroll />
      <Suspense fallback={<p className="vt-inner vt-muted">Chargement…</p>}>
        <Story />
      </Suspense>
    </main>
  );
}

async function Story() {
  const user = await requireUser();
  const [progress, team, stock, claims] = await Promise.all([
    getStoryProgress(user.id),
    getAttackTeam(user.id),
    prisma.resourceStock.findMany({ where: { userId: user.id } }),
    getStarClaims(user.id),
  ]);
  const ownedCards = await getStoryRoster(user.id);
  return (
    <div className="vt-inner">
      <header className="pg-head">
        <h1 className="vt-title">Histoire</h1>
        <p className="vt-sub">
          Remonte le chemin des univers. Choisis un jalon pour préparer ton équipe. Une défaite ne coûte rien.
        </p>
      </header>
      <StoryBoard
        universes={progress.map((p) => ({ key: p.universe.key, name: p.universe.name, resource: p.universe.resource, weaponResource: p.universe.weaponResource, maxLevel: p.maxLevel, unlocked: p.unlocked, rank: p.universe.rank, kind: p.universe.kind, startScale: p.universe.startScale, difficulty: p.universe.difficulty, mixes: Array.from({ length: LEVELS }, (_, l) => mixFor(p.universe, l + 1)), stars: p.stars, claimed: claims[p.universe.key] ?? [] }))}
        storageKey={`story-team:${user.id}`}
        attackIds={team.map((c) => c?.id ?? null)}
        ownedCards={ownedCards}
        stock={Object.fromEntries(stock.map((r) => [r.key, r.quantity]))}
      />
    </div>
  );
}
