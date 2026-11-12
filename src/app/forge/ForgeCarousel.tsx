"use client";

import { useCallback, useEffect, useState } from "react";
import { ResourceArt } from "@/components/ResourceArt";
import { ForgeForm } from "./ForgeForm";
import "./forge.css";

export type ForgeNeed = { key: string; name: string; have: number; need: number };
export type ForgeWeapon = { key: string; name: string; passive: string; accent: string; needs: ForgeNeed[]; where: string };
export type ForgeCard = { id: string; label: string; busy: boolean; weaponName: string | null };

/** Carrousel de la forge : une arme en grand, flèches et vignettes pour changer, recette affichée une seule fois. */
export function ForgeCarousel({ weapons, cards }: { weapons: ForgeWeapon[]; cards: ForgeCard[] }) {
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const free = cards.filter((c) => !c.weaponName);
  const [cardId, setCardId] = useState(free[0]?.id ?? "");
  const weapon = weapons[index];
  const go = useCallback((to: number) => {
    const next = (to + weapons.length) % weapons.length;
    setDir(to > index || (index === weapons.length - 1 && next === 0) ? 1 : -1);
    setIndex(next);
  }, [index, weapons.length]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.matches?.("select, input, textarea")) return;
      if (e.key === "ArrowLeft") go(index - 1);
      if (e.key === "ArrowRight") go(index + 1);
    };
    addEventListener("keydown", key);
    return () => removeEventListener("keydown", key);
  }, [go, index]);

  const card = cards.find((c) => c.id === cardId);
  const missing = weapon.needs.some((n) => n.have < n.need);

  return (
    <section className="fg" style={{ "--accent": weapon.accent } as React.CSSProperties} aria-roledescription="carrousel" aria-label="Armes légendaires">
      <div className="fg-glow" aria-hidden="true" />
      <div className="fg-stage">
        <button type="button" className="fg-arrow" onClick={() => go(index - 1)} aria-label="Arme précédente">
          <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true"><path d="M15 4 7 12l8 8" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <div className="fg-art" data-dir={dir} key={weapon.key}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/images/weapons/${weapon.key}.webp`} alt={weapon.name} />
        </div>
        <button type="button" className="fg-arrow" onClick={() => go(index + 1)} aria-label="Arme suivante">
          <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true"><path d="m9 4 8 8-8 8" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </div>

      <div className="fg-info" data-dir={dir} key={`info-${weapon.key}`} aria-live="polite">
        <h2>{weapon.name}</h2>
        <p className="fg-passive">{weapon.passive}</p>
        <h3>Pour la forger</h3>
        <ul className="fg-needs">
          {weapon.needs.map((n) => (
            <li key={n.key} data-missing={n.have < n.need || undefined}>
              <ResourceArt resource={n.key} size={44} />
              <span>{n.name}</span>
              <b>{n.have} / {n.need}</b>
            </li>
          ))}
        </ul>
        <p className="fg-where">{weapon.where}</p>

        {free.length ? (
          <div className="fg-forge">
            <label>Carte 5★ qui recevra l’arme
              <select value={cardId} onChange={(e) => setCardId(e.target.value)}>
                {free.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </label>
            <ForgeForm key={`${weapon.key}-${cardId}`} cardId={cardId} weapon={weapon.key} label={`Forger ${weapon.name}`} disabled={!card || card.busy || missing} />
            {missing && <p className="fg-hint">Il te manque des ressources pour cette arme.</p>}
            {card?.busy && <p className="fg-hint">Cette carte est en vente ou en expédition.</p>}
          </div>
        ) : (
          <p className="fg-hint">{cards.length ? "Toutes tes cartes 5★ ont déjà une arme." : "Aucune carte 5★ : passe par l’éveil pour préparer ta première arme."}</p>
        )}
      </div>

      <div className="fg-thumbs" role="tablist" aria-label="Choisir une arme">
        {weapons.map((w, i) => (
          <button key={w.key} type="button" role="tab" aria-selected={i === index} aria-label={w.name} data-active={i === index || undefined}
            style={{ "--accent": w.accent } as React.CSSProperties} onClick={() => go(i)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/images/weapons/${w.key}.webp`} alt="" />
          </button>
        ))}
      </div>
    </section>
  );
}
