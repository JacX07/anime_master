"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export type SidebarAnime = { key: string; title: string; owned: number; total: number; cover?: string; href: string };
type Sort = "size" | "completion" | "alpha";
const SORTS: [Sort, string][] = [["size", "Taille"], ["completion", "Complétion"], ["alpha", "A → Z"]];

/** Colonne « Collections » de l'album : tous les animes avec leur progression ; un clic filtre la grille. */
export function CollectionsSidebar({ items, current, allHref, owned, total }: { items: SidebarAnime[]; current: string; allHref: string; owned: number; total: number }) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>("size");
  const [open, setOpen] = useState(false);
  const shown = useMemo(() => {
    const needle = q.trim().toLocaleLowerCase();
    const list = items.filter((a) => !needle || a.title.toLocaleLowerCase().includes(needle));
    const byTitle = (a: SidebarAnime, b: SidebarAnime) => a.title.localeCompare(b.title, "fr", { sensitivity: "base" });
    const cmp: Record<Sort, (a: SidebarAnime, b: SidebarAnime) => number> = {
      size: (a, b) => b.total - a.total || byTitle(a, b),
      completion: (a, b) => b.owned / b.total - a.owned / a.total || b.owned - a.owned || byTitle(a, b),
      alpha: byTitle,
    };
    return [...list].sort(cmp[sort]);
  }, [items, q, sort]);
  const pct = (a: number, b: number) => (b ? (a / b) * 100 : 0);
  const row = (a: { key: string; title: string; owned: number; total: number; cover?: string; href: string }, all = false) => (
    <li key={a.key || "all"}>
      <Link href={a.href} className="cs-row" aria-current={current === a.key ? "page" : undefined} data-done={a.owned === a.total && a.total > 0 || undefined} onClick={() => setOpen(false)} scroll={false}>
        {all ? <span className="cs-all" aria-hidden="true">◆</span>
          // eslint-disable-next-line @next/next/no-img-element
          : a.cover ? <img src={a.cover} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" /> : <span className="cs-all" aria-hidden="true">◇</span>}
        <span className="cs-text">
          <span className="cs-title">{a.title}</span>
          <span className="cs-bar"><i style={{ width: `${pct(a.owned, a.total)}%` }} /></span>
        </span>
        <span className="cs-count">{a.owned === a.total && a.total > 0 ? "✓ " : ""}{a.owned}/{a.total}</span>
      </Link>
    </li>
  );
  return (
    <div className="cs-wrap">
      <button type="button" className="cs-toggle" onClick={() => setOpen(true)} aria-expanded={open} aria-controls="collections">◆ Collections</button>
      {open && <div className="cs-veil" onClick={() => setOpen(false)} aria-hidden="true" />}
      <aside id="collections" className="cs" data-open={open || undefined} aria-label="Collections">
        <div className="cs-head">
          <h2>Collections</h2>
          <button type="button" className="cs-close" onClick={() => setOpen(false)}>Fermer ×</button>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Chercher un anime" aria-label="Chercher un anime" />
          <div className="cs-sorts" role="group" aria-label="Trier les collections">
            {SORTS.map(([v, label]) => <button key={v} type="button" aria-pressed={sort === v} onClick={() => setSort(v)}>{label}</button>)}
          </div>
        </div>
        <ul>
          {row({ key: "", title: "Tous les animes", owned, total, href: allHref }, true)}
          {shown.map((a) => row(a))}
          {!shown.length && <li className="cs-empty">Aucun anime ne correspond.</li>}
        </ul>
      </aside>
    </div>
  );
}
