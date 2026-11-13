import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseChangelog, needsReleaseNotice } from "../src/lib/changelog";
import { acknowledgeRelease } from "../src/lib/changelog-read";
import { prisma } from "../src/lib/db";

async function main() {
  const releases = parseChangelog(readFileSync("CHANGELOG.md", "utf8"));
  const versions = releases.map((r) => r.version);
  for (const version of ["v0.3.0", "v0.2.2", "v0.2.1", "v0.2.0", "v0.1.0"]) assert(versions.includes(version), `Historique ${version} conservé`);
  assert.equal(new Set(versions).size, versions.length);
  assert(releases.every((r) => r.sections.length > 0));
  assert(releases.every((r) => r.sections.every((s) => !/^(Migrations|Technique et exploitation)/i.test(s.title))));
  const sample = parseChangelog("# Notes\r\n## À venir\r\nsecret\r\n## v1.0.0 — Sortie\r\nIntro\r\nsur deux lignes\r\n\r\n### Nouveautés\r\n- **Bonjour**\r\n  - `<script>`\r\n### Migrations\r\nNe pas exposer.\r\n## v0.9.0 — Ancienne\r\n### Technique et exploitation\r\nNe pas exposer non plus.");
  assert.equal(sample.length, 2);
  assert.deepEqual(sample[0].sections[0].blocks, [{ kind: "paragraph", text: "Intro sur deux lignes" }]);
  assert.deepEqual(sample[0].sections[1].blocks, [{ kind: "list", items: ["**Bonjour**", "`<script>`"] }]);
  assert.equal(sample[1].sections.length, 0);
  assert.throws(() => parseChangelog("## v1.0.0 — Une\n## v1.0.0 — Deux"), /dupliquée/);
  assert.deepEqual(parseChangelog(""), []);
  assert(needsReleaseNotice(versions, null));
  assert(needsReleaseNotice(versions, versions.at(-1)!));
  assert(!needsReleaseNotice(versions, versions[0]));
  assert(!needsReleaseNotice(versions, "v999.0.0"));
  assert(!needsReleaseNotice([], null));

  const tag = `changelog-${Date.now()}`;
  const ids = [tag, `${tag}-other`];
  try {
    for (const id of ids) await prisma.user.create({ data: { id, name: id, username: id, email: `${id}@example.test` } });
    await acknowledgeRelease(ids[0], versions.slice(1));
    assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: ids[0] } })).lastReadChangelogVersion, versions[1]);
    await acknowledgeRelease(ids[0], versions);
    await acknowledgeRelease(ids[0], versions);
    await acknowledgeRelease(ids[0], versions.slice(1));
    assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: ids[0] } })).lastReadChangelogVersion, versions[0], "Lecture persistante, idempotente et sans recul par un ancien onglet");
    assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: ids[1] } })).lastReadChangelogVersion, null, "Aucun autre compte acquitté");
  } finally { await prisma.user.deleteMany({ where: { id: { in: ids } } }); }
  console.log("Changelog : historique complet, filtre technique, parsing, annonce et lecture par compte conformes.");
}
main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
