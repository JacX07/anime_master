import type { Metadata } from "next";
import { Suspense } from "react";
import { prisma } from "@/lib/db";
import { getTeam } from "@/lib/battles";
import { requireUser } from "@/lib/session";
import { TeamBuilder } from "./TeamBuilder";

export const metadata: Metadata = { title: "Équipe — Anime Masters", robots: { index: false } };

export default function TeamPage() {
  return (
    <main className="vt">
      <div className="vt-inner">
        <header className="pg-head">
          <h1 className="vt-title">Équipe</h1>
          <p className="vt-sub">
            Compose tes équipes de 4 cartes. L&apos;équipe d&apos;attaque sert partout (histoire, Tour, test) ; l&apos;équipe de défense attend l&apos;arène PvP. Tes cartes ne sont jamais bloquées.
          </p>
        </header>
        <Suspense fallback={<p className="vt-muted">Chargement…</p>}>
          <Builder />
        </Suspense>
      </div>
    </main>
  );
}

async function Builder() {
  const user = await requireUser();
  const [attack, defense, cards] = await Promise.all([
    getTeam(user.id, "ATTACK"),
    getTeam(user.id, "DEFENSE"),
    prisma.card.findMany({
      where: { ownerId: user.id, inAuction: false },
      orderBy: [{ character: { power: "desc" } }, { id: "asc" }],
      select: {
        id: true,
        stars: true,
        character: {
          select: {
            id: true, name: true, imageUrl: true, rarity: true, type: true, attack: true, defense: true, mainMediaId: true,
            mainMedia: { select: { franchiseId: true, titleEnglish: true, titleRomaji: true } },
          },
        },
      },
    }),
  ]);
  return (
    <TeamBuilder
      cards={cards.map((c) => ({
        id: c.id,
        characterId: c.character.id,
        name: c.character.name,
        imageUrl: c.character.imageUrl,
        rarity: c.character.rarity,
        type: c.character.type,
        attack: c.character.attack,
        defense: c.character.defense,
        stars: c.stars,
        franchiseId: c.character.mainMedia?.franchiseId ?? c.character.mainMediaId,
        series: c.character.mainMedia ? c.character.mainMedia.titleEnglish ?? c.character.mainMedia.titleRomaji : null,
      }))}
      saved={{ ATTACK: attack.map((c) => c?.id ?? null), DEFENSE: defense.map((c) => c?.id ?? null) }}
    />
  );
}
