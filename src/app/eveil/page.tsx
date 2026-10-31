import type { Metadata } from "next";
import { Suspense } from "react";
import { prisma } from "@/lib/db";
import { awakenCost, needsDuplicate, universeOfFranchise } from "@/lib/awakening";
import { duplicateWhere } from "@/lib/awaken";
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
            Chaque étoile ajoute +2 % d&apos;ATK, de DEF et de PV. Les étoiles 1 à 3 coûtent des ressources de l&apos;histoire : la carte d&apos;un univers utilise moitié fragments de signature, moitié ressource de son univers. Les étoiles 4 et 5 (SSR et UR) demandent des cœurs de brèche du raid et un doublon du personnage.
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
      where: { ownerId: user.id, inAuction: false, OR: [{ stars: { lt: 3 } }, { stars: { lt: 5 }, character: { rarity: { in: ["SSR", "UR"] } } }] },
      orderBy: [{ character: { power: "desc" } }, { id: "asc" }],
      take: 300,
      select: { id: true, characterId: true, stars: true, finish: true, character: { select: { name: true, imageUrl: true, rarity: true, type: true, attack: true, defense: true, power: true, mainMediaId: true, mainMedia: { select: { franchiseId: true, titleEnglish: true, titleRomaji: true } } } } },
    }),
    prisma.resourceStock.findMany({ where: { userId: user.id } }),
  ]);
  const have = (key: string) => stock.find((s) => s.key === key)?.quantity ?? 0;
  // Doublons libres par carte : nécessaires seulement pour les étoiles 4 et 5
  const dupes = new Map<string, number>();
  for (const c of cards.filter((x) => needsDuplicate(x.stars + 1))) {
    dupes.set(c.id, await prisma.card.count({ where: duplicateWhere(user.id, c.characterId, c.id) }));
  }
  const rows: AwakenRow[] = cards.map((c) => {
    const cost = awakenCost(c.character.rarity, c.stars + 1, universeOfFranchise(c.character.mainMedia?.franchiseId ?? c.character.mainMediaId));
    return {
      id: c.id, name: c.character.name, imageUrl: c.character.imageUrl, rarity: c.character.rarity, type: c.character.type, attack: c.character.attack, defense: c.character.defense, power: c.character.power,
      finish: c.finish, series: c.character.mainMedia ? c.character.mainMedia.titleEnglish ?? c.character.mainMedia.titleRomaji : null, stars: c.stars,
      duplicate: dupes.has(c.id) ? { available: dupes.get(c.id)! } : null,
      cost: cost.map((x) => ({ name: RESOURCE_NAMES[x.key] ?? x.key, quantity: x.quantity, have: have(x.key) })),
    };
  });
  return <AwakenList rows={rows} />;
}
