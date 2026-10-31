import type { Metadata } from "next";
import { Suspense } from "react";
import { requireBuilder, listOverrides } from "@/lib/builder";
import { cardRows } from "@/lib/spell-sim";
import { spellOf, type CharacterSpell } from "@/lib/spells";
import { SpellBuilder, type BuilderChar } from "./SpellBuilder";
import "./builder.css";

export const metadata: Metadata = { title: "Spell Builder — Anime Masters", robots: { index: false } };

async function Loaded() {
  await requireBuilder();
  const [rows, overrides] = await Promise.all([cardRows(), listOverrides()]);
  const over = new Map(overrides.map((o) => [o.characterId, o]));
  const chars: BuilderChar[] = rows.map((r) => {
    const o = over.get(r.id);
    return {
      id: r.id, name: r.name, imageUrl: r.imageUrl, rarity: r.rarity as "SSR" | "UR", type: r.type, attack: r.attack, defense: r.defense,
      base: spellOf(r.id, r.rarity, r.type) as CharacterSpell,
      custom: o ? (o.spell as unknown as CharacterSpell) : null,
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
          <p className="vt-sub">Écris le sort d&apos;un SSR ou UR, puis simule-le pour vérifier qu&apos;il ne casse pas l&apos;équilibre. Dev seulement : le jeu lit toujours spells.ts tant que tu n&apos;exportes pas.</p>
        </header>
        <Suspense fallback={<p className="vt-muted">Chargement…</p>}>
          <Loaded />
        </Suspense>
      </div>
    </main>
  );
}
