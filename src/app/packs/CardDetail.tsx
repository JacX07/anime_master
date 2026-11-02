"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { CharacterCard } from "@/components/CharacterCard";
import { Stat } from "@/components/icons";
import { RARITY_NAMES, TYPE_LABELS } from "@/lib/labels";
import type { OpenedCard } from "@/lib/packs";
import { speedOf } from "@/lib/speed";
import { SpellList } from "@/app/equipe/TeamBuilder";

const num = new Intl.NumberFormat("fr-FR");

/** Fiche d'une carte tirée : stats et sorts, sans quitter la salle des invocations. */
export function CardDetail({ card, onClose }: { card: OpenedCard; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);
  const t = TYPE_LABELS[card.type];
  return (
    <dialog ref={ref} className="pk-detail" aria-label={card.name} onClose={onClose} onClick={(e) => e.target === ref.current && onClose()}>
      <div className="pk-detail-in">
        <div className="pk-detail-art">
          <CharacterCard {...card} characterId={card.characterId} />
        </div>
        <div className="pk-detail-body">
          <header>
            <p className="eyebrow">{card.rarity} · {RARITY_NAMES[card.rarity]} · {t.name}</p>
            <h2>{card.name}</h2>
            {card.series && <small>{card.series}</small>}
          </header>
          <dl className="pk-detail-stats">
            <div><dt>Puissance</dt><dd><Stat icon="puissance" accent="#d5bb7f">{num.format(card.power)}</Stat></dd></div>
            <div><dt>Attaque</dt><dd><Stat icon="atk">{num.format(card.attack)}</Stat></dd></div>
            <div><dt>Défense</dt><dd><Stat icon="def">{num.format(card.defense)}</Stat></dd></div>
            <div><dt>Vitesse</dt><dd>{num.format(speedOf(card.characterId))}</dd></div>
          </dl>
          <h3>Sorts</h3>
          <SpellList card={card} />
          <footer>
            <Link href={`/character/${card.characterId}`} className="pk-ghost">Fiche complète</Link>
            <button type="button" className="pk-ghost" onClick={() => ref.current?.close()} autoFocus>Fermer</button>
          </footer>
        </div>
      </div>
    </dialog>
  );
}
