import type { Metadata } from "next";
import { Suspense } from "react";
import { SceneBody } from "@/components/SceneBody";
import { prisma } from "@/lib/db";
import { getAttackTeam, getStoryProgress } from "@/lib/battles";
import { requireUser } from "@/lib/session";
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
  const [progress, team, stock] = await Promise.all([
    getStoryProgress(user.id),
    getAttackTeam(user.id),
    prisma.resourceStock.findMany({ where: { userId: user.id } }),
  ]);
  return (
    <div className="vt-inner">
      <header className="pg-head">
        <h1 className="vt-title">Histoire</h1>
        <p className="vt-sub">
          Les univers sont déréglés par l&apos;anomalie : leurs personnages ont perdu leur signature et attaquent. Gagne les combats dans l&apos;ordre, rejoue-les autant que tu veux pour farmer les ressources d&apos;éveil. Une défaite ne coûte rien.
        </p>
      </header>
      <StoryBoard
        universes={progress.map((p) => ({ key: p.universe.key, name: p.universe.name, resource: p.universe.resource, weaponResource: p.universe.weaponResource, maxLevel: p.maxLevel, unlocked: p.unlocked }))}
        team={team.map((c) => (c ? { name: c.character.name, imageUrl: c.character.imageUrl, rarity: c.character.rarity } : null))}
        stock={Object.fromEntries(stock.map((r) => [r.key, r.quantity]))}
      />
    </div>
  );
}
