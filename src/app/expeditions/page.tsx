import type { Metadata } from "next";
import { Suspense } from "react";
import { SceneBody } from "@/components/SceneBody";
import { prisma } from "@/lib/db";
import { BREACHES, expeditionState, MAX_TEAM, SLOTS } from "@/lib/expeditions";
import { requireUser } from "@/lib/session";
import { ExpeditionBoard } from "./ExpeditionBoard";

export const metadata: Metadata = { title: "Expéditions — Anime Masters" };

export default function ExpeditionsPage() {
  return (
    <main className="vt">
      <SceneBody night scroll />
      <Suspense fallback={<p className="vt-inner vt-muted">Chargement…</p>}>
        <Expeditions />
      </Suspense>
    </main>
  );
}

async function Expeditions() {
  const user = await requireUser();
  const [state, cards] = await Promise.all([
    expeditionState(user.id),
    prisma.card.findMany({
      where: { ownerId: user.id, inExpedition: false, inAuction: false },
      select: { id: true, character: { select: { name: true, rarity: true, type: true, power: true, imageUrl: true } } },
      orderBy: { character: { power: "desc" } },
      take: 400,
    }),
  ]);
  const toIso = (d: Date | null) => d?.toISOString() ?? null;
  return (
    <div className="vt-inner">
      <header className="pg-head">
        <h1 className="vt-title">Expéditions</h1>
        <p className="vt-sub">
          Envoie jusqu&apos;à {MAX_TEAM} cartes explorer une brèche. Plus l&apos;équipe est puissante, plus le butin est riche, et un échec ne coûte rien. Les cartes parties sont indisponibles (vente, échange, enchère) jusqu&apos;au retour.
        </p>
      </header>
      <ExpeditionBoard
        slots={state.slots}
        done={state.done}
        nextSlotAt={state.nextSlotAt}
        slotSteps={SLOTS}
        breaches={BREACHES}
        cards={cards.map((c) => ({ id: c.id, ...c.character }))}
        open={state.open.map((e) => ({
          id: e.id,
          breachId: e.breachId,
          endsAt: e.endsAt.toISOString(),
          team: e.cards.map((c) => ({ name: c.card.character.name, imageUrl: c.card.character.imageUrl, rarity: c.card.character.rarity })),
        }))}
        history={state.history.map((e) => ({ id: e.id, breachId: e.breachId, outcome: e.outcome, ryo: e.ryo, crystals: e.crystals, special: e.special, claimedAt: toIso(e.claimedAt) }))}
      />
    </div>
  );
}
