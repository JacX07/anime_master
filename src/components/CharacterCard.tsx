import type { CardType, Rarity } from "@/generated/prisma/enums";
import { TYPE_LABELS } from "@/lib/labels";
import type { Finish } from "@/lib/pull";

export interface CharacterCardProps {
  name: string;
  imageUrl: string;
  rarity: Rarity;
  type: CardType;
  attack: number;
  defense: number;
  series?: string | null;
  finish?: Finish;
  serial?: number;
  isNew?: boolean;
}

/** Carte d'un personnage : rareté (cadre), finition (effet), type et stats. */
export function CharacterCard({
  name,
  imageUrl,
  rarity,
  type,
  attack,
  defense,
  series,
  finish = "NORMAL",
  serial,
  isNew,
}: CharacterCardProps) {
  const t = TYPE_LABELS[type];
  return (
    <div className="card" data-rarity={rarity} data-finish={finish}>
      {/* Image servie par le CDN AniList : <img> simple, pas de copie côté serveur */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="card-art" src={imageUrl} alt={name} loading="lazy" referrerPolicy="no-referrer" />
      <span className="card-badge left">{rarity}</span>
      {serial !== undefined && <span className="card-badge right">#{serial}</span>}
      {isNew && <span className="card-new">NOUVEAU</span>}
      <div className="card-info">
        <div className="card-name" title={name}>
          {name}
        </div>
        <div className="card-series" title={series ?? undefined}>
          {t.emoji} {t.name}
          {series ? ` · ${series}` : ""}
        </div>
        <div className="card-stats">
          <span>⚔️ {attack}</span>
          <span>🛡️ {defense}</span>
        </div>
      </div>
    </div>
  );
}
