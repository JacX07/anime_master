"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { CharacterCard } from "@/components/CharacterCard";
import { Money, RarityGem } from "@/components/icons";
import type { Rarity } from "@/generated/prisma/enums";
import type { BannerInfo, RarityCounts } from "@/lib/banners";
import { CRYSTAL_INTERVAL_MS, MAX_CRYSTALS } from "@/lib/crystal-stock";
import { CRYSTAL_BUY_SIZES } from "@/lib/economy";
import type { OpenedCard, OpenedPack, PlayerPackState } from "@/lib/packs";
import { FINISH_RATES, LOT_SIZES, RARITY_RATES, SSR_PITY, TENTH_CARD_RATES, UR_PITY, type LotSize } from "@/lib/pull";
import { buyCrystalsAction, devGrantCrystalsAction, openPackAction } from "./actions";
import { CardDetail } from "./CardDetail";
import { packAudio } from "@/lib/pack-audio";
import "./packs.css";

const ORDER: Rarity[] = ["UR", "SSR", "SR", "R", "N"];
const pct = (n: number) => `${+(n * 100).toFixed(2)} %`;

/** Stock affiché, recalculé localement à chaque seconde à partir de l'état serveur. */
function useLiveStock(state: PlayerPackState) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);

  if (now === null || !state.nextCrystalAt) return { available: state.available, msLeft: null };
  const next = new Date(state.nextCrystalAt).getTime();
  if (now < next) return { available: state.available, msLeft: next - now };
  const gained = 1 + Math.floor((now - next) / CRYSTAL_INTERVAL_MS);
  const available = Math.min(MAX_CRYSTALS, state.available + gained);
  return { available, msLeft: available >= MAX_CRYSTALS ? null : next + gained * CRYSTAL_INTERVAL_MS - now };
}

