import { modeLockPanel } from "@/components/AdventureLock";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SceneBody } from "@/components/SceneBody";
import { prisma } from "@/lib/db";
import { getAttackTeam, getRaidState } from "@/lib/battles";
import { nextBossAt } from "@/lib/raid";
import { requireUser } from "@/lib/session";
import { RaidBoard } from "./RaidBoard";

export const metadata: Metadata = { title: "Raid — Anime Masters" };

export default function RaidPage() {
  return (
    <main className="vt">
      <SceneBody night scroll />
      <Suspense fallback={<p className="vt-inner vt-muted">Chargement…</p>}>
        <Raid />
      </Suspense>
    </main>
  );
}

async function Raid() {
  const user = await requireUser();
  const locked = await modeLockPanel(user.id, "raid");
  if (locked) return locked;
  const now = new Date();
  const [state, team] = await Promise.all([getRaidState(user.id, now), getAttackTeam(user.id)]);
  const leader = await prisma.character.findFirst({
    where: { disabled: false, rarity: "UR", type: state.boss.type },
    orderBy: [{ favourites: "desc" }, { id: "asc" }],
    select: { name: true, imageUrl: true },
  });
  return (
    <div className="vt-inner">
      <header className="pg-head">
        <h1 className="vt-title">Raid</h1>
        <p className="vt-sub">
          Un monstre sorti d&apos;une brèche majeure, un par semaine. Tu es payé en <b>cœurs de brèche</b> selon la part de ses PV que tu retires, même en cas de défaite ; la victoire rapporte le plus. Ils servent aux étoiles 4 et 5. Ton équipe vient de la page <Link href="/equipe">Équipe</Link>.
        </p>
      </header>
      <RaidBoard
        boss={{ key: state.boss.key, name: state.boss.name, blurb: state.boss.blurb, type: state.boss.type, imageUrl: leader?.imageUrl ?? null, leaderName: leader?.name ?? null }}
        changesAt={nextBossAt(now).toISOString()}
        tutorial={state.tutorial}
        difficulties={state.difficulties.map((d) => ({ key: d.key, name: d.name, mult: d.mult, unlocked: d.unlocked, bestShare: d.bestShare, won: d.won }))}
        fullHeartsLeft={state.fullHeartsLeft}
        hearts={state.hearts}
        team={team.map((c) => (c ? { name: c.character.name, imageUrl: c.character.imageUrl, rarity: c.character.rarity } : null))}
      />
    </div>
  );
}
