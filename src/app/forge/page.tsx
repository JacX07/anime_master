import { ResourceArt } from "@/components/ResourceArt";
import { Suspense } from "react";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { DUNGEON_RESOURCE } from "@/lib/dungeons";
import { EMPEROR_RECIPE, EMPERORS } from "@/lib/emperors";
import { WEAPONS, WEAPON_RECIPE, WEAPON_RESOURCE_KEYS, RAID_RESOURCE } from "@/lib/weapons";
import { ForgeForm } from "./ForgeForm";
import "../inventaire/inventaire.css";

export const metadata = { title: "Forge — Anime Masters", robots: { index: false } };
export default function ForgePage() {
  return <main className="vt"><div className="vt-inner">
    <header className="pg-head"><h1 className="vt-title">Forge légendaire</h1>
      <p className="vt-sub">Une arme par carte 5★ : +10 % d’ATK, de DEF et de PV, plus un passif. L’arme reste attachée à cet exemplaire, même lors d’un échange.</p>
      <p>Recette : {WEAPON_RECIPE.weaponUnits} ressources de boss final, tous univers confondus, et {WEAPON_RECIPE.hearts} cœurs de brèche.</p>
      <p>Armes des empereurs (n’importe quelle carte 5★) : {EMPEROR_RECIPE.legendary} ressources de l’empereur (raid « Défi des empereurs ») et {EMPEROR_RECIPE.dungeon} Éclats du Trône (niveau 10 du donjon One Piece, 10 % par victoire).</p>
      <Link href="/eveil">Éveiller mes cartes</Link></header>
    <Suspense fallback={<p>Chargement…</p>}><Cards /></Suspense>
  </div></main>;
}
async function Cards() {
  const user = await requireUser();
  const [cards, stock] = await Promise.all([
    prisma.card.findMany({ where: { ownerId: user.id, stars: 5 }, include: { character: true }, orderBy: { id: "asc" } }),
    prisma.resourceStock.findMany({ where: { userId: user.id } }),
  ]);
  const units = stock.filter((s) => WEAPON_RESOURCE_KEYS.includes(s.key)).reduce((n, s) => n + s.quantity, 0);
  const hearts = stock.find((s) => s.key === RAID_RESOURCE)?.quantity ?? 0;
  const owned = (key: string) => stock.find((s) => s.key === key)?.quantity ?? 0;
  return <><p>Stock : {units} ressources de boss final · {hearts} cœurs de brèche · {owned(DUNGEON_RESOURCE)} Éclats du Trône.</p>
    <p>{EMPERORS.map((e) => `${e.resourceName} : ${owned(e.resource)}`).join(" · ")}</p>
    {!cards.length && <p className="identity-panel">Aucune carte 5★. Passe par l’éveil pour préparer ta première arme.</p>}
    {cards.map((card) => {
      const def = WEAPONS.find((w) => w.type === card.character.type)!;
      return <article className="forge-card" key={card.id} style={{ marginBlock: "1.5rem" }}>
        <h2>{card.character.name} · #{card.serial}</h2>
        <p><ResourceArt resource={def.key} size={56} />{def.name} · {def.passive}</p>
        {card.weaponKey ? <p>Arme équipée</p> : <>
          <ForgeForm cardId={card.id} disabled={card.inAuction || card.inExpedition || units < WEAPON_RECIPE.weaponUnits || hearts < WEAPON_RECIPE.hearts} />
          {EMPERORS.map((e) => {
            const weapon = WEAPONS.find((w) => w.key === e.weapon)!;
            return <div key={e.weapon}><p><ResourceArt resource={weapon.key} size={40} />{weapon.name} · {weapon.passive}</p>
              <ForgeForm cardId={card.id} weapon={weapon.key} label={`Forger ${weapon.name}`} disabled={card.inAuction || card.inExpedition || owned(e.resource) < EMPEROR_RECIPE.legendary || owned(DUNGEON_RESOURCE) < EMPEROR_RECIPE.dungeon} /></div>;
          })}
        </>}
      </article>;
    })}</>;
}
