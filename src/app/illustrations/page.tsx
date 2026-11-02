import { Suspense } from "react";
import { notFound } from "next/navigation";
import { canEditArt } from "@/lib/art-editor";
import { readArt } from "@/lib/art-files";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { RESOURCE_NAMES } from "@/lib/story";
import { WEAPONS } from "@/lib/weapons";
import { Editor, type ArtItem } from "./Editor";

export const metadata = { title: "Illustrations — Anime Masters", robots: { index: false } };
export default function IllustrationsPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <main className="vt art-page"><div className="vt-inner">
    <header className="art-page-heading"><h1 className="vt-title">Illustrations</h1><p className="vt-sub">Donne à chaque carte son illustration. Sélectionne un élément, puis importe ton image.</p></header>
    <Suspense fallback={<p>Chargement des illustrations…</p>}><Catalog /></Suspense>
  </div></main>;
}
async function Catalog() {
  await requireUser();
  if (!await canEditArt()) notFound();
  const [characters, stock] = await Promise.all([
    prisma.character.findMany({ where: { disabled: false }, select: { id: true, name: true, imageUrl: true, rarity: true, mainMedia: { select: { titleRomaji: true, titleEnglish: true } } }, orderBy: [{ favourites: "desc" }, { id: "asc" }] }),
    prisma.resourceStock.findMany({ distinct: ["key"], select: { key: true } }),
  ]);
  const names = { ...RESOURCE_NAMES, ...Object.fromEntries(WEAPONS.map((w) => [w.key, w.name])), ryo: "Ryō", cristal: "Cristal", "cristal-special": "Cristal spécial" };
  const resources = [...new Set([...Object.keys(names), ...stock.map((r) => r.key)])];
  const items: ArtItem[] = characters.map((c) => ({ key: `character-${c.id}`, name: c.name, group: "characters", detail: `${c.rarity} · ${c.mainMedia?.titleEnglish ?? c.mainMedia?.titleRomaji ?? ""}`, rarity: c.rarity, url: c.imageUrl, custom: c.imageUrl.startsWith("/api/illustrations/") }));
  for (const key of resources) {
    const record = await readArt(`resource-${key}`);
    items.push({ key: `resource-${key}`, name: names[key as keyof typeof names] ?? key, group: "resources", detail: key, url: record ? `/api/illustrations/resource-${key}?v=${record.file}` : null, custom: Boolean(record) });
  }
  return <Editor initialItems={items} />;
}
