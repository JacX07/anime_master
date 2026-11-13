import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { BuyCrystalsButton } from "@/components/BuyCrystalsButton";
import { Stat } from "@/components/icons";
import { SceneBody } from "@/components/SceneBody";
import { getAlbum, parseAlbumFilters, RARITY_ORDER } from "@/lib/album";
import { getPackState } from "@/lib/packs";
import { requireUser } from "@/lib/session";
import { previewDuplicateSale } from "@/lib/wallet";
import { AlbumFilters, albumHref } from "./AlbumFilters";
import { InfiniteList } from "./InfiniteList";
import { CardItem } from "./items";
import { DuplicateSale } from "./DuplicateSale";
import { CollectionsSidebar } from "./CollectionsSidebar";
import "./album.css";

export const metadata: Metadata = { title: "Album — Anime Masters" };

const num = new Intl.NumberFormat("fr-FR");
const pct = (a: number, b: number) => (b ? Math.floor((a / b) * 1000) / 10 : 0);

// Album « vitrine » : même nuit que l'accueil, cartes qui se soulèvent au survol, résumé dans une barre d'état en bas.
export default function AlbumPage({ searchParams }: PageProps<"/album">) {
  return (
    <main className="vt album-page">
      <SceneBody night scroll />
      <Suspense fallback={<p className="vt-inner text-muted">Chargement…</p>}>
        <Album searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Album({ searchParams }: { searchParams: PageProps<"/album">["searchParams"] }) {
  const user = await requireUser();
  const parsed = parseAlbumFilters(await searchParams);
  // Plus de vue « mondes » : la grille montre toujours des cartes, les animes sont dans la colonne de gauche
  const filters = { ...parsed, owned: parsed.owned ?? "all" as const };
  // Le défilement continu remplace les pages : on charge toujours la première, la suite arrive au fil du scroll
  const album = await getAlbum(user.id, { ...filters, page: 1 }, { covers: true });
  const listKey = albumHref(filters);
  const packs = await getPackState(user.id);
  const saleRarities = ["N", "R"] as const;
  const salePreview = await previewDuplicateSale(user.id, [...saleRarities]);
  const { progress } = album;
  const status = <>

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

  </>;

  return (
    <>
      <div className="vt-inner album-inner">
        <header className="mq-page-heading mq-standard-heading album-heading">
          <div>
            <h1 className="mq-collection-title">Ma collection</h1>
            <p>{album.anime.selected ? "Filtré sur cet anime. « Tous les animes » pour revenir." : "Toutes tes cartes et ta progression par anime."}</p>
          </div>
          <div className="mq-collection-count">
            <b>{num.format(progress.owned)}</b>
            <span>cartes possédées<br />sur {num.format(progress.total)}</span>
          </div>
        </header>
        <details className="mobile-album-progress">
          <summary>{num.format(progress.owned)} / {num.format(progress.total)} découvertes · {pct(progress.owned, progress.total)} %</summary>
          <div className="mobile-album-status">{status}</div>
        </details>

        <div className="album-layout">
          <CollectionsSidebar
            items={[...album.anime.listed, ...album.anime.blocks].map((a) => ({ key: a.key, title: a.title, owned: a.owned, total: a.total, cover: a.cover, href: albumHref(filters, { anime: a.key }) }))}
            current={filters.anime}
            allHref={albumHref(filters, { anime: "" })}
            owned={progress.owned}
            total={progress.total}
          />
          <div className="album-main">
            {album.anime.selected && <AnimeHeader anime={album.anime.selected} />}
            <div className="album-toolbar">
              <AlbumFilters filters={filters} anime={null} />
              <Link href="/album/ur" className="fx-btn" data-tone="violet">Galerie UR</Link>
              <DuplicateSale initialRarities={[...saleRarities]} initialPreview={salePreview} />
            </div>
            <p className="vt-count">
              {num.format(album.matching)} personnage{album.matching > 1 ? "s" : ""}
            </p>
            {album.entries.length === 0 ? (
              <p className="vt-empty">Aucun personnage ne correspond à ces filtres.</p>
            ) : (
              <InfiniteList key={listKey} as="ul" className="vt-grid" pages={album.pages} filters={filters}>
                {album.entries.map((e) => (
                  <CardItem key={e.id} entry={e} />
                ))}
              </InfiniteList>
            )}
          </div>
        </div>
      </div>

      <footer className="vt-status desktop-album-status" aria-label="Ta collection">{status}</footer>
    </>
  );
}

/** Progression de l'anime choisi : on repère d'un coup d'œil s'il est complet. */
function AnimeHeader({ anime }: { anime: NonNullable<Awaited<ReturnType<typeof getAlbum>>["anime"]["selected"]> }) {
  const done = anime.total > 0 && anime.owned === anime.total;
  return (
    <section className="vt-anime" aria-label={`Progression : ${anime.title}`}>
      {anime.cover && <span className="vt-anime-bg" style={{ backgroundImage: `url("${anime.cover}")` }} aria-hidden="true" />}
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
