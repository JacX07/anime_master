import type { Metadata } from "next";
import { Suspense } from "react";
import { prisma } from "@/lib/db";
import { awakenCost, STORY_MAX_STARS, universeOfFranchise } from "@/lib/awakening";
import { RESOURCE_NAMES } from "@/lib/story";
import { requireUser } from "@/lib/session";
import { AwakenList, type AwakenRow } from "./AwakenList";
import "../inventaire/inventaire.css";

export const metadata: Metadata = { title: "Éveil — Anime Masters", robots: { index: false } };

export default function AwakenPage() {
  return (
    <main className="vt">
      <div className="vt-inner">
        <header className="pg-head">
          <h1 className="vt-title">Éveil</h1>
          <p className="vt-sub">
            Chaque étoile ajoute +2 % d&apos;ATK, de DEF et de PV. Les étoiles 1 à 3 coûtent des ressources de l&apos;histoire : la carte d&apos;un univers utilise moitié fragments de signature, moitié ressource de son univers. Les étoiles 4 et 5 viendront avec le raid.
          </p>
        </header>
        <Suspense fallback={<p className="vt-muted">Chargement…</p>}>
          <Cards />
        </Suspense>
      </div>
    </main>
  );
}

async function Cards() {
  const user = await requireUser();
  const [cards, stock] = await Promise.all([
    prisma.card.findMany({
      where: { ownerId: user.id, inAuction: false, stars: { lt: STORY_MAX_STARS } },
      orderBy: [{ character: { power: "desc" } }, { id: "asc" }],
      take: 300,
      select: { id: true, stars: true, finish: true, character: { select: { name: true, imageUrl: true, rarity: true, type: true, attack: true, defense: true, power: true, mainMediaId: true, mainMedia: { select: { franchiseId: true, titleEnglish: true, titleRomaji: true } } } } },
    }),
    prisma.resourceStock.findMany({ where: { userId: user.id } }),
  ]);
  const have = (key: string) => stock.find((s) => s.key === key)?.quantity ?? 0;
  const rows: AwakenRow[] = cards.map((c) => {
    const cost = awakenCost(c.character.rarity, c.stars + 1, universeOfFranchise(c.character.mainMedia?.franchiseId ?? c.character.mainMediaId));
    return {
      id: c.id, name: c.character.name, imageUrl: c.character.imageUrl, rarity: c.character.rarity, type: c.character.type, attack: c.character.attack, defense: c.character.defense, power: c.character.power,
      finish: c.finish, series: c.character.mainMedia ? c.character.mainMedia.titleEnglish ?? c.character.mainMedia.titleRomaji : null, stars: c.stars,
      cost: cost.map((x) => ({ name: RESOURCE_NAMES[x.key] ?? x.key, quantity: x.quantity, have: have(x.key) })),
    };
  });
  return <AwakenList rows={rows} />;
}
