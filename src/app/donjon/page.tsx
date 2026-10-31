import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { BattlePlayer } from "@/components/battle/BattlePlayer";
import { dungeonBattle } from "@/lib/dungeon";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Donjon — Anime Masters" };

export default function DungeonPage({ searchParams }: { searchParams: Promise<{ seed?: string }> }) {
  return (
    <main className="vt">
      <div className="vt-inner">
        <h1 className="vt-title">Donjon</h1>
        <p className="vt-sub">Mode de test : ton équipe affronte 4 personnages tirés au hasard, de raretés proches des tiennes. Aucune récompense pour l&apos;instant.</p>
        <Suspense fallback={<p className="vt-muted">Préparation du combat…</p>}>
          <Dungeon searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}

const randomSeed = () => Math.floor(Math.random() * 1e9);

async function Dungeon({ searchParams }: { searchParams: Promise<{ seed?: string }> }) {
  // Graine aléatoire : à calculer à la requête, pas au pré-rendu
  await connection();
  const user = await requireUser();
  const { seed: raw } = await searchParams;
  const seed = raw && Number.isSafeInteger(Number(raw)) ? Number(raw) : randomSeed();
  const fight = await dungeonBattle(user.id, seed);
  if (!fight) return <p className="vt-muted">Il te faut au moins 4 personnages différents pour entrer dans le donjon. Ouvre des paquets !</p>;
  return (
    <BattlePlayer
      key={seed}
      log={fight.log}
      characters={fight.characters}
      names={{ A: "Ton équipe", B: "Monstres du donjon" }}
      nextHref={`/donjon?seed=${randomSeed()}`}
    />
  );
}
