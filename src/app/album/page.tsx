import type { Metadata } from "next";
import { Suspense } from "react";
import { BuyCrystalsButton } from "@/components/BuyCrystalsButton";
import { Stat, TypeIcon } from "@/components/icons";
import { SceneBody } from "@/components/SceneBody";
import { TYPE_LABELS } from "@/lib/labels";
import { getAlbum, parseAlbumFilters, RARITY_ORDER, TYPE_ORDER } from "@/lib/album";
import { getPackState } from "@/lib/packs";
import { requireUser } from "@/lib/session";
import { previewDuplicateSale } from "@/lib/wallet";
import { AlbumFilters, albumHref } from "./AlbumFilters";
import { InfiniteList } from "./InfiniteList";
import { CardItem, World } from "./items";
import { DuplicateSale } from "./DuplicateSale";

export const metadata: Metadata = { title: "Album — Anime Masters" };

const num = new Intl.NumberFormat("fr-FR");
const pct = (a: number, b: number) => (b ? Math.floor((a / b) * 1000) / 10 : 0);

// Album « vitrine » : même nuit que l'accueil, cartes qui se soulèvent au survol, résumé dans une barre d'état en bas.
export default function AlbumPage({ searchParams }: PageProps<"/album">) {
  return (
    <main className="vt">
      <SceneBody night scroll />
      <Suspense fallback={<p className="vt-inner text-muted">Chargement…</p>}>
        <Album searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Album({ searchParams }: { searchParams: PageProps<"/album">["searchParams"] }) {
  const user = await requireUser();
  const filters = parseAlbumFilters(await searchParams);
  // Le défilement continu remplace les pages : on charge toujours la première, la suite arrive au fil du scroll
  const album = await getAlbum(user.id, { ...filters, page: 1 });
  const listKey = albumHref(filters);
  const packs = await getPackState(user.id);
  const saleRarities = ["N", "R"] as const;
  const salePreview = await previewDuplicateSale(user.id, [...saleRarities]);
  const { progress } = album;

  return (
    <>
      <div className="vt-inner">
        <header>
          <h1 className="vt-title">Album</h1>
          <p className="vt-sub">
            {num.format(progress.owned)} personnages sur {num.format(progress.total)}
          </p>
        </header>

        <AlbumFilters filters={filters} sortable={album.worlds !== null} anime={{ listed: album.anime.listed, blocks: album.anime.blocks, value: filters.anime }} />

        {album.anime.selected && <AnimeHeader anime={album.anime.selected} />}
        <DuplicateSale initialRarities={[...saleRarities]} initialPreview={salePreview} />

        <ul className="vt-legend" aria-label="Légende des types">
          {TYPE_ORDER.map((t) => (
            <li key={t}>
              <TypeIcon type={t} /> {TYPE_LABELS[t].name}
            </li>
          ))}
        </ul>

        {album.worlds ? (
          <>
            <p className="vt-count">
              {album.matching} monde{album.matching > 1 ? "s" : ""} relevé{album.matching > 1 ? "s" : ""}
              {album.worlds.unknown > 0 && ` · ${album.worlds.unknown} encore inconnus`}
            </p>
            <InfiniteList key={listKey} as="div" className="wd-list" pages={album.pages} filters={filters}>
              {album.worlds.bands.map((w) => (
                <World key={w.key} world={w} filters={filters} />
              ))}
            </InfiniteList>
          </>
        ) : (
          <p className="vt-count">
            {album.matching} personnage{album.matching > 1 ? "s" : ""}
          </p>
        )}

        {album.worlds ? null : album.entries.length === 0 ? (
          <p className="vt-empty">Aucun personnage ne correspond à ces filtres.</p>
        ) : (
          <InfiniteList key={listKey} as="ul" className="vt-grid" pages={album.pages} filters={filters}>
            {album.entries.map((e) => (
              <CardItem key={e.id} entry={e} />
            ))}
          </InfiniteList>
        )}

      </div>

      <footer className="vt-status" aria-label="Ta collection">
        <div className="vt-progress">
          <span>
            {num.format(progress.owned)} / {num.format(progress.total)}
          </span>
          <span className="vt-bar" role="img" aria-label={`${pct(progress.owned, progress.total)} % de complétion`}>
            <i style={{ width: `${pct(progress.owned, progress.total)}%` }} />
          </span>
          <span className="vt-muted">{pct(progress.owned, progress.total)} %</span>
        </div>
        <ul className="vt-rarities">
          {RARITY_ORDER.map((r) => (
            <li key={r}>
              <b style={{ color: `var(--rarity-${r})` }}>{r}</b> {progress.byRarity[r].owned}/{progress.byRarity[r].total}
            </li>
          ))}
        </ul>
        <span className="vt-power" title="Puissance totale de la collection">
          <Stat icon="puissance" accent="currentColor">
            {num.format(packs.collectionPower)}
          </Stat>
        </span>
        <BuyCrystalsButton price={packs.crystalPrice} left={packs.crystalsLeft} balance={packs.balance} available={packs.available} />
      </footer>
    </>
  );
}

/** Progression de l'anime choisi : on repère d'un coup d'œil s'il est complet. */
function AnimeHeader({ anime }: { anime: NonNullable<Awaited<ReturnType<typeof getAlbum>>["anime"]["selected"]> }) {
  const done = anime.total > 0 && anime.owned === anime.total;
  return (
    <section className="vt-anime" aria-label={`Progression : ${anime.title}`}>
      <h2>{anime.title}</h2>
      <div className="vt-progress">
        <span>
          {num.format(anime.owned)} / {num.format(anime.total)}
        </span>
        <span className="vt-bar" role="img" aria-label={`${pct(anime.owned, anime.total)} % de complétion`}>
          <i style={{ width: `${pct(anime.owned, anime.total)}%` }} />
        </span>
        <span className="vt-muted">{pct(anime.owned, anime.total)} %</span>
        {done && <b className="vt-done">Collection complète</b>}
      </div>
      {anime.members && (
        <ul className="vt-members">
          {anime.members.map((m) => (
            <li key={m.title} data-done={m.owned === m.total}>
              {m.owned === m.total ? "✓ " : ""}
              {m.title} <span className="vt-muted">{m.owned}/{m.total}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
