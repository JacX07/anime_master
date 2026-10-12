"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { CharacterCard } from "@/components/CharacterCard";
import { RarityGem } from "@/components/icons";
import type { Rarity } from "@/generated/prisma/enums";
import type { OpenedPack } from "@/lib/packs";

const ORDER: Rarity[] = ["UR", "SSR", "SR", "R", "N"];
const FINISH_RANK = { GOLD: 0, HOLO: 1, NORMAL: 2 } as const;

/** Résumé d'une ouverture groupée : toutes les cartes d'un coup, les plus rares en premier. */
export function BulkSummary({ bulk, onClose }: { bulk: OpenedPack; onClose: () => void }) {
  const sorted = useMemo(
    () => [...bulk.cards].sort((a, b) => ORDER.indexOf(a.rarity) - ORDER.indexOf(b.rarity) || FINISH_RANK[a.finish] - FINISH_RANK[b.finish] || b.power - a.power),
    [bulk.cards],
  );
  const counts = ORDER.map((r) => [r, bulk.cards.filter((c) => c.rarity === r).length] as const);
  const fresh = bulk.cards.filter((c) => c.isNew).length;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="bulk" role="dialog" aria-modal="true" aria-label="Résumé de l'ouverture">
      <div className="bulk-in">
        <header>
          <h2>{bulk.lotSize} cartes tirées</h2>
          <ul className="bulk-counts">
            {counts.map(([r, n]) => (
              <li key={r} data-zero={n === 0}>
                <RarityGem rarity={r} />
                <b>{n}</b>
              </li>
            ))}
            <li className="bulk-new">{fresh} nouveau{fresh > 1 ? "x" : ""}</li>
            {bulk.pity !== "NONE" && <li className="bulk-pity">Pity {bulk.pity}</li>}
          </ul>
        </header>
        <div className="bulk-grid">
          {sorted.map((c) => (
            <CharacterCard key={c.cardId} {...c} />
          ))}
        </div>
        <footer>
          <Link href="/album" className="vt-btn ghost">
            Voir l&apos;album
          </Link>
          <button type="button" className="vt-btn" onClick={onClose} autoFocus>
            Continuer
          </button>
        </footer>
      </div>
    </div>
  );
}
