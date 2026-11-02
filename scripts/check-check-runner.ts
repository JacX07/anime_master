import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { discoverChecks, runStep } from "./run-checks";

async function main() {
  const folder = mkdtempSync(path.join(tmpdir(), "check-runner-test-"));
  try {
    for (const name of ["check-z.ts", "check-a.ts", "check-no.js", "other.ts"]) writeFileSync(path.join(folder, name), "");
    assert.deepEqual(discoverChecks(folder), ["check-a.ts", "check-z.ts"]);
    assert.equal((await runStep("échec attendu", ["-e", "process.exit(7)"], process.env, folder)).code, 7);
    assert.equal((await runStep("délai attendu", ["-e", "setInterval(() => {}, 1000)"], process.env, folder, 0.1)).code, 124);
    assert.equal((await runStep("succès après échecs", ["-e", "process.exit(0)"], process.env, folder)).code, 0);
    const env = { ...process.env, CHECK_DATABASE_URL: "", DATABASE_URL: "postgresql://must-not-be-used.invalid/dev" };
    assert.equal((await runStep("refus sans base de test", ["--import", "tsx", "scripts/run-checks.ts"], env, folder)).code, 1);
    console.log("Découverte exhaustive, code d'échec, délai 124 et poursuite après échec : OK.");
  } finally { rmSync(folder, { recursive: true, force: true }); }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
