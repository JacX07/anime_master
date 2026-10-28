"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { AlbumEntry, AlbumFilters, WorldBand } from "@/lib/album";
import { albumHref } from "./AlbumFilters";
import { CardItem, World } from "./items";

/** Liste qui charge la suite quand on approche du bas : `children` est la première page, les suivantes viennent de /api/album/more. */
async function load(filters: AlbumFilters, page: number): Promise<ReactNode[]> {
  const { search } = new URL(albumHref(filters, { page }), location.origin);
  const res = await fetch(`/api/album/more${search}`);
  if (!res.ok) throw new Error(String(res.status));
  const data: { bands?: WorldBand[]; entries?: AlbumEntry[] } = await res.json();
  return data.bands ? data.bands.map((w) => <World key={w.key} world={w} filters={filters} />) : (data.entries ?? []).map((e) => <CardItem key={e.id} entry={e} />);
}

export function InfiniteList({ as: Tag, className, pages, filters, children }: { as: "div" | "ul"; className: string; pages: number; filters: AlbumFilters; children: ReactNode }) {
  const [more, setMore] = useState<ReactNode[]>([]);
  const [next, setNext] = useState(2);
  const [failed, setFailed] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);
  const loading = useRef(false);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || next > pages || failed) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting || loading.current) return;
        loading.current = true;
        load(filters, next).then(
          (items) => {
            setMore((m) => [...m, ...items]);
            setNext(next + 1);
            loading.current = false;
          },
          () => {
            setFailed(true);
            loading.current = false;
          },
        );
      },
      { rootMargin: "900px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [next, pages, filters, failed]);

  return (
    <>
      <Tag className={className}>
        {children}
        {more}
      </Tag>
      {next <= pages && (
        <div ref={sentinel} className="vt-more">
          {failed ? "Impossible de charger la suite. Recharge la page." : "Chargement…"}
        </div>
      )}
    </>
  );
}
