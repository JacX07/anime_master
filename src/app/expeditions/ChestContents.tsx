"use client";

/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import { Icon, type IconName } from "@/components/icons";
import { ResourceArt } from "@/components/ResourceArt";
import { artifactImage, artifactRarity } from "@/lib/artifact-display";
import { BREACHES } from "@/lib/expedition-rules";
import { breachChestOdds, CHEST_ITEMS, CHEST_NAMES, CHEST_TIERS, chestContents, type ChestContent, type ChestTier } from "@/lib/chests";
import { RAID_RESOURCE } from "@/lib/raid";
import { COMMON_RESOURCE, RESOURCE_NAMES, universeOf } from "@/lib/story";
import type { Rarity } from "@/generated/prisma/enums";

const num = new Intl.NumberFormat("fr-FR");
const pct = (x: number) => `${(Math.round(x * 1000) / 10).toLocaleString("fr-FR")} %`;
const RARITY_COLOR = (r: Rarity) => artifactRarity(r).color;

type Row = { name: string; detail?: string; amount: string; rarity?: Rarity; art: React.ReactNode };
const res = (key: string) => <ResourceArt resource={key} size={34} fallback={<img src={`/items/${key}.svg`} alt="" width={34} height={34} />} />;
const icon = (name: IconName) => <Icon name={name} />;

/** Une ligne d'affichage par objet de coffre ; `universe` donne l'image des matériaux d'éveil et d'arme (ceux de la brèche d'où vient le coffre). */
function describe({ item }: ChestContent, universeKey: string | null): Row {
  const universe = universeOf(universeKey ?? "");
  switch (item.kind) {
    case "ryo": return { name: "Ryō", amount: num.format(item.amount), art: icon("ryo") };
    case "crystals": return { name: "Cristaux", amount: `+${item.amount}`, art: icon("cristal") };
    case "energy": return { name: "Énergie", amount: `+${item.amount}`, art: icon("recharge") };
    case "booster": return { name: "Booster offert", amount: `${item.cards} cartes`, art: <img src="/images/boosters/standard.png" alt="" /> };
    case "awakening": return { name: "Matériau d’éveil", detail: universe ? RESOURCE_NAMES[universe.resource] : undefined, amount: `×${item.amount}`, art: res(universe?.resource ?? COMMON_RESOURCE) };
    case "signature": return { name: RESOURCE_NAMES[COMMON_RESOURCE], amount: `×${item.amount}`, art: res(COMMON_RESOURCE) };
    case "weapon": return { name: "Matériau d’arme", detail: universe ? RESOURCE_NAMES[universe.weaponResource] : undefined, amount: `×${item.amount}`, art: res(universe?.weaponResource ?? COMMON_RESOURCE) };
    case "hearts": return { name: RESOURCE_NAMES[RAID_RESOURCE], amount: `×${item.amount}`, art: res(RAID_RESOURCE) };
    case "artifact": return { name: `Artefact ${artifactRarity(item.rarity).label}`, detail: "set au hasard", amount: "1 pièce", rarity: item.rarity, art: <img src={artifactImage("one-piece", "CASQUE")} alt="" /> };
    case "card": return { name: `Personnage ${artifactRarity(item.rarity).label}`, detail: "de l’univers de la brèche", amount: "1 carte", rarity: item.rarity, art: <img src="/images/cards/anima-clash-back.webp" alt="" /> };
    case "emperor": return { name: "Ressource d’empereur", detail: "au hasard parmi les quatre", amount: `×${item.amount}`, art: res("meche-de-big-mom") };
  }
}

function Line({ row, chance }: { row: Row; chance: number }) {
  return <li className="cc-it">
    <span className="cc-art" style={row.rarity ? { boxShadow: `inset 0 -2px 0 ${RARITY_COLOR(row.rarity)}` } : undefined}>{row.art}</span>
    <span className="cc-nm">{row.name}{row.detail && <small>{row.detail}</small>}</span>
    <span className="cc-q">{row.amount}</span>
    <span className="cc-p">{pct(chance)}<i style={{ width: `${Math.min(100, chance * 300)}%` }} /></span>
  </li>;
}

/** Contenu des coffres d'expédition et chances de chaque objet (maquette public/mockups/drops-lisibles.html, validée le 2026-11-16). */
export function ChestContents({ universeKeys }: { universeKeys: Record<string, string | null> }) {
  const [tier, setTier] = useState<ChestTier>("bronze");
  const { items, jackpot } = chestContents(tier);
  const universes = [...new Set(BREACHES.map((b) => b.universe))];
  const [chosen, setChosen] = useState<string | null>(null);
  // Par défaut : l'univers d'un coffre que le joueur possède, sinon le premier
  const universeKey = chosen ?? Object.values(universeKeys).find((k): k is string => !!k && universes.includes(k)) ?? universes[0];
  const levels = (["Faille", "Brèche", "Gouffre"] as const).map((level) => ({ level, ...breachChestOdds(level) }));
  return <section className="cc" aria-label="Contenu des coffres">
    <h2 className="vt-h2">Ce que contiennent les coffres</h2>
    <div className="cc-bar">
      <div className="cc-tabs" role="tablist" aria-label="Rang du coffre">
        {CHEST_TIERS.map((t) => <button key={t} type="button" role="tab" aria-selected={t === tier} onClick={() => setTier(t)}>{CHEST_NAMES[t]}</button>)}
      </div>
      <label className="cc-universe">Brèche <select value={universeKey} onChange={(e) => setChosen(e.target.value)}>{universes.map((u) => <option key={u} value={u}>{universeOf(u)?.name ?? u}</option>)}</select></label>
    </div>
    <div className="cc-grid">
      <div className="cc-box">
        <h3>Coffres rapportés</h3>
        {levels.map(({ level, count, odds }) => <div key={level} className="cc-odds"><b>{level} · {count} coffre{count > 1 ? "s" : ""}</b>
          {odds.map((o) => <div key={o.tier} className="cc-orow"><span>{CHEST_NAMES[o.tier]}</span><b>{pct(o.chance)}</b><i style={{ width: `${o.chance * 100}%` }} /></div>)}</div>)}
        <p className="cc-note">Échec : toujours 1 coffre Bronze. Triomphe : un coffre de plus, tiré un cran au-dessus.</p>
      </div>
      <div className="cc-box">
        <h3>Coffre {CHEST_NAMES[tier]} · {CHEST_ITEMS[tier] - (jackpot.length ? 1 : 0)} objets{jackpot.length ? " + 1 gros lot" : ""}</h3>
        <ul className="cc-list">{items.map((c, i) => <Line key={i} row={describe(c, universeKey)} chance={c.chance} />)}</ul>
        {jackpot.length > 0 && <div className="cc-jack"><h3>Gros lot garanti (1 par coffre)</h3>
          <ul className="cc-list">{jackpot.map((c, i) => <Line key={i} row={describe(c, universeKey)} chance={c.chance} />)}</ul></div>}
      </div>
    </div>
  </section>;
}
