import type { CardType, Rarity } from "@/generated/prisma/enums";
import { TYPE_LABELS } from "@/lib/labels";
import { CardDeco } from "./CardDeco";
import { Icon, RarityGem, Stat, TypeIcon } from "./icons";
import type { Finish } from "@/lib/pull";

export interface CharacterCardProps {
  name: string;
  imageUrl: string;
  rarity: Rarity;
  type: CardType;
  attack: number;
  defense: number;
  /** Puissance : stat de popularité, indépendante d'ATK et DEF */
  power: number;
  series?: string | null;
  finish?: Finish;
  serial?: number;
  isNew?: boolean;
  /** Nombre d'exemplaires possédés (album) : badge ×N à partir de 2 */
  count?: number;
  /** Éveil de la carte (1 à 5) : étoiles en bas de l'image ; rien à 0 */
  stars?: number;
  /** Personnage pas encore possédé : image grisée et floutée, nom visible */
  missing?: boolean;
}

const powerFmt = new Intl.NumberFormat("fr-FR");

/** Carte d'un personnage : rareté (cadre), finition (effet), type et stats. */
export function CharacterCard({
  name,
  imageUrl,
  rarity,
  type,
  attack,
  defense,
  power,
  series,
  finish = "NORMAL",
  serial,
  isNew,
  count,
  stars = 0,
  missing,
}: CharacterCardProps) {
  const t = TYPE_LABELS[type];
  return (
    <div className="card" data-rarity={rarity} data-finish={missing ? "NORMAL" : finish} data-missing={missing || undefined}>
      {/* Image servie par le CDN AniList : <img> simple, pas de copie côté serveur */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="card-art" src={imageUrl} alt={name} loading="lazy" referrerPolicy="no-referrer" />
      <RarityGem rarity={rarity} className="card-gem" />
      {!missing && <CardDeco rarity={rarity} />}
      {!missing && finish !== "NORMAL" && <Icon name={finish === "GOLD" ? "f-gold" : "f-holo"} className="card-finish" title={finish === "GOLD" ? "Gold" : "Holo"} />}
      <span className="card-kind" title={t.name}>
        <TypeIcon type={type} />
      </span>
      {missing && <span className="card-unknown" aria-hidden>?</span>}
      {count !== undefined && count > 1 && <span className="card-count">×{count}</span>}
      {!missing && stars > 0 && <span className="card-stars" title={`Éveil ${stars} étoile${stars > 1 ? "s" : ""}`} aria-label={`${stars} étoiles`}>{"★".repeat(stars)}</span>}
      {isNew && <span className="card-new">NOUVEAU</span>}
      <div className="card-info">
        <div className="card-name" title={name}>
          {name}
        </div>
        <div className="card-series" title={series ?? undefined}>
          {series}
          {serial !== undefined && <span className="card-serial">#{serial}</span>}
        </div>
        {!missing && (
          <div className="card-stats">
            <span className="card-power" title="Puissance (popularité)">
              <Icon name="puissance" style={{ "--acc": "currentColor" } as React.CSSProperties} />
              {powerFmt.format(power)}
            </span>
            <span className="card-atkdef">
              <Stat icon="atk">{powerFmt.format(attack)}</Stat>
              <Stat icon="def">{powerFmt.format(defense)}</Stat>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
