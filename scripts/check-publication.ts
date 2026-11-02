import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { publishProduction, requireGreenCI, type Git, type Request } from "./publish-production";

const sha = "a".repeat(40);
const old = "b".repeat(40);
const green: { id: number; head_sha: string; head_branch: string; event: string; status: string; conclusion: string | null; html_url: string } = { id: 1, head_sha: sha, head_branch: "main", event: "push", status: "completed", conclusion: "success", html_url: "https://github.com/JacX07/anime_master/actions/runs/1" };
const job = { name: "Checks", head_sha: sha, status: "completed", conclusion: "success" };
const api = (run = green, jobs = [job]): Request => async (path) => path.includes("/jobs?") ? { jobs } : { workflow_runs: [run] };

async function main() {
for (const conclusion of ["failure", "cancelled", "skipped", "neutral", "timed_out", null]) {
  await assert.rejects(requireGreenCI(sha, api({ ...green, conclusion })));
}
for (const change of [{ head_sha: old }, { head_branch: "migration/postgres" }, { event: "pull_request" }, { status: "in_progress" }]) {
  await assert.rejects(requireGreenCI(sha, api({ ...green, ...change })));
}
await assert.rejects(requireGreenCI(sha, async () => ({ workflow_runs: [] })));
await assert.rejects(requireGreenCI(sha, async () => { throw new Error("HTTP 403"); }));
await assert.rejects(requireGreenCI(sha, api(green, [])));
await assert.rejects(requireGreenCI(sha, api(green, [job, job])));
for (const change of [{ conclusion: "skipped" }, { head_sha: old }, { status: "queued" }]) {
  await assert.rejects(requireGreenCI(sha, api(green, [{ ...job, ...change }])));
}
assert.equal(await requireGreenCI(sha, api()), green.html_url);

async function scenario(options: { apply?: boolean; moved?: boolean; divergent?: boolean; missingProduction?: boolean; failed?: boolean; pushFails?: boolean; wrongRemote?: boolean } = {}) {
  const calls: string[][] = [];
  let reads = 0;
  const runGit: Git = (...args) => {
    calls.push(args);
    if (args[0] === "remote") return options.wrongRemote ? "git@github.com:other/repo.git" : "git@github.com:JacX07/anime_master.git";
    if (args[0] === "ls-remote") {
      reads++;
      return `${options.moved && reads > 1 ? old : sha}\trefs/heads/main`
        + (options.missingProduction ? "" : `\n${old}\trefs/heads/production`);
    }
    if (args[0] === "merge-base" && options.divergent) throw new Error("production diverge");
    if (args[0] === "push" && options.pushFails) throw new Error("push refusé");
    return "";
  };
  const work = () => publishProduction(options.apply ?? false, runGit, options.failed ? api({ ...green, conclusion: "failure" }) : api());
  if (options.moved || options.divergent || options.failed || options.pushFails || options.wrongRemote) await assert.rejects(work);
  else await work();
  return calls.filter((args) => args[0] === "push");
}
assert.equal((await scenario()).length, 0);
for (const options of [{ moved: true }, { divergent: true }, { failed: true }, { wrongRemote: true }]) {
  assert.equal((await scenario({ ...options, apply: true })).length, 0);
}
assert.deepEqual(await scenario({ apply: true }), [["push", "origin", `${sha}:refs/heads/production`]]);
assert.equal((await scenario({ apply: true, missingProduction: true })).length, 1);
await scenario({ apply: true, pushFails: true });
// Vérifier aussi les refspecs et le refus des historiques divergents avec un vrai Git local.
const directory = mkdtempSync(join(tmpdir(), "anime-publication-"));
try {
  const local: Git = (...args) => execFileSync("git", args, {
    cwd: directory, encoding: "utf8", timeout: 15_000, stdio: ["ignore", "pipe", "pipe"],
  }).trim();
  local("init", "--bare", "remote.git");
  local("init", "-b", "main", "work");
  const work: Git = (...args) => local("-C", "work", ...args);
  work("config", "user.name", "Publication test");
  work("config", "user.email", "test@example.invalid");
  work("remote", "add", "origin", join(directory, "remote.git"));
  work("commit", "--allow-empty", "-m", "Initial");
  work("push", "origin", "main:main", "main:production");
  work("commit", "--allow-empty", "-m", "Candidate");
  work("push", "origin", "main");
  const candidate = work("rev-parse", "HEAD");
  const before = work("ls-remote", "origin", "refs/heads/production");
  const adapter: Git = (...args) => args[0] === "remote" ? "git@github.com:JacX07/anime_master.git" : work(...args);
  const realApi = api({ ...green, head_sha: candidate }, [{ ...job, head_sha: candidate }]);
  await publishProduction(false, adapter, realApi);
  assert.equal(work("ls-remote", "origin", "refs/heads/production"), before);
  await publishProduction(true, adapter, realApi);
  assert.equal(work("ls-remote", "origin", "refs/heads/production"), `${candidate}\trefs/heads/production`);
  work("checkout", "-b", "divergent", "HEAD~1");
  work("commit", "--allow-empty", "-m", "Divergence");
  work("push", "origin", "HEAD:production", "--force"); // Dépôt jetable uniquement.
  const divergent = work("ls-remote", "origin", "refs/heads/production");
  await assert.rejects(publishProduction(true, adapter, realApi));
  assert.equal(work("ls-remote", "origin", "refs/heads/production"), divergent);
} finally {
  rmSync(directory, { recursive: true, force: true });
}
console.log("Publication : refus CI, aperçu, push réel sur dépôt jetable et divergence validés.");

}
main().catch((error) => { console.error(error); process.exitCode = 1; });
