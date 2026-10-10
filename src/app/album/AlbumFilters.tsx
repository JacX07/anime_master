import Link from "next/link";
import type { AlbumFilters as Filters } from "@/lib/album";
import { TypeIcon } from "@/components/icons";
import { RARITY_NAMES, TYPE_LABELS } from "@/lib/labels";

const RARITIES = ["UR", "SSR", "SR", "R", "N"] as const;
const TYPES = ["COMBAT", "MYSTERE", "MAGIE", "COEUR", "AVENTURE"] as const;
const OWNED = [
  ["all", "Tous"],
  ["owned", "Possédés"],
  ["missing", "Manquants"],
  ["duplicates", "Doublons"],
] as const;

/** URL de l'album pour des filtres donnés ; on repart toujours de la page 1 sauf si `page` est précisé. */
export function albumHref(filters: Filters, patch: Partial<Filters> = {}) {
  const f = { ...filters, page: 1, ...patch };
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.rarity) p.set("rarity", f.rarity);
  if (f.type) p.set("type", f.type);
  if (f.owned !== "all") p.set("owned", f.owned);
  if (f.page > 1) p.set("page", String(f.page));
  const s = p.toString();
  return s ? `/album?${s}` : "/album";
}

function Chip({ href, active, children, color, title }: { href: string; active: boolean; children: React.ReactNode; color?: string; title?: string }) {
  return (
    <Link href={href} className="vt-chip" data-active={active} aria-pressed={active} title={title} style={color ? ({ "--rar": color } as React.CSSProperties) : undefined}>
      {children}
    </Link>
  );
}

/** Filtres de l'album : des pastilles qu'on active et désactive d'un clic, la recherche reste un champ simple. */
export function AlbumFilters({ filters }: { filters: Filters }) {
  return (
    <div className="vt-filters">
      <div className="vt-row">
        <form action="/album" className="vt-search" role="search">
          {filters.rarity && <input type="hidden" name="rarity" value={filters.rarity} />}
          {filters.type && <input type="hidden" name="type" value={filters.type} />}
          {filters.owned !== "all" && <input type="hidden" name="owned" value={filters.owned} />}
          <input type="search" name="q" defaultValue={filters.q} placeholder="Rechercher un personnage" aria-label="Rechercher un personnage" />
        </form>
        <div className="vt-chips" role="group" aria-label="Possession">
          {OWNED.map(([v, label]) => (
            <Chip key={v} href={albumHref(filters, { owned: v })} active={filters.owned === v}>
              {label}
            </Chip>
          ))}
        </div>
      </div>
      <div className="vt-row">
        <div className="vt-chips" role="group" aria-label="Rareté">
          {RARITIES.map((r) => (
            <Chip key={r} href={albumHref(filters, { rarity: filters.rarity === r ? null : r })} active={filters.rarity === r} color={`var(--rarity-${r})`} title={RARITY_NAMES[r]}>
              <b>{r}</b>
            </Chip>
          ))}
        </div>
        <div className="vt-chips" role="group" aria-label="Type">
          {TYPES.map((t) => (
            <Chip key={t} href={albumHref(filters, { type: filters.type === t ? null : t })} active={filters.type === t}>
              <TypeIcon type={t} /> {TYPE_LABELS[t].name}
            </Chip>
          ))}
        </div>
      </div>
    </div>
  );
}