function formatDuration(ms: number) {
  const total = Math.ceil(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

/** Ouverture de paquets en 2D (direction « Citadelle sombre ») : choix de la bannière et du lot, tirage côté serveur, cartes retournées une à une. */
export function PackOpener({ initialState, banners = [], standardPool = {}, expeditionsReady = 0 }: { initialState: PlayerPackState; banners?: BannerInfo[]; standardPool?: RarityCounts; expeditionsReady?: number }) {
  const [state, setState] = useState(initialState);
  const [bannerId, setBannerId] = useState<string | null>(null);
  const [lot, setLot] = useState<LotSize>(5);
  const [pack, setPack] = useState<OpenedPack | null>(null);
  const [revealed, setRevealed] = useState<boolean[]>([]);
  const [burst, setBurst] = useState<{ rarity: "SSR" | "UR"; key: number } | null>(null);
  const [detail, setDetail] = useState<OpenedCard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { available, msLeft } = useLiveStock(state);

  const banner = banners.find((b) => b.id === bannerId) ?? null;
  const kind = banner?.costKind ?? "NORMAL";
  const wallet = kind === "SPECIAL" ? state.specialCrystals : kind === "WELCOME" ? state.welcomeDraws : available;
  const unit = kind === "SPECIAL" ? "cristal spécial" : kind === "WELCOME" ? "tirage de bienvenue" : "cristal";
  const unitPlural = kind === "SPECIAL" ? "cristaux spéciaux" : kind === "WELCOME" ? "tirages de bienvenue" : "cristaux";
  const pool = banner?.pool ?? standardPool;
  const locked = banner?.costKind === "WELCOME" && state.welcomeBannerId !== null && state.welcomeBannerId !== banner.id;
  const waitingReveal = pack !== null && !revealed.every(Boolean);
  const canOpen = !pending && !locked && wallet >= lot && !waitingReveal;

  function open() {
    setError(null);
    startTransition(async () => {
      const r = await openPackAction(lot, bannerId);
      if (!r.ok) return setError(r.error);
      setState(r.pack.state);
      setPack(r.pack);
      setRevealed(r.pack.cards.map(() => false));
      packAudio.open();
      r.pack.cards.forEach((_, i) => packAudio.deal(0.25 + i * 0.09));
    });
  }

  function buy(count: number) {
    setError(null);
    startTransition(async () => {
      const r = await buyCrystalsAction(count);
      if (!r.ok) return setError(r.error);
      setState(r.state);
    });
  }

  function devGrant() {
    startTransition(async () => {
      const r = await devGrantCrystalsAction();
      if (r.ok) setState(r.state);
    });
  }

  function reveal(i: number) {
    if (!pack || revealed[i]) return;
    const rarity = pack.cards[i].rarity;
    packAudio.flip(rarity);
    if (rarity === "SSR" || rarity === "UR") setBurst({ rarity, key: Date.now() });
    setRevealed((r) => r.map((v, j) => v || j === i));
  }
  function revealAll() {
    if (!pack) return;
    pack.cards.forEach((c, i) => {
      if (!revealed[i]) window.setTimeout(() => packAudio.flip(c.rarity), i * 90);
    });
    if (rare) setBurst({ rarity: best as "SSR" | "UR", key: Date.now() });
    setRevealed((r) => r.map(() => true));
  }
  const best = pack ? ORDER.find((x) => pack.cards.some((c) => c.rarity === x)) : undefined;
  const rare = best === "SSR" || best === "UR";
  const rareCount = pack ? pack.cards.filter((c) => c.rarity === "SSR" || c.rarity === "UR").length : 0;

  return (
    <div className="pk">
      <header className="pk-head">
        <div>
          <p className="eyebrow">Salle des invocations</p>
          <h1 className="vt-title">Paquets</h1>
        </div>
        <dl className="pk-wallet">
          <div><dt>Cristaux</dt><dd>{available}<span> / {MAX_CRYSTALS}</span></dd><small>{msLeft === null ? "Stock plein" : `Prochain dans ${formatDuration(msLeft)}`}</small></div>
          {state.specialCrystals > 0 && <div><dt>Spéciaux</dt><dd>{state.specialCrystals}</dd></div>}
          {state.welcomeDraws > 0 && <div><dt>Bienvenue</dt><dd>{state.welcomeDraws}</dd></div>}
          <div><dt>Ryō</dt><dd><Money n={state.balance} /></dd></div>
        </dl>
      </header>

      <div className="pk-main">
        <section className="pk-panel" aria-label="Bannières">
          <h2>Bannière</h2>
          <div className="pk-banners" role="radiogroup" aria-label="Choisir une bannière">
            <button type="button" role="radio" aria-checked={bannerId === null} className="pk-banner" data-active={bannerId === null} onClick={() => setBannerId(null)}>
              <small>Permanent</small>
              <b>Paquet standard</b>
              <span>Tout le catalogue, au prix de 1 cristal par carte.</span>
            </button>
            {banners.map((b) => (
              <button type="button" role="radio" aria-checked={bannerId === b.id} key={b.id} className="pk-banner" data-active={bannerId === b.id} data-kind={b.costKind} onClick={() => setBannerId(b.id)}>
                {b.featured && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="pk-banner-face" src={b.featured.imageUrl} alt="" referrerPolicy="no-referrer" />
                )}
                <small>{b.costKind === "SPECIAL" ? "Événement" : b.costKind === "WELCOME" ? "Bienvenue" : b.categoryLabel}</small>
                <b>{b.name}</b>
                <span>{b.description}</span>
                <em>{b.weightPercent > 0 ? `${b.weightPercent} % de cartes de la bannière` : "Catalogue complet"}</em>
              </button>
            ))}
          </div>

          <details className="pk-rates">
            <summary>Taux et garanties</summary>
            <table>
              <thead><tr><th>Rareté</th><th>Carte</th><th>10ᵉ du ×10</th><th>Personnages</th></tr></thead>
              <tbody>
                {ORDER.map((r) => (
                  <tr key={r}>
                    <th scope="row"><RarityGem rarity={r} /> {r}</th>
                    <td>{pct(RARITY_RATES.find(([x]) => x === r)?.[1] ?? 0)}</td>
                    <td>{TENTH_CARD_RATES.find(([x]) => x === r) ? pct(TENTH_CARD_RATES.find(([x]) => x === r)![1]) : "—"}</td>
                    <td>{pool[r] ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p>Finitions : {FINISH_RATES.map(([f, p]) => `${f === "NORMAL" ? "Normale" : f === "HOLO" ? "Holo" : "Gold"} ${pct(p)}`).join(" · ")}.</p>
            <p>Garantie : SSR ou mieux à la {SSR_PITY}ᵉ carte, UR à la {UR_PITY}ᵉ.</p>
          </details>
        </section>

        <section className="pk-stage" aria-label="Ouverture">
          {!pack && (
            <div className="pk-pack" aria-hidden="true" data-art={banner?.featured ? "" : undefined}>
              {banner?.featured && (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="pk-pack-art" src={banner.featured.imageUrl} alt="" referrerPolicy="no-referrer" />
              )}
              <span className="pk-pack-shine" />
              <span className="pk-pack-logo">A</span>
              <small>{banner ? banner.name.toUpperCase() : "ANIME MASTERS"}</small>
              <strong>{lot} CARTES</strong>
            </div>
          )}

          {burst && <div key={burst.key} className="pk-burst" data-rarity={burst.rarity} aria-hidden="true" onAnimationEnd={(e) => e.target === e.currentTarget && setBurst(null)}><b>{burst.rarity}</b></div>}

          {pack && (
            <div className="pk-cards" data-best={best}>
              {rare && waitingReveal && (
                <p className="pk-hint" data-rarity={best} role="status">
                  <RarityGem rarity={best!} /> {rareCount > 1 ? `${rareCount} cartes SSR ou mieux` : `Une carte ${best === "UR" ? "UR" : "SSR ou mieux"}`} dans ce paquet
                </p>
              )}
              {pack.pity !== "NONE" && <p className="pk-pity">Garantie {pack.pity} déclenchée !</p>}
              <div className="pk-grid" data-lot={pack.lotSize}>
                {pack.cards.map((card, i) => (
                  <div key={card.cardId} className="flip" data-revealed={revealed[i]} data-rarity={card.rarity} data-hint={!revealed[i] && (card.rarity === "SSR" || card.rarity === "UR") ? card.rarity : undefined} style={{ "--i": i } as React.CSSProperties} onClick={() => (revealed[i] ? setDetail(card) : reveal(i))} role="button" tabIndex={0} aria-label={revealed[i] ? `${card.name} : voir les stats et les sorts` : `Retourner la carte ${i + 1}`} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (revealed[i]) setDetail(card); else reveal(i); } }}>
                    <div className="flip-inner">
                      <div className="flip-face card-back"><span>AM</span></div>
                      <div className="flip-face flip-front" aria-hidden={!revealed[i]}><CharacterCard {...card} characterId={card.characterId} /></div>
                    </div>
                  </div>
                ))}
              </div>
              {waitingReveal ? (
                <button type="button" className="pk-ghost" onClick={revealAll}>Tout révéler</button>
              ) : (
                <Link href="/album" className="pk-ghost">Voir l&apos;album</Link>
              )}
              {!waitingReveal && <p className="pk-note">Clique sur une carte pour voir ses stats et ses sorts.</p>}
            </div>
          )}

          <div className="pk-controls">
            <div className="pk-lots" role="radiogroup" aria-label="Taille du lot">
              {LOT_SIZES.map((n) => (
                <button key={n} type="button" role="radio" aria-checked={lot === n} data-active={lot === n} onClick={() => setLot(n)}>×{n}</button>
              ))}
            </div>
            <button type="button" className="pk-open" onClick={open} disabled={!canOpen} data-lot={lot}>
              <span className="pk-open-main">{pending ? "Ouverture…" : `Ouvrir ${lot} cartes`}</span>
              {!pending && <span className="pk-open-cost">{lot} {lot > 1 ? unitPlural : unit}</span>}
            </button>
            {locked && <p className="pk-note">Tu as déjà choisi une autre bannière de bienvenue.</p>}
            {!locked && wallet < lot && <p className="pk-note">Il te manque {lot - wallet} {lot - wallet > 1 ? unitPlural : unit}.</p>}
            {kind === "NORMAL" && <p className="pk-note">Garantie : SSR dans {SSR_PITY - state.cardsSinceSSR} cartes · UR dans {UR_PITY - state.cardsSinceUR}</p>}
            {error && <p role="alert" className="pk-error">{error}</p>}
          </div>
        </section>

        <aside className="pk-panel" aria-label="Boutique">
          <h2>Cristaux</h2>
          <p className="pk-note">{state.crystalPrice} Ryō le cristal · {state.crystalsLeft} encore achetables aujourd&apos;hui.</p>
          <div className="pk-buy">
            {CRYSTAL_BUY_SIZES.map((n) => (
              <button key={n} type="button" disabled={pending || state.crystalsLeft < n || state.balance < n * state.crystalPrice} onClick={() => buy(n)}>
                <b>+{n}</b>
                <Money n={n * state.crystalPrice} />
              </button>
            ))}
          </div>
          {expeditionsReady > 0 && (
            <Link href="/expeditions" className="pk-expe">
              <b>{expeditionsReady} expédition{expeditionsReady > 1 ? "s" : ""} terminée{expeditionsReady > 1 ? "s" : ""}</b>
              <small>Récupérer les butins →</small>
            </Link>
          )}
          {process.env.NODE_ENV !== "production" && (
            <button type="button" className="pk-ghost" onClick={devGrant} disabled={pending}>Test : +50 cristaux</button>
          )}
        </aside>
      </div>

      {detail && <CardDetail card={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}
