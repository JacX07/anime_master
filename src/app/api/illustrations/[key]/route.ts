import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { ART_DIR, imageMime, readArt, saveArt, validArtKey } from "@/lib/art-files";
import { canEditArt } from "@/lib/art-editor";
import { prisma } from "@/lib/db";

type Context = { params: Promise<{ key: string }> };

export async function GET(_request: Request, { params }: Context) {
  const { key } = await params;
  if (!validArtKey(key)) return new Response(null, { status: 404 });
  const record = await readArt(key);
  if (!record) return new Response(null, { status: 404 });
  const bytes = await readFile(join(ART_DIR, record.file));
  return new Response(new Uint8Array(bytes), { headers: {
    "Content-Type": record.mime, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'; sandbox",
  } });
}

async function mutate(request: Request, context: Context, reset: boolean) {
  if (!await canEditArt()) return Response.json({ error: "Édition réservée au compte éditeur ou au développement local connecté." }, { status: 403 });
  // Le serveur peut écouter sur 0.0.0.0 alors que le navigateur utilise localhost.
  let sameOrigin = false;
  try {
    const origin = new URL(request.headers.get("origin") ?? "");
    sameOrigin = ["http:", "https:"].includes(origin.protocol) && origin.host === request.headers.get("host");
  } catch { /* Origine absente ou invalide. */ }
  if (!sameOrigin) return Response.json({ error: "Origine refusée." }, { status: 403 });
  const { key } = await context.params;
  if (!validArtKey(key)) return Response.json({ error: "Identifiant invalide." }, { status: 400 });
  const id = key.startsWith("character-") ? Number(key.slice(10)) : null;
  if (id !== null && (!Number.isSafeInteger(id) || id > 2147483647)) return Response.json({ error: "Identifiant invalide." }, { status: 400 });
  const character = id ? await prisma.character.findUnique({ where: { id }, select: { imageUrl: true } }) : null;
  if (id && !character) return Response.json({ error: "Personnage introuvable." }, { status: 404 });
  await mkdir(ART_DIR, { recursive: true });
  const lock = join(ART_DIR, `${key}.lock`);
  try { await mkdir(lock); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") return Response.json({ error: "Modification en cours, réessaie." }, { status: 409 });
    throw error;
  }
  try {
    const previous = await readArt(key);
    if (reset) {
      if (id && previous?.original) await prisma.character.update({ where: { id }, data: { imageUrl: previous.original } });
      await rm(join(ART_DIR, `${key}.json`), { force: true });
      if (previous) await rm(join(ART_DIR, previous.file), { force: true });
      return Response.json({ url: previous?.original ?? null });
    }
    if (Number(request.headers.get("content-length")) > 6 * 1024 * 1024) return Response.json({ error: "Image trop volumineuse (5 Mo maximum)." }, { status: 413 });
    // Borne aussi les requêtes sans Content-Length avant de décoder le multipart.
    const reader = request.body?.getReader();
    if (!reader) return Response.json({ error: "Image manquante." }, { status: 400 });
    const chunks: Uint8Array[] = [];
    let length = 0;
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      length += chunk.value.byteLength;
      if (length > 6 * 1024 * 1024) {
        await reader.cancel();
        return Response.json({ error: "Image trop volumineuse (5 Mo maximum)." }, { status: 413 });
      }
      chunks.push(chunk.value);
    }
    let form: FormData;
    try { form = await new Request(request.url, { method: "POST", headers: request.headers, body: Buffer.concat(chunks) }).formData(); }
    catch { return Response.json({ error: "Envoi invalide. Réessaie avec une image." }, { status: 400 }); }
    const file = form.get("image");
    if (!(file instanceof File) || !file.size || file.size > 5 * 1024 * 1024) return Response.json({ error: "Choisis une image de 5 Mo maximum." }, { status: 400 });
    const bytes = Buffer.from(await file.arrayBuffer());
    const mime = imageMime(bytes);
    if (!mime) return Response.json({ error: "Formats acceptés : PNG, JPEG et WebP." }, { status: 400 });
    const name = crypto.randomUUID();
    await writeFile(join(ART_DIR, name), bytes);
    const record = { file: name, mime, original: previous?.original ?? character?.imageUrl };
    await saveArt(key, record);
    const url = `/api/illustrations/${key}?v=${name}`;
    if (id) await prisma.character.update({ where: { id }, data: { imageUrl: url } });
    if (previous) await rm(join(ART_DIR, previous.file), { force: true });
    return Response.json({ url });
  } finally { await rm(lock, { recursive: true, force: true }); }
}
export const POST = (request: Request, context: Context) => mutate(request, context, false);
export const DELETE = (request: Request, context: Context) => mutate(request, context, true);
