import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { BattlePlayer } from "@/components/battle/BattlePlayer";
import { demoBattle } from "@/lib/battle-demo";

export const metadata: Metadata = { title: "Test du lecteur de combat — Anime Masters", robots: { index: false } };

export default function CombatTestPage({ searchParams }: { searchParams: Promise<{ seed?: string }> }) {
  return (
    <main className="vt">
      <div className="vt-inner">
        <h1 className="vt-title">Lecteur de combat</h1>
        <p className="vt-sub">Page de test : 8 cartes tirées au hasard, combat joué par le moteur, rejoué ici à partir du journal.</p>
        <Suspense fallback={<p className="vt-muted">Préparation du combat…</p>}>
          <Demo searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}

const randomSeed = () => Math.floor(Math.random() * 1e9);

async function Demo({ searchParams }: { searchParams: Promise<{ seed?: string }> }) {
  // Graine aléatoire : à calculer à la requête, pas au pré-rendu
  await connection();
  const { seed: raw } = await searchParams;
  const seed = raw && Number.isSafeInteger(Number(raw)) ? Number(raw) : randomSeed();
  const { log, characters } = await demoBattle(seed);
  return (
    <>
      <BattlePlayer key={seed} log={log} characters={characters} nextHref={`/combat/test?seed=${randomSeed()}`} />
      <p className="vt-muted">
        Graine {seed} : ajoute <code>?seed={seed}</code> à l&apos;adresse pour revoir le même combat.
      </p>
    </>
  );
}
