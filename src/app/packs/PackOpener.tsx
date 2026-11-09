"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { CharacterCard } from "@/components/CharacterCard";
import { Money, RarityGem } from "@/components/icons";
import type { Rarity } from "@/generated/prisma/enums";
import type { BannerInfo, RarityCounts } from "@/lib/banners";
import { CRYSTAL_INTERVAL_MS, MAX_CRYSTALS } from "@/lib/crystal-stock";
import { CRYSTAL_BUY_SIZES } from "@/lib/economy";
import type { OpenedCard, OpenedPack, PlayerPackState } from "@/lib/packs";
import { FINISH_RATES, LOT_SIZES, RARITY_RATES, SSR_PITY, UR_PITY, type LotSize } from "@/lib/pull";
import { buyCrystalsAction, devGrantCrystalsAction, openPackAction, openWelcomeBoosterAction } from "./actions";
import { CardDetail } from "./CardDetail";
import { SummonMachine } from "./SummonMachine";
import { RarityBurst } from "./RarityBurst";
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
export function PackOpener({ initialState, banners = [], standardPool = {}, expeditionsReady = 0, achievements }: { achievements?: ReactNode; initialState: PlayerPackState; banners?: BannerInfo[]; standardPool?: RarityCounts; expeditionsReady?: number }) {
  const [state, setState] = useState(initialState);
  const [bannerId, setBannerId] = useState<string | null>(null);
  const [lot, setLot] = useState<LotSize>(5);
  const [pack, setPack] = useState<OpenedPack | null>(null);
  const [current, setCurrent] = useState(0);
  const [summary, setSummary] = useState(false);
  const [cut, setCut] = useState(0);
  const packButton = useRef<HTMLButtonElement>(null);
  const gesture = useRef<number | null>(null);
  const opening = useRef(false);
  const burstKey = useRef(0);
  const suppressClick = useRef(false);
  const [revealed, setRevealed] = useState<boolean[]>([]);
  const [burst, setBurst] = useState<{ rarity: "SSR" | "UR"; key: number } | null>(null);
  const [detail, setDetail] = useState<OpenedCard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [machine, setMachine] = useState(false);
  const [pending, startTransition] = useTransition();
  const { available, msLeft } = useLiveStock(state);

  const banner = banners.find((b) => b.id === bannerId) ?? null;
  const kind = banner?.costKind ?? "NORMAL";
  const wallet = kind === "WELCOME" ? state.welcomeDraws : available;
  const unit = kind === "WELCOME" ? "tirage de bienvenue" : "cristal";
  const unitPlural = kind === "WELCOME" ? "tirages de bienvenue" : "cristaux";
  const pool = banner?.pool ?? standardPool;
  const locked = banner?.costKind === "WELCOME" && state.welcomeBannerId !== null && state.welcomeBannerId !== banner.id;
  const waitingReveal = pack !== null && !revealed.every(Boolean);
  const canOpen = !pending && !locked && wallet >= lot && (!pack || summary);

  function open(welcomeBooster = false) {
    if (welcomeBooster ? (pending || (pack !== null && !summary)) : !canOpen) return;
    if (opening.current) return;
    opening.current = true;
    setError(null);
    startTransition(async () => {
      try {
        const r = welcomeBooster ? await openWelcomeBoosterAction() : await openPackAction(lot, bannerId);
        if (!r.ok) return setError(r.error);
        setState(r.pack.state);
        setPack(r.pack);
        setCurrent(0);
        setSummary(false);
        setCut(0);
        setRevealed(r.pack.cards.map(() => false));
        setMachine(true);
        packAudio.machine(ORDER.find((x) => r.pack.cards.some((c) => c.rarity === x)) ?? "N", r.pack.lotSize >= 10);
      } catch {
        setError("Connexion interrompue. Recharge la page pour vérifier tes cartes avant de réessayer.");
      } finally { opening.current = false; }
    });
  }

  function returnToBooster() {
    setPack(null);
    setMachine(false);
    setRevealed([]);
    setCurrent(0);
    setSummary(false);
    setBurst(null);
    setDetail(null);
    setError(null);
    setCut(0);
    suppressClick.current = false;
    requestAnimationFrame(() => packButton.current?.focus());
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
    if (rarity === "SSR" || rarity === "UR") { setBurst({ rarity, key: ++burstKey.current }); packAudio.jingle(rarity); }
    setRevealed((r) => r.map((v, j) => v || j === i));
  }
  function revealAll() {
    if (!pack) return;
    pack.cards.forEach((c, i) => {
      if (!revealed[i]) window.setTimeout(() => packAudio.flip(c.rarity), i * 90);
    });
    if (rare) { setBurst({ rarity: best as "SSR" | "UR", key: ++burstKey.current }); packAudio.jingle(best as "SSR" | "UR"); }
    setRevealed((r) => r.map(() => true));
    setSummary(true);
  }
  const best = pack ? ORDER.find((x) => pack.cards.some((c) => c.rarity === x)) : undefined;
  const rare = best === "SSR" || best === "UR";
  const rareCount = pack ? pack.cards.filter((c) => c.rarity === "SSR" || c.rarity === "UR").length : 0;

  return (
    <div className="pk">
      <header className="pk-head">
        <dl className="pk-wallet">
          <div><dt>Cristaux</dt><dd>{available}<span> / {MAX_CRYSTALS}</span></dd><small>{msLeft === null ? "Stock plein" : `Prochain dans ${formatDuration(msLeft)}`}</small></div>
          {state.welcomeDraws > 0 && <div><dt>Bienvenue</dt><dd>{state.welcomeDraws}</dd></div>}
          <div><dt>Ryō</dt><dd><Money n={state.balance} /></dd></div>
        </dl>
        <aside className="pk-shop" aria-label="Boutique">
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
      </header>

      {state.welcomeBoosterAvailable && !pack && (
        <section className="pk-welcome" aria-label="Booster de bienvenue">
          <span className="pk-welcome-art" aria-hidden="true">A</span>
          <div>
            <h2>Booster de bienvenue ×10</h2>
            <p>Gratuit, une fois par compte. Une SSR ou une UR garantie, tous animes confondus.</p>
            <button type="button" className="ui-button" data-active="true" disabled={pending} onClick={() => open(true)}>{pending ? "Ouverture…" : "Ouvrir mon booster"}</button>
          </div>
        </section>
      )}

      <div className="pk-main">
        {achievements}
        <section className="pk-panel pk-banner-panel" aria-label="Bannières">
          <h2>Bannière</h2>
          <div className="pk-banners" role="radiogroup" aria-label="Choisir une bannière">
            <button disabled={pending || waitingReveal} type="button" role="radio" aria-checked={bannerId === null} className="pk-banner" data-active={bannerId === null} onClick={() => setBannerId(null)}>
              <small>Permanent</small>
              <b>Paquet standard</b>
              <span>Tout le catalogue, au prix de 1 cristal par carte.</span>
            </button>
            {banners.map((b) => (
              <button disabled={pending || waitingReveal} type="button" role="radio" aria-checked={bannerId === b.id} key={b.id} className="pk-banner" title={b.description} data-active={bannerId === b.id} data-kind={b.costKind} onClick={() => setBannerId(b.id)}>
                {b.featured && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="pk-banner-face" src={b.featured.imageUrl} alt="" referrerPolicy="no-referrer" />
                )}
                <small>{b.category === "event" ? "Événement" : b.costKind === "WELCOME" ? "Bienvenue" : b.categoryLabel}</small>
                <b>{b.name}</b>
                <span>{b.description}</span>
                <em>{b.weightPercent > 0 ? `${b.weightPercent} % de cartes de la bannière` : "Catalogue complet"}</em>
              </button>
            ))}
          </div>

          <details className="pk-rates">
            <summary>Taux et garanties</summary>
            <table>
              <thead><tr><th>Rareté</th><th>Carte</th><th>Personnages</th></tr></thead>
              <tbody>
                {ORDER.map((r) => (
                  <tr key={r}>
                    <th scope="row"><RarityGem rarity={r} /> {r}</th>
                    <td>{pct(RARITY_RATES.find(([x]) => x === r)?.[1] ?? 0)}</td>
                    <td>{pool[r] ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p>Finitions : {FINISH_RATES.map(([f, p]) => `${f === "NORMAL" ? "Normale" : f === "HOLO" ? "Holo" : "Gold"} ${pct(p)}`).join(" · ")}.</p>
            <p>Garantie : SSR ou mieux à la {SSR_PITY}ᵉ carte, UR à la {UR_PITY}ᵉ.</p>
          </details>
        </section>

        <section className="pk-stage" data-summary={summary} data-revealing={waitingReveal || undefined} aria-label="Ouverture">
          {!pack && (
            <button ref={packButton} type="button" className="pk-pack" disabled={!canOpen} aria-label={`Ouvrir le booster de ${lot} cartes`}
              onClick={() => { if (suppressClick.current) { suppressClick.current = false; return; } open(); }}
              data-art="" data-standard={!banner?.featured} data-category={banner?.category}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="pk-pack-art" src={banner?.featured?.imageUrl ?? "/images/boosters/standard.png"} alt="" referrerPolicy="no-referrer" />
              <span className="pk-cut" style={{ "--cut": cut } as React.CSSProperties}
                onPointerDown={(e) => { if (!canOpen) return; gesture.current = e.clientX; e.currentTarget.setPointerCapture(e.pointerId); }}
                onPointerMove={(e) => { if (gesture.current === null) return; setCut(Math.min(1, Math.abs(e.clientX - gesture.current) / (e.currentTarget.clientWidth * 0.7))); }}
                onPointerUp={(e) => {
                  if (gesture.current === null) return;
                  const distance = Math.abs(e.clientX - gesture.current);
                  gesture.current = null; setCut(0);
                  if (distance > 12) { suppressClick.current = true; }
                  if (distance >= e.currentTarget.clientWidth * 0.7) open();
                }}
                onPointerCancel={() => { gesture.current = null; setCut(0); }}
              ><span>Glisser pour découper</span><i className="pk-cut-start" aria-hidden="true" /><i className="pk-cut-end" aria-hidden="true" /></span>
              <span className="pk-pack-foil" aria-hidden="true" />
              <span className="pk-pack-seal pk-pack-seal-top" aria-hidden="true" />
              <span className="pk-pack-seal pk-pack-seal-bottom" aria-hidden="true" />
              <span className="pk-pack-shine" aria-hidden="true" />
              <span className="pk-pack-logo">A</span>
              <small>{banner ? banner.name.toUpperCase() : "ANIME MASTERS"}</small>
              <strong>{lot} CARTES</strong>
            </button>
          )}
          {!pack && <p className="pk-note">Découpe le haut du booster ou clique dessus.</p>}

          {burst && createPortal(<RarityBurst key={burst.key} rarity={burst.rarity} onEnd={() => setBurst(null)} />, document.body)}

          {pack && machine && best && <SummonMachine rarity={best} fast={pack.lotSize >= 10} onDone={() => { setMachine(false); packAudio.deal(0.1); }} />}

          {pack && !machine && (
            <div className="pk-cards" data-best={best}>
              {!waitingReveal && <button type="button" className="pk-return ui-button" onClick={returnToBooster}>Revenir au booster</button>}
              {rare && waitingReveal && (
                <p className="pk-hint" data-rarity={best} role="status">
                  <RarityGem rarity={best!} /> {rareCount > 1 ? `${rareCount} cartes SSR ou mieux` : `Une carte ${best === "UR" ? "UR" : "SSR ou mieux"}`} dans ce paquet
                </p>
              )}
              {pack.pity !== "NONE" && <p className="pk-pity">Garantie {pack.pity} déclenchée !</p>}
              <div className={summary ? undefined : "pk-table"}>
              {!summary && (
                <div className="pk-pile" data-count={current} aria-label={`${current} carte${current > 1 ? "s" : ""} révélée${current > 1 ? "s" : ""}`}>
                  {pack.cards.slice(Math.max(0, current - 4), current).map((card, k, shown) => (
                    <div key={card.cardId} className="pk-pile-card" data-rarity={card.rarity} style={{ "--k": shown.length - 1 - k, "--rot": [-3, 2, -1, 4, -4, 1][(current - shown.length + k) % 6] } as React.CSSProperties} aria-hidden="true">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={card.imageUrl} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" />
                    </div>
                  ))}
                </div>
              )}
              <div className={summary ? "pk-grid" : "pk-stack"} data-lot={pack.lotSize}>
                {pack.cards.map((card, i) => (summary || i === current) && (
                  <div key={card.cardId} className="flip" data-revealed={revealed[i]} data-rarity={card.rarity} data-hint={!revealed[i] && (card.rarity === "SSR" || card.rarity === "UR") ? card.rarity : undefined} style={{ "--i": i } as React.CSSProperties} onClick={() => { if (summary) setDetail(card); else if (!revealed[i]) reveal(i); else if (current + 1 < pack.cards.length) setCurrent(current + 1); else setSummary(true); }} role="button" tabIndex={0} aria-label={revealed[i] ? (summary ? `${card.name} : voir les stats et les sorts` : "Carte suivante") : `Retourner la carte ${i + 1}`} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }}>
                    <div className="flip-inner">
                      <div className="flip-face card-back" aria-hidden="true" />
                      <div className="flip-face flip-front" aria-hidden={!revealed[i]}><CharacterCard {...card} characterId={card.characterId} /></div>
                    </div>
                  </div>
                ))}
              </div>
              </div>
              {!summary && <p className="pk-note" role="status">Carte {current + 1} / {pack.cards.length} · {current} révélée{current > 1 ? "s" : ""} · {revealed[current] ? "Clique pour continuer" : "Clique pour retourner"}</p>}
              {waitingReveal ? (
                <button type="button" className="pk-ghost" onClick={revealAll}>Tout révéler</button>
              ) : (
                <Link href="/album" className="pk-ghost">Voir l&apos;album</Link>
              )}
              {summary && <p className="pk-note">Clique sur une carte pour voir ses stats et ses sorts.</p>}
            </div>
          )}

          <div className="pk-controls">
            <div className="pk-lots" role="radiogroup" aria-label="Taille du lot">
              {LOT_SIZES.map((n) => (
                <button key={n} type="button" role="radio" aria-checked={lot === n} data-active={lot === n} disabled={pending || waitingReveal} aria-label={`Lot de ${n} cartes, ${n} ${n > 1 ? unitPlural : unit}`} onClick={() => setLot(n)}><span>×{n}</span></button>
              ))}
            </div>
            <button type="button" className="pk-open ui-button" onClick={() => open()} disabled={!canOpen} data-lot={lot}>
              <span className="pk-open-main">{pending ? "Ouverture…" : `Ouvrir ${lot} cartes`}</span>
              {!pending && <small className="pk-open-cost">{lot} {lot > 1 ? unitPlural : unit}</small>}
            </button>
            {locked && <p className="pk-note">Tu as déjà choisi une autre bannière de bienvenue.</p>}
            {!locked && wallet < lot && <p className="pk-note">Il te manque {lot - wallet} {lot - wallet > 1 ? unitPlural : unit}.</p>}
            {kind === "NORMAL" && <p className="pk-note">Garantie : SSR dans {SSR_PITY - state.cardsSinceSSR} cartes · UR dans {UR_PITY - state.cardsSinceUR}</p>}
            {error && <p role="alert" className="pk-error">{error}</p>}
          </div>
        </section>


      </div>

      {detail && <CardDetail card={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}
