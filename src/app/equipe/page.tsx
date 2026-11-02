import { getPlayerInventory } from "@/lib/player-inventory";
import type { Metadata } from "next";
import { Suspense } from "react";
import { prisma } from "@/lib/db";
import { getTeam } from "@/lib/battles";
import { requireUser } from "@/lib/session";
import { speedOf } from "@/lib/speed";
import { TeamBuilder } from "./TeamBuilder";

export const metadata: Metadata = { title: "Équipe — Anime Masters", robots: { index: false } };

export default function TeamPage() {
  return (
    <main className="vt">
      <div className="vt-inner">
        <header className="pg-head">
          <h1 className="vt-title">Squads</h1>
          <p className="vt-sub">
            Compose tes escouades d&apos;attaque et de défense avec tes cartes. Tes cartes ne sont jamais bloquées.
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
  const [attack, defense, cards, inventory] = await Promise.all([
    getTeam(user.id, "ATTACK"),
    getTeam(user.id, "DEFENSE"),
    prisma.card.findMany({
      where: { ownerId: user.id, inAuction: false },
      orderBy: [{ character: { power: "desc" } }, { id: "asc" }],
      select: {
        id: true,
        stars: true,
        weaponKey: true,
        character: {
          select: {
            id: true, name: true, imageUrl: true, rarity: true, type: true, attack: true, defense: true, mainMediaId: true,
            mainMedia: { select: { franchiseId: true, titleEnglish: true, titleRomaji: true } },
          },
        },
      },
    }),
    getPlayerInventory(user.id),
  ]);
  return (
    <TeamBuilder
      inventory={inventory}
      cards={cards.map((c) => ({
        id: c.id,
        characterId: c.character.id,
        name: c.character.name,
        imageUrl: c.character.imageUrl,
        rarity: c.character.rarity,
        type: c.character.type,
        attack: c.character.attack,
        defense: c.character.defense,
        speed: speedOf(c.character.id),
        stars: c.stars,
        weaponKey: c.weaponKey,
        franchiseId: c.character.mainMedia?.franchiseId ?? c.character.mainMediaId,
        series: c.character.mainMedia ? c.character.mainMedia.titleEnglish ?? c.character.mainMedia.titleRomaji : null,
      }))}
      saved={{ ATTACK: attack.map((c) => c?.id ?? null), DEFENSE: defense.map((c) => c?.id ?? null) }}
    />
  );
}
