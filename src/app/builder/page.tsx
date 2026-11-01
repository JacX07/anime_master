import type { Metadata } from "next";
import { Suspense } from "react";
import { requireBuilder, listOverrides } from "@/lib/builder";
import { cardRows } from "@/lib/spell-sim";
import { builderEntries } from "@/lib/builder-catalog";
import { SpellBuilder, type BuilderChar } from "./SpellBuilder";
import "./builder.css";
import { speedOf } from "@/lib/speed";

export const metadata: Metadata = { title: "Spell Builder — Anime Masters", robots: { index: false } };

async function Loaded() {
  await requireBuilder();
  const [rows, overrides] = await Promise.all([cardRows(), listOverrides()]);
  const over = new Map(overrides.map((o) => [o.characterId, o]));
  const chars: BuilderChar[] = rows.map((r) => {
    const o = over.get(r.id);
    return {
      id: r.id, name: r.name, imageUrl: r.imageUrl, rarity: r.rarity as "SSR" | "UR", type: r.type, attack: r.attack, defense: r.defense, speed: speedOf(r.id),
      spells: builderEntries(r.id, r.rarity, r.type, o?.spell),
    };
  });
  return <SpellBuilder chars={chars} />;
}

export default function BuilderPage() {
  return (
    <main className="vt">
      <div className="vt-inner">
        <header className="pg-head">
          <h1 className="vt-title">Spell Builder</h1>
          <p className="vt-sub">Les quatre sorts de chaque SSR et UR : attaque de base, secondaire, tertiaire et ultime. Consulte leurs effets, modifie un emplacement, puis simule-le. Ces personnages n&apos;ont pas de sort affilié. Les brouillons restent dans le builder jusqu&apos;à leur intégration dans le jeu.</p>
        </header>
        <Suspense fallback={<p className="vt-muted">Chargement…</p>}>
          <Loaded />
        </Suspense>
      </div>
    </main>
  );
}
