import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Money, RarityGem } from "@/components/icons";
import { SceneBody } from "@/components/SceneBody";
import { listAuctions, type MarketFilters } from "@/lib/auctions";
import { FINISH_NAMES, RARITY_NAMES, TYPE_LABELS } from "@/lib/labels";
import { Countdown } from "./Countdown";

export const metadata: Metadata = { title: "Marché — Anime Masters" };

const RARITIES = ["UR", "SSR", "SR", "R", "N"] as const;
const TYPES = ["COMBAT", "MYSTERE", "MAGIE", "COEUR", "AVENTURE"] as const;
const FINISHES = ["NORMAL", "HOLO", "GOLD"] as const;
const SORTS = [
  ["ending", "Fin la plus proche"],
  ["priceAsc", "Prix croissant"],
  ["priceDesc", "Prix décroissant"],
  ["recent", "Plus récentes"],
] as const;

type Raw = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => ((Array.isArray(v) ? v[0] : v) ?? "").trim();
const pick = <T extends string>(list: readonly T[], v: string): T | undefined => (list.includes(v as T) ? (v as T) : undefined);
const int = (v: string) => (/^\d{1,9}$/.test(v) ? Number(v) : undefined);

function parse(p: Raw): MarketFilters {
  return {
    q: one(p.q).slice(0, 80) || undefined,
    series: one(p.series).slice(0, 80) || undefined,
    rarity: pick(RARITIES, one(p.rarity)),
    type: pick(TYPES, one(p.type)),
    finish: pick(FINISHES, one(p.finish)),
    minPrice: int(one(p.min)),
    maxPrice: int(one(p.max)),
    sort: pick(SORTS.map((s) => s[0]), one(p.sort)) ?? "ending",
  };
}

export default function MarketPage({ searchParams }: PageProps<"/market">) {
  return (
    <main className="vt">
      <SceneBody night scroll />
      <Suspense fallback={<p className="vt-inner vt-muted">Chargement…</p>}>
        <Market searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Market({ searchParams }: { searchParams: PageProps<"/market">["searchParams"] }) {
  const sp = await searchParams;
  const f = parse(sp);
  const list = await listAuctions(f);
  const v = (k: string) => one(sp[k]);
  return (
    <div className="vt-inner">
      <header>
        <h1 className="vt-title">Marché</h1>
        <p className="vt-sub">Les enchères en cours. Pour vendre une carte, ouvre sa fiche depuis l&apos;album.</p>
      </header>
      <form action="/market" className="market-filters">
        <input type="search" name="q" defaultValue={v("q")} placeholder="Personnage" aria-label="Personnage" />
        <input type="search" name="series" defaultValue={v("series")} placeholder="Série" aria-label="Série" />
        <select name="rarity" defaultValue={f.rarity ?? ""} aria-label="Rareté">
          <option value="">Toutes raretés</option>
          {RARITIES.map((r) => <option key={r} value={r}>{RARITY_NAMES[r]}</option>)}
        </select>
        <select name="type" defaultValue={f.type ?? ""} aria-label="Type">
          <option value="">Tous types</option>
          {TYPES.map((t) => <option key={t} value={t}>{TYPE_LABELS[t].name}</option>)}
        </select>
        <select name="finish" defaultValue={f.finish ?? ""} aria-label="Finition">
          <option value="">Toutes finitions</option>
          {FINISHES.map((x) => <option key={x} value={x}>{FINISH_NAMES[x]}</option>)}
        </select>
        <input type="number" name="min" min={0} defaultValue={v("min")} placeholder="Prix min" aria-label="Prix minimum" />
        <input type="number" name="max" min={0} defaultValue={v("max")} placeholder="Prix max" aria-label="Prix maximum" />
        <select name="sort" defaultValue={f.sort} aria-label="Tri">
          {SORTS.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
        </select>
        <button type="submit" className="vt-btn">Filtrer</button>
      </form>
      <p className="vt-count">{list.length} enchère{list.length > 1 ? "s" : ""}</p>
      {list.length === 0 ? (
        <p className="vt-empty">Aucune enchère ne correspond.</p>
      ) : (
        <ul className="auction-grid">
          {list.map((a) => (
            <li key={a.id}>
              <Link href={`/market/${a.id}`} className="auction-card">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={a.card.character.imageUrl} alt="" loading="lazy" referrerPolicy="no-referrer" />
                <div>
                  <b className="auction-name">
                    <RarityGem rarity={a.card.character.rarity} /> {a.card.character.name}
                  </b>
                  <span className="vt-muted">
                    #{a.card.serial} · {FINISH_NAMES[a.card.finish]} · {a.seller.username}
                  </span>
                  <span className="auction-price">
                    <Money n={a.price} /> <small className="vt-muted">{a.currentBid === null ? "départ" : "offre actuelle"}</small>
                  </span>
                  <Countdown endsAt={a.endsAt.toISOString()} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
