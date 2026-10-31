import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PlayerName } from "@/components/PlayerName";
import { SceneBody } from "@/components/SceneBody";
import { getAttackTeam, getTowerFloor, towerLeaderboard } from "@/lib/battles";
import { requireUser } from "@/lib/session";
import { MAX_FLOOR } from "@/lib/tower";
import { TowerBoard } from "./TowerBoard";

export const metadata: Metadata = { title: "La Tour — Anime Masters" };

export default function TowerPage() {
  return (
    <main className="vt">
      <SceneBody night scroll />
      <Suspense fallback={<p className="vt-inner vt-muted">Chargement…</p>}>
        <Tower />
      </Suspense>
    </main>
  );
}

async function Tower() {
  const user = await requireUser();
  const [maxFloor, team, top] = await Promise.all([getTowerFloor(user.id), getAttackTeam(user.id), towerLeaderboard(10)]);
  return (
    <div className="vt-inner">
      <header className="pg-head">
        <h1 className="vt-title">La Tour</h1>
        <p className="vt-sub">
          Le méta-univers qui relie tous les autres : à chaque étage, 4 personnages tirés au hasard, les mêmes pour tout le monde. Plus tu montes, plus ils sont rares et forts. Une défaite ne coûte rien. Ton équipe vient de la page <Link href="/equipe">Équipe</Link>.
        </p>
      </header>
      <TowerBoard
        maxFloor={maxFloor}
        maxPossible={MAX_FLOOR}
        team={team.map((c) => (c ? { name: c.character.name, imageUrl: c.character.imageUrl, rarity: c.character.rarity } : null))}
      />
      <section aria-label="Classement de la Tour" className="tw-top">
        <h2 className="hs-h">Les plus hauts étages</h2>
        {top.length === 0 ? (
          <p className="vt-muted">Personne n&apos;est encore monté. À toi de commencer.</p>
        ) : (
          <ol>
            {top.map((r) => (
              <li key={r.userId} data-me={r.userId === user.id || undefined}>
                <PlayerName username={r.user.username} title={null} /> — étage {r.maxFloor}
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
