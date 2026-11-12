import { InventoryTabs } from "@/components/InventoryTabs";
import { Suspense } from "react";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { DUNGEON_RESOURCE } from "@/lib/dungeons";
import { EMPEROR_RECIPE, EMPERORS } from "@/lib/emperors";
import { RESOURCE_NAMES } from "@/lib/story";
import { WEAPONS } from "@/lib/weapons";
import { ForgeCarousel, type ForgeWeapon } from "./ForgeCarousel";
import "../inventaire/inventaire.css";

export const metadata = { title: "Forge — Anime Masters", robots: { index: false } };

const ACCENT: Record<string, string> = { griffon: "#d9b650", napoleon: "#e0609c", hassaikai: "#5b8fcc", murakumogiri: "#c18a50" };

export default function ForgePage() {
  return <main className="vt"><div className="vt-inner">
    <InventoryTabs current="/forge" />
    <header className="pg-head"><h1 className="vt-title">Forge légendaire</h1>
      <p className="vt-sub">Une arme par carte 5★ : +10 % d’ATK, de DEF et de PV, plus un passif. L’arme reste attachée à cet exemplaire, même lors d’un échange.</p>
    </header>
    <Suspense fallback={<p>Chargement…</p>}><Forge /></Suspense>
  </div></main>;
}

async function Forge() {
  const user = await requireUser();
  const [cards, stock] = await Promise.all([
    prisma.card.findMany({ where: { ownerId: user.id, stars: 5 }, include: { character: true }, orderBy: { id: "asc" } }),
    prisma.resourceStock.findMany({ where: { userId: user.id } }),
  ]);
  const owned = (key: string) => stock.find((s) => s.key === key)?.quantity ?? 0;
  const weapons: ForgeWeapon[] = EMPERORS.map((e) => {
    const w = WEAPONS.find((x) => x.key === e.weapon)!;
    return {
      key: w.key, name: w.name, passive: w.passive, accent: ACCENT[w.key] ?? "#d9b650",
      needs: [
        { key: e.resource, name: e.resourceName, have: owned(e.resource), need: EMPEROR_RECIPE.legendary },
        { key: DUNGEON_RESOURCE, name: RESOURCE_NAMES[DUNGEON_RESOURCE], have: owned(DUNGEON_RESOURCE), need: EMPEROR_RECIPE.dungeon },
      ],
      where: `${e.resourceName} : victoire sur ${e.name} au Défi des empereurs, 1 par jour. ${RESOURCE_NAMES[DUNGEON_RESOURCE]} : niveau 10 du donjon One Piece, 10 % par victoire.`,
    };
  });
  return <ForgeCarousel weapons={weapons} cards={cards.map((c) => ({
    id: c.id, label: `${c.character.name} · #${c.serial}`, busy: c.inAuction || c.inExpedition,
    weaponName: c.weaponKey ? (WEAPONS.find((w) => w.key === c.weaponKey)?.name ?? c.weaponKey) : null,
  }))} />;
}
