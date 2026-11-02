import { access, readdir } from "node:fs/promises";
import { join } from "node:path";
import { ART_DIR, readArt, validArtKey } from "@/lib/art-files";
async function files(directory: string) {
  try { return await readdir(directory); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}
export async function GET() {
  const sources: Record<string, string> = {};
  const [items, custom] = await Promise.all([files(join(process.cwd(), "public", "items")), files(ART_DIR)]);
  for (const file of items) {
    if (/^[a-z0-9]+(?:-[a-z0-9]+)*\.svg$/.test(file)) sources[file.slice(0, -4)] = `/items/${file}`;
  }
  await Promise.all(custom.filter((file) => file.startsWith("resource-") && file.endsWith(".json")).map(async (file) => {
    const key = file.slice(0, -5);
    if (!validArtKey(key)) return;
    const record = await readArt(key);
    if (!record) return;
    try { await access(join(ART_DIR, record.file)); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
      throw error;
    }
    sources[key.slice(9)] = `/api/illustrations/${key}?v=${encodeURIComponent(record.file)}`;
  }));
  return Response.json(sources, { headers: { "Cache-Control": "no-store" } });
}
