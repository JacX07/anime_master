import type { CSSProperties, ReactNode } from "react";
import type { CardType, Rarity } from "@/generated/prisma/enums";
import icons from "../../public/icons/icons.json";

// Jeu d'icônes maison (public/icons/icons.json, partagé avec la scène 3D) : grille de 24 px, trait de 1,6 px, extrémités arrondies.
// Le trait suit la couleur du texte ; le petit détail (`.a` en trait, `.f` en aplat) porte la couleur d'accent `--acc`.

type Shape = { tag: string; attrs: Record<string, string> };
const sprite = icons as unknown as Record<string, { viewBox: string; shapes: Shape[] }>;

const camel = (k: string) => (k === "class" ? "className" : k.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase()));

/** À placer une fois dans le layout : définit tous les symboles que `<Icon>` référence. */
export function IconSprite() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="am-lg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4b8bff" />
          <stop offset="1" stopColor="#00c8b4" />
        </linearGradient>
      </defs>
      {Object.entries(sprite).map(([id, { viewBox, shapes }]) => (
        <symbol key={id} id={`am-${id}`} viewBox={viewBox}>
          {shapes.map(({ tag, attrs }, i) => {
            const props: Record<string, string> = {};
            for (const [k, v] of Object.entries(attrs)) props[camel(k)] = v === "url(#lg)" ? "url(#am-lg)" : v;
            const Tag = tag as "path";
            return <Tag key={i} {...props} />;
          })}
        </symbol>
      ))}
    </svg>
  );
}

export type IconName = string;

export function Icon({ name, className = "", style, title }: { name: IconName; className?: string; style?: CSSProperties; title?: string }) {
  return (
    <svg className={`i ${className}`} style={style} role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <use href={`#am-${name}`} />
    </svg>
  );
}

const TYPE_ACCENT: Record<CardType, string> = { COMBAT: "#ff6b5e", MYSTERE: "#b48cff", MAGIE: "#5fb8ff", COEUR: "#ff7fb0", AVENTURE: "#4fd6a0" };

export function TypeIcon({ type, className = "", title }: { type: CardType; className?: string; title?: string }) {
  return <Icon name={`t-${type.toLowerCase()}`} className={className} title={title} style={{ "--acc": TYPE_ACCENT[type] } as CSSProperties} />;
}

/** Cristal de rareté : il gagne des facettes, un anneau puis un halo de N à UR. */
export function RarityGem({ rarity, className = "" }: { rarity: Rarity; className?: string }) {
  return (
    <svg className={`gem ${className}`} style={{ color: `var(--rarity-${rarity})` }} role="img" aria-label={rarity}>
      <use href={`#am-r-${rarity}`} />
    </svg>
  );
}

const fmt = new Intl.NumberFormat("fr-FR");

/** Montant en Ryō avec la pièce. */
export function Money({ n, className = "" }: { n: number; className?: string }) {
  return (
    <span className={`money ${className}`}>
      {fmt.format(n)}
      <Icon name="ryo" style={{ "--acc": "#f2a516" } as CSSProperties} title="Ryō" />
    </span>
  );
}

/** Nombre précédé d'une icône (puissance, attaque, défense…). */
export function Stat({ icon, children, accent }: { icon: IconName; children: ReactNode; accent?: string }) {
  return (
    <span className="stat">
      <Icon name={icon} style={accent ? ({ "--acc": accent } as CSSProperties) : undefined} />
      {children}
    </span>
  );
}
