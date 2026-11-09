import type { CardType, Rarity } from "@/generated/prisma/enums";
import { TYPE_LABELS } from "@/lib/labels";
import { CardDeco, CardFill } from "./CardDeco";
import { Icon, RarityGem, Stat, TypeIcon } from "./icons";
import type { Finish } from "@/lib/pull";
import { speedOf } from "@/lib/speed";

export interface CharacterCardProps {
  characterId: number;
  name: string;
  imageUrl: string;
  rarity: Rarity;
  type: CardType;
  attack: number;
  defense: number;
  /** Puissance : stat de popularité, indépendante d'ATK et DEF */
  power: number;
  powerTitle?: string;
  series?: string | null;
  finish?: Finish;
  serial?: number;
  isNew?: boolean;
  /** Nombre d'exemplaires possédés (album) : badge ×N à partir de 2 */
  count?: number;
  /** Éveil de la carte (0 à 5) : 5 étoiles, jaunes de base, rouges une fois gagnées ; rien si absent */
  stars?: number;
  /** Personnage pas encore possédé : image grisée et floutée, nom visible */
  missing?: boolean;
}

const powerFmt = new Intl.NumberFormat("fr-FR");

/** Carte d'un personnage : rareté (cadre), finition (effet), type et stats. */
export function CharacterCard({
  name,
  characterId,
  imageUrl,
  rarity,
  type,
  attack,
  defense,
  power,
  powerTitle = "Puissance (popularité)",
  series,
  finish = "NORMAL",
  serial,
  isNew,
  count,
  stars,
  missing,
}: CharacterCardProps) {
  const t = TYPE_LABELS[type];
  return (
    <div className="card" data-rarity={rarity} data-finish={missing ? "NORMAL" : finish} data-missing={missing || undefined}>
      {!missing && <CardFill />}
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
      {!missing && stars !== undefined && (
        <span className="card-stars" title={`Éveil ${stars} étoile${stars > 1 ? "s" : ""} sur 5`} role="img" aria-label={`${stars} étoiles sur 5`}>
          {[1, 2, 3, 4, 5].map((n) => <i key={n} data-on={n <= stars || undefined}>★</i>)}
        </span>
      )}
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
            <span className="card-power" title={powerTitle}>
              <Icon name="puissance" style={{ "--acc": "currentColor" } as React.CSSProperties} />
              {powerFmt.format(power)}
            </span>
            <span className="card-atkdef">
              <Stat icon="atk">{powerFmt.format(attack)}</Stat>
              <Stat icon="def">{powerFmt.format(defense)}</Stat>
              <Stat icon="speed" title={`Vitesse ${powerFmt.format(speedOf(characterId))}`}>{powerFmt.format(speedOf(characterId))}</Stat>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
