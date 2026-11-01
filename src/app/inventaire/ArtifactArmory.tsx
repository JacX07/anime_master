"use client";

import { artifactStatLabel, artifactStatValue } from "@/lib/artifact-display";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { equipArtifactAction } from "@/app/battle-actions";
import { RARITY_NAMES } from "@/lib/labels";
import { SLOT_NAMES, type ArtifactSlot } from "@/lib/dungeons";
import type { Rarity } from "@/generated/prisma/enums";

type Artifact = { id: string; slot: string; rarity: Rarity; mainStat: string; mainValue: number; subStats: { stat: string; value: number }[]; level: number; equippedCard: { id: string; character: { name: string } } | null };
type Card = { id: string; serial: number; character: { name: string } };
export function ArtifactArmory({ artifacts, cards }: { artifacts: Artifact[]; cards: Card[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  if (!artifacts.length) return <section className="dg-armory"><h2>Artefacts</h2><p>Gagne ton premier artefact dans le <a href="/donjons">donjon One Piece</a>.</p></section>;
  return <section className="dg-armory"><header><div><h2>Artefacts</h2><p>Équipe chaque emplacement sur une carte. Les bonus s’appliquent à tous les combats.</p></div><b>{artifacts.length} pièce{artifacts.length > 1 ? "s" : ""}</b></header>
    <div className="dg-armory-grid">{artifacts.map((a) => {
      const label = SLOT_NAMES[a.slot as ArtifactSlot] ?? a.slot;
      const value = artifactStatValue(a.mainStat, a.mainValue);
      return <article key={a.id} className="dg-artifact" data-rarity={a.rarity}><small>{RARITY_NAMES[a.rarity]} · niveau {a.level}</small><h3>{label}</h3><p>{artifactStatLabel(a.mainStat)} <b>{value}</b></p>{a.subStats.map((s, i) => <small className="dg-substat" key={i}>{artifactStatLabel(s.stat)} · {artifactStatValue(s.stat, s.value)}</small>)}
        <label>Carte équipée<select disabled={pending} value={a.equippedCard?.id ?? ""} onChange={(e) => { const cardId = e.target.value || null; setError(""); start(async () => { const result = await equipArtifactAction(a.id, cardId); if (!result.ok) setError(result.error); else router.refresh(); }); }}><option value="">Aucune</option>{cards.map((c) => <option key={c.id} value={c.id}>{c.character.name} #{c.serial}</option>)}</select></label>
        {a.equippedCard && <span className="dg-worn">Sur {a.equippedCard.character.name}</span>}
      </article>;
    })}</div>{error && <p role="alert" className="hs-error">{error}</p>}
  </section>;
}
