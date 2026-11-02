// Vérifie les formats, les chemins et le stockage dans un dossier temporaire.
import assert from 'node:assert/strict';
import { mkdtemp, rm, mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { publishedArt, publishedArtUrl, publishedResources } from '../src/lib/published-art';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
async function main() {
const temp = await mkdtemp(join(tmpdir(), 'anime-art-'));
const previous = process.cwd();
try {
  process.chdir(temp);
  const { validArtKey, imageMime, readArt, saveArt } = await import('../src/lib/art-files');
  for (const key of ['character-17', 'resource-coeur-de-breche']) assert.ok(validArtKey(key));
  for (const key of ['../secret', 'resource-../secret', 'character-0', 'character-1/2']) assert.equal(validArtKey(key), false);
  assert.equal(imageMime(Buffer.from('<svg onload="alert(1)">')), null);
  assert.equal(imageMime(Buffer.from([137,80,78,71,13,10,26,10])), 'image/png');
  assert.equal(imageMime(Buffer.from([255,216,255])), 'image/jpeg');
  assert.equal(imageMime(Buffer.from('RIFF0000WEBP')), 'image/webp');
  assert.equal(await readArt('character-17'), null);
  const record = { original: 'https://example.org/base.jpg', file: 'example', mime: 'image/png' };
  await saveArt('character-17', record);
  assert.deepEqual(await readArt('character-17'), record);
  await saveArt('character-17', { ...record, file: 'replacement' });
  assert.equal((await readArt('character-17'))?.file, 'replacement');
  assert.equal(publishedArtUrl("../secret"), null);
  assert.equal(publishedArtUrl("toString"), null);
  assert.equal(publishedArtUrl("character-0"), null);
  const resources = publishedResources();
  assert.ok(Object.keys(resources).length > 0);
  for (const [key, url] of Object.entries(publishedArt)) {
    assert.ok(validArtKey(key));
    assert.ok(url && /^\/(illustrations\/[a-f0-9]{64}\.(png|jpg|webp)|items\/[a-z0-9-]+\.svg)$/.test(url));
    const bytes = await readFile(join(previous, "public", url!));
    if (url!.startsWith("/illustrations/")) {
      assert.ok(imageMime(bytes));
      assert.ok(url!.includes(createHash("sha256").update(bytes).digest("hex")));
    }
    if (key.startsWith("resource-")) assert.equal(resources[key.slice(9)], url);
  }
  // Un export rejoué garde les mêmes URLs ; une source invalide préserve le manifeste publié.
  await mkdir(join(temp, "public", "items"), { recursive: true });
  await mkdir(join(temp, "source"));
  await writeFile(join(temp, "source", "image"), Buffer.from([137,80,78,71,13,10,26,10]));
  await writeFile(join(temp, "source", "resource-test.json"), JSON.stringify({ file: "image", mime: "image/png" }));
  const exportArt = () => spawnSync(process.execPath, [join(previous, "node_modules/tsx/dist/cli.mjs"), join(previous, "scripts/export-illustrations.ts"), join(temp, "source")], { cwd: temp, timeout: 15_000, encoding: "utf8" });
  assert.equal(exportArt().status, 0);
  const manifestPath = join(temp, "src", "data", "published-illustrations.json");
  const first = await readFile(manifestPath, "utf8");
  assert.equal(exportArt().status, 0);
  assert.equal(await readFile(manifestPath, "utf8"), first);
  await writeFile(join(temp, "source", "resource-test.json"), JSON.stringify({ file: "../secret", mime: "image/png" }));
  assert.equal(exportArt().status, 1);
  assert.equal(await readFile(manifestPath, "utf8"), first);
  console.log('Formats, stockage local, images publiques, export rejouable et refus des chemins invalides : OK');
} finally { process.chdir(previous); await rm(temp, { recursive: true, force: true }); }

}
main().catch((error) => { console.error(error); process.exitCode = 1; });
