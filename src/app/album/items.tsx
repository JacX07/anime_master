import Link from "next/link";
import { CharacterCard } from "@/components/CharacterCard";
import { Stat } from "@/components/icons";
import type { AlbumEntry, AlbumFilters as Filters, WorldBand } from "@/lib/album";
import { albumHref } from "./AlbumFilters";

const num = new Intl.NumberFormat("fr-FR");
const pct = (a: number, b: number) => (b ? Math.floor((a / b) * 1000) / 10 : 0);

/** Album d’un monde : progression réelle, sans portraits ni éventail au survol. */
export function World({ world, filters }: { world: WorldBand; filters: Filters }) {
  const p = pct(world.owned, world.total);
  return (
    <Link href={albumHref(filters, { anime: world.key, page: 1 })} className="wd-tile" aria-label={`${world.title} : ${world.owned} cartes sur ${world.total}`}>
      <span className="wd-index" aria-hidden="true" />
      <div className="wd-meta">
        <span className="wd-kicker">Collection</span>
        <h2>{world.title}</h2>
        <div className="wd-summary">
          <p>{num.format(world.owned)} / {num.format(world.total)} cartes{world.owned === world.total && " · complet"}</p>
          <span className="wd-power" title="Puissance possédée dans ce monde"><Stat icon="puissance">{num.format(world.power)}</Stat></span>
        </div>
        <span className="wd-bar" role="img" aria-label={`${p} % de complétion`}><i style={{ width: `${p}%` }} /></span>
      </div>
    </Link>
  );
}

/** Une carte de la grille d'un anime */
export function CardItem({ entry: e }: { entry: AlbumEntry }) {
  return (
    <li>
      <Link href={`/character/${e.id}`} className="vt-card" style={{ "--rar": `var(--rarity-${e.rarity})` } as React.CSSProperties}>
        <CharacterCard {...e} characterId={e.id} finish={e.owned?.best} count={e.owned?.count} stars={e.owned?.stars} missing={!e.owned} />
      </Link>
    </li>
  );
}
