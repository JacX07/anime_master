// Vérifie les formats, les chemins et le stockage dans un dossier temporaire.
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
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
  console.log('Validation des formats, identifiants et persistance atomique : OK');
} finally { process.chdir(previous); await rm(temp, { recursive: true, force: true }); }

}
main().catch((error) => { console.error(error); process.exitCode = 1; });
