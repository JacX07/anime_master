import { ResourceArt } from "@/components/ResourceArt";
import { InventoryTabs } from "@/components/InventoryTabs";
import { Suspense } from "react";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { DUNGEON_RESOURCE } from "@/lib/dungeons";
import { EMPEROR_RECIPE, EMPERORS } from "@/lib/emperors";
import { RESOURCE_NAMES } from "@/lib/story";
import { WEAPONS, WEAPON_RECIPE, WEAPON_RESOURCE_KEYS, RAID_RESOURCE } from "@/lib/weapons";
import { ForgeForm } from "./ForgeForm";
import "../inventaire/inventaire.css";

export const metadata = { title: "Forge — Anime Masters", robots: { index: false } };

export default function ForgePage() {
  return <main className="vt"><div className="vt-inner">
    <InventoryTabs current="/forge" />
    <header className="pg-head"><h1 className="vt-title">Forge légendaire</h1>
      <p className="vt-sub">Une arme par carte 5★ : +10 % d’ATK, de DEF et de PV, plus un passif. L’arme reste attachée à cet exemplaire, même lors d’un échange. Chaque recette indique ce qu’il te faut et ce que tu possèdes.</p>
    </header>
    <Suspense fallback={<p>Chargement…</p>}><Cards /></Suspense>
  </div></main>;
}

type Need = { key: string; name: string; have: number; need: number; art?: string };

/** Ingrédients d'une recette : possédé / requis, en rouge quand il en manque. */
function Needs({ needs }: { needs: Need[] }) {
  return <ul className="forge-needs" style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem 1.5rem", listStyle: "none", padding: 0, margin: "0.5rem 0" }}>
    {needs.map((n) => <li key={n.key} data-missing={n.have < n.need || undefined} style={{ display: "flex", alignItems: "center", color: n.have < n.need ? "#e0897d" : undefined }}>
      {n.art && <ResourceArt resource={n.art} size={32} />}{n.name} : <b style={{ marginLeft: 4 }}>{n.have} / {n.need}</b>
    </li>)}
  </ul>;
}

async function Cards() {
  const user = await requireUser();
  const [cards, stock] = await Promise.all([
    prisma.card.findMany({ where: { ownerId: user.id, stars: 5 }, include: { character: true }, orderBy: { id: "asc" } }),
    prisma.resourceStock.findMany({ where: { userId: user.id } }),
  ]);
  const owned = (key: string) => stock.find((s) => s.key === key)?.quantity ?? 0;
  const units = stock.filter((s) => WEAPON_RESOURCE_KEYS.includes(s.key)).reduce((n, s) => n + s.quantity, 0);
  const hearts = owned(RAID_RESOURCE);
  const genericNeeds: Need[] = [
    { key: "boss", name: "Ressources d’arme des boss finaux (tous univers)", have: units, need: WEAPON_RECIPE.weaponUnits },
    { key: RAID_RESOURCE, name: RESOURCE_NAMES[RAID_RESOURCE], have: hearts, need: WEAPON_RECIPE.hearts, art: RAID_RESOURCE },
  ];
  const emperorNeeds = (e: (typeof EMPERORS)[number]): Need[] => [
    { key: e.resource, name: e.resourceName, have: owned(e.resource), need: EMPEROR_RECIPE.legendary, art: e.resource },
    { key: DUNGEON_RESOURCE, name: RESOURCE_NAMES[DUNGEON_RESOURCE], have: owned(DUNGEON_RESOURCE), need: EMPEROR_RECIPE.dungeon, art: DUNGEON_RESOURCE },
  ];
  return <>
    <section className="identity-panel" aria-label="Recettes">
      <h2>Recettes</h2>
      <p><b>Arme de type</b> (selon le type de la carte) :</p>
      <Needs needs={genericNeeds} />
      {EMPERORS.map((e) => {
        const weapon = WEAPONS.find((w) => w.key === e.weapon)!;
        return <div key={e.weapon}>
          <p><ResourceArt resource={weapon.key} size={56} /><b>{weapon.name}</b> · {weapon.passive}</p>
          <Needs needs={emperorNeeds(e)} />
          <small>{e.resourceName} : victoire sur {e.name} au Défi des empereurs (1 par jour). {RESOURCE_NAMES[DUNGEON_RESOURCE]} : niveau 10 du donjon One Piece, 10 % par victoire.</small>
        </div>;
      })}
    </section>
    {!cards.length && <p className="identity-panel">Aucune carte 5★. Passe par l’éveil pour préparer ta première arme.</p>}
    {cards.map((card) => {
      const def = WEAPONS.find((w) => w.type === card.character.type)!;
      const locked = card.inAuction || card.inExpedition;
      return <article className="forge-card" key={card.id} style={{ marginBlock: "1.5rem" }}>
        <h2>{card.character.name} · #{card.serial}</h2>
        {card.weaponKey ? <p>Arme équipée : {WEAPONS.find((w) => w.key === card.weaponKey)?.name ?? card.weaponKey}</p> : <>
          <p><ResourceArt resource={def.key} size={56} />{def.name} · {def.passive}</p>
          <Needs needs={genericNeeds} />
          <ForgeForm cardId={card.id} disabled={locked || units < WEAPON_RECIPE.weaponUnits || hearts < WEAPON_RECIPE.hearts} />
          {EMPERORS.map((e) => {
            const weapon = WEAPONS.find((w) => w.key === e.weapon)!;
            const needs = emperorNeeds(e);
            return <div key={e.weapon}><p><ResourceArt resource={weapon.key} size={40} />{weapon.name} · {weapon.passive}</p>
              <Needs needs={needs} />
              <ForgeForm cardId={card.id} weapon={weapon.key} label={`Forger ${weapon.name}`} disabled={locked || needs.some((n) => n.have < n.need)} /></div>;
          })}
        </>}
      </article>;
    })}</>;
}
