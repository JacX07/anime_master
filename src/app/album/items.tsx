import Link from "next/link";
import { CharacterCard } from "@/components/CharacterCard";
import { Stat } from "@/components/icons";
import type { AlbumEntry, AlbumFilters as Filters, WorldBand } from "@/lib/album";
import { albumHref } from "./AlbumFilters";

const num = new Intl.NumberFormat("fr-FR");
const pct = (a: number, b: number) => (b ? Math.floor((a / b) * 1000) / 10 : 0);

/** Teinte propre à chaque monde, dérivée de son nom (stable d'une visite à l'autre) */
function worldHue(title: string) {
  let h = 0;
  for (const c of title) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}

/** Une tuile par monde : nom en grand, carte vedette inclinée, progression et puissance */
export function World({ world, filters }: { world: WorldBand; filters: Filters }) {
  const p = pct(world.owned, world.total);
  const star = world.preview[0];
  return (
    <Link
      href={albumHref(filters, { anime: world.key, page: 1 })}
      className="wd-tile"
      style={{ "--w": `hsl(${worldHue(world.title)} 85% 62%)` } as React.CSSProperties}
      aria-label={`${world.title} : ${world.owned} cartes sur ${world.total}`}
    >
      <h2>{world.title}</h2>
      {star && (
        <div className="wd-star" style={{ "--rar": `var(--rarity-${star.rarity})` } as React.CSSProperties}>
          <CharacterCard {...star} finish={star.owned?.best} count={star.owned?.count} missing={!star.owned} />
        </div>
      )}
      {/* Au survol : quelques personnages du monde se déploient en éventail au-dessus de la tuile, la plus rare à droite et au premier plan */}
      <div className="wd-fan" aria-hidden>
        {[...world.preview].reverse().map((e) => (
          <div key={e.id}>
            <CharacterCard {...e} finish={e.owned?.best} count={undefined} missing={!e.owned} />
          </div>
        ))}
      </div>
      <div className="wd-foot">
        <b className="wd-count">{num.format(world.owned)}</b>
        <span>sur {num.format(world.total)} cartes{world.owned === world.total && " · complet"}</span>
        <span className="wd-bar" role="img" aria-label={`${p} % de complétion`}>
          <i style={{ width: `${p}%` }} />
        </span>
        <span className="wd-power" title="Puissance du monde">
          <Stat icon="puissance" accent="currentColor">
            {num.format(world.power)}
          </Stat>
        </span>
      </div>
    </Link>
  );
}

/** Une carte de la grille d'un anime */
export function CardItem({ entry: e }: { entry: AlbumEntry }) {
  return (
    <li>
      <Link href={`/character/${e.id}`} className="vt-card" style={{ "--rar": `var(--rarity-${e.rarity})` } as React.CSSProperties}>
        <CharacterCard {...e} finish={e.owned?.best} count={e.owned?.count} missing={!e.owned} />
      </Link>
    </li>
  );
}
