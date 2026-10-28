import { getAlbum, parseAlbumFilters } from "@/lib/album";
import { getSessionUser } from "@/lib/session";

/** Page suivante de l'album pour le défilement continu (JSON : une route plutôt qu'une action serveur, qui faisait remonter la page en haut). */
export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const filters = parseAlbumFilters(Object.fromEntries(new URL(req.url).searchParams));
  const album = await getAlbum(user.id, filters);
  return Response.json(album.worlds ? { bands: album.worlds.bands } : { entries: album.entries });
}
