import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CharacterCard } from "@/components/CharacterCard";
import { getAlbum, parseAlbumFilters, RARITY_ORDER, type AlbumFilters as Filters } from "@/lib/album";
import { requireUser } from "@/lib/session";
import { previewDuplicateSale } from "@/lib/wallet";
import { AlbumFilters } from "./AlbumFilters";
import { DuplicateSale } from "./DuplicateSale";

export const metadata: Metadata = { title: "Album — Anime Masters" };

export default function AlbumPage({ searchParams }: PageProps<"/album">) {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold">Album</h1>
      <Suspense fallback={<p className="text-muted">Chargement…</p>}>
        <Album searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

const pct = (a: number, b: number) => (b ? Math.floor((a / b) * 1000) / 10 : 0);

async function Album({ searchParams }: { searchParams: PageProps<"/album">["searchParams"] }) {
  const user = await requireUser();
  const filters = parseAlbumFilters(await searchParams);
  const album = await getAlbum(user.id, filters);
  const saleRarities = ["N", "R"] as const;
  const salePreview = await previewDuplicateSale(user.id, [...saleRarities]);
  const { progress } = album;

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-wrap items-end gap-x-8 gap-y-3 rounded-2xl bg-panel p-5">
        <div>
          <div className="text-3xl font-extrabold tabular-nums">
            {progress.owned} <span className="text-base font-medium text-muted">/ {progress.total} personnages</span>
          </div>
          <div className="mt-2 h-2 w-64 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-violet-400" style={{ width: `${pct(progress.owned, progress.total)}%` }} />
          </div>
          <div className="mt-1 text-sm text-muted">{pct(progress.owned, progress.total)} % de complétion</div>
        </div>
        <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm tabular-nums">
          {RARITY_ORDER.map((r) => (
            <li key={r}>
              <b style={{ color: `var(--rarity-${r})` }}>{r}</b>{" "}
              <span className="text-muted">
                {progress.byRarity[r].owned}/{progress.byRarity[r].total}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <DuplicateSale initialRarities={[...saleRarities]} initialPreview={salePreview} />

      <AlbumFilters filters={filters} />

      <p className="text-sm text-muted">
        {album.matching} personnage{album.matching > 1 ? "s" : ""}
      </p>

      {album.entries.length === 0 ? (
        <p className="py-16 text-center text-muted">Aucun personnage ne correspond à ces filtres.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {album.entries.map((e) => (
            <li key={e.id}>
              <Link href={`/character/${e.id}`} className="block rounded-xl transition-transform hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-violet-400">
                <CharacterCard {...e} finish={e.owned?.best} count={e.owned?.count} missing={!e.owned} />
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Pagination filters={filters} pages={album.pages} />
    </div>
  );
}

function Pagination({ filters, pages }: { filters: Filters; pages: number }) {
  if (pages <= 1) return null;
  const href = (page: number) => {
    const p = new URLSearchParams();
    if (filters.q) p.set("q", filters.q);
    if (filters.rarity) p.set("rarity", filters.rarity);
    if (filters.type) p.set("type", filters.type);
    if (filters.owned !== "all") p.set("owned", filters.owned);
    if (page > 1) p.set("page", String(page));
    const s = p.toString();
    return s ? `/album?${s}` : "/album";
  };
  const page = Math.min(filters.page, pages);
  const link = "rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold hover:bg-white/5";
  return (
    <nav className="flex items-center justify-center gap-3" aria-label="Pagination">
      {page > 1 ? <Link href={href(page - 1)} className={link}>← Précédent</Link> : <span className={`${link} opacity-40`}>← Précédent</span>}
      <span className="text-sm tabular-nums text-muted">
        Page {page} / {pages}
      </span>
      {page < pages ? <Link href={href(page + 1)} className={link}>Suivant →</Link> : <span className={`${link} opacity-40`}>Suivant →</span>}
    </nav>
  );
}
