// Prépare les images publiques ; aucune connexion à une base ni publication du site.
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { ART_DIR, imageMime, validArtKey, type ArtRecord } from "../src/lib/art-files";

async function main() {
  const source = process.argv[2] ?? ART_DIR;
  const images = join(process.cwd(), "public", "illustrations");
  const manifest: Record<string, string> = {};
  for (const file of await readdir(join(process.cwd(), "public", "items"))) {
    if (/^[a-z0-9]+(?:-[a-z0-9]+)*\.svg$/.test(file)) manifest[`resource-${file.slice(0, -4)}`] = `/items/${file}`;
  }
  // Valider le lot complet avant de produire des fichiers.
  const pending = [];
  for (const file of (await readdir(source)).sort()) {
    if (!file.endsWith(".json")) continue;
    const key = file.slice(0, -5);
    if (!validArtKey(key)) continue;
    const record = JSON.parse(await readFile(join(source, file), "utf8")) as ArtRecord;
    if (typeof record.file !== "string" || basename(record.file) !== record.file || /[\\/]/.test(record.file)) throw new Error(`Nom de fichier invalide : ${key}`);
    const bytes = await readFile(join(source, record.file));
    const mime = imageMime(bytes);
    if (!mime || mime !== record.mime || bytes.length > 5 * 1024 * 1024) throw new Error(`Image invalide : ${key}`);
    const extension = mime === "image/png" ? "png" : mime === "image/jpeg" ? "jpg" : "webp";
    const name = `${createHash("sha256").update(bytes).digest("hex")}.${extension}`;
    pending.push({ name, bytes });
    manifest[key] = `/illustrations/${name}`;
  }
  await mkdir(images, { recursive: true });
  for (const { name, bytes } of pending) await writeFile(join(images, name), bytes);
  await mkdir(join(process.cwd(), "src", "data"), { recursive: true });
  await writeFile(join(process.cwd(), "src", "data", "published-illustrations.json"), JSON.stringify(manifest, null, 2) + "\n");
  console.log(`${pending.length} illustrations exportées ; ${Object.keys(manifest).length} références publiques. Relire et committer les fichiers pour les inclure dans une future version.`);
}
main().catch(() => { console.error("Export annulé : vérifier les métadonnées et fichiers locaux."); process.exitCode = 1; });
