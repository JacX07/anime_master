"use server";

import { getAlbum, parseAlbumFilters, type AlbumFilters } from "@/lib/album";
import { requireUser } from "@/lib/session";
import { CardItem, World } from "./items";

/** Page suivante de l'album (défilement continu) : les filtres sont relus comme ceux d'une URL, jamais crus sur parole. */
export async function loadAlbumMore(filters: AlbumFilters, page: number) {
  const user = await requireUser();
  const f = parseAlbumFilters({ ...filters, rarity: filters.rarity ?? "", type: filters.type ?? "", page: String(Math.max(1, Math.floor(page))) });
  const album = await getAlbum(user.id, f);
  if (album.worlds) return album.worlds.bands.map((w) => <World key={w.key} world={w} filters={f} />);
  return album.entries.map((e) => <CardItem key={e.id} entry={e} />);
}
