// Fichiers locaux conservés dans data/, hors du dépôt Git.
import { readFile, mkdir, writeFile, rename } from "node:fs/promises";
import { join } from "node:path";

export const ART_DIR = join(process.cwd(), "data", "illustrations");
export type ArtRecord = { original?: string; file: string; mime: string };
export const validArtKey = (key: string) => /^(character-[1-9]\d*|resource-[a-z0-9]+(?:-[a-z0-9]+)*)$/.test(key) && key.length < 160;
export async function readArt(key: string): Promise<ArtRecord | null> {
  try { return JSON.parse(await readFile(join(ART_DIR, `${key}.json`), "utf8")); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return null; throw error; }
}
export async function saveArt(key: string, record: ArtRecord) {
  await mkdir(ART_DIR, { recursive: true });
  const temp = join(ART_DIR, `${key}.${crypto.randomUUID()}.tmp`);
  await writeFile(temp, JSON.stringify(record));
  await rename(temp, join(ART_DIR, `${key}.json`));
}
export function imageMime(bytes: Buffer) {
  if (bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return "image/png";
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return "image/jpeg";
  if (bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  return null;
}
