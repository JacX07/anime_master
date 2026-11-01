import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SceneBody } from "@/components/SceneBody";
import { seriesTitle } from "@/lib/album";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { URGallery } from "./URGallery";

export const metadata: Metadata = { title: "Galerie UR — Anime Masters" };

export default function URGalleryPage() {
  return (
    <main className="vt">
      <SceneBody night scroll />
      <div className="vt-inner">
        <header>
          <Link href="/album" className="vt-chip mb-4">Retour à l’album</Link>
          <h1 className="vt-title">Galerie UR</h1>
          <p className="vt-sub">Toutes les cartes UR, même celles que tu ne possèdes pas. Clique sur une carte pour voir son illustration entière.</p>
        </header>
        <Suspense fallback={<p className="vt-muted">Chargement des illustrations…</p>}>
          <Illustrations />
        </Suspense>
      </div>
    </main>
  );
}

async function Illustrations() {
  await requireUser();
  const characters = await prisma.character.findMany({
    where: { rarity: "UR", disabled: false },
    orderBy: [{ favourites: "desc" }, { id: "asc" }],
    select: {
      id: true, name: true, imageUrl: true, rarity: true, type: true,
      attack: true, defense: true, power: true,
      mainMedia: { select: { titleRomaji: true, titleEnglish: true } },
    },
  });

  return <URGallery characters={characters.map(({ mainMedia, ...character }) => ({ ...character, characterId: character.id, series: seriesTitle(mainMedia) }))} />;
}
