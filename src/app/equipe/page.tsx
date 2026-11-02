import { getPlayerInventory } from "@/lib/player-inventory";
import type { Metadata } from "next";
import { Suspense } from "react";
import { prisma } from "@/lib/db";
import { getTeam } from "@/lib/battles";
import { requireUser } from "@/lib/session";
import { speedOf } from "@/lib/speed";
import { SquadManager } from "./SquadManager";

export const metadata: Metadata = { title: "Équipe — Anime Masters", robots: { index: false } };

export default function TeamPage() {
  return (
    <main className="vt">
      <div className="vt-inner">
        <Suspense fallback={<p className="vt-muted">Chargement…</p>}>
          <Builder />
        </Suspense>
      </div>
    </main>
  );
}

async function Builder() {
  const user = await requireUser();
  const [attack, defense, cards, inventory, squads] = await Promise.all([
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
            id: true, name: true, imageUrl: true, power: true, rarity: true, type: true, attack: true, defense: true, mainMediaId: true,
            mainMedia: { select: { franchiseId: true, titleEnglish: true, titleRomaji: true } },
          },
        },
      },
    }),
    getPlayerInventory(user.id),
    prisma.squad.findMany({ where: { userId: user.id }, orderBy: { id: "asc" } }),
  ]);
  return (
    <SquadManager
      inventory={inventory}
      cards={cards.map((c) => ({
        id: c.id,
        characterId: c.character.id,
        name: c.character.name,
        imageUrl: c.character.imageUrl,
        rarity: c.character.rarity,
        type: c.character.type,
        power: c.character.power,
        attack: c.character.attack,
        defense: c.character.defense,
        speed: speedOf(c.character.id),
        stars: c.stars,
        weaponKey: c.weaponKey,
        franchiseId: c.character.mainMedia?.franchiseId ?? c.character.mainMediaId,
        series: c.character.mainMedia ? c.character.mainMedia.titleEnglish ?? c.character.mainMedia.titleRomaji : null,
      }))}
      presets={squads.map((s) => ({ id: s.id, name: s.name, slots: Array.from({ length: 4 }, (_, i) => { const id = Array.isArray(s.cardIds) ? s.cardIds[i] : null; return typeof id === "string" ? id : null; }) }))}
      saved={{ ATTACK: attack.map((c) => c?.id ?? null), DEFENSE: defense.map((c) => c?.id ?? null) }}
    />
  );
}
