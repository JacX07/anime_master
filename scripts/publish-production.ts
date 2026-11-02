import { execFileSync } from "node:child_process";

type Run = {
  id: number; head_sha: string; head_branch: string; event: string;
  status: string; conclusion: string | null; html_url: string;
};
type Job = { name: string; head_sha: string; status: string; conclusion: string | null };
export type Git = (...args: string[]) => string;
export type Request = (path: string) => Promise<unknown>;
const repository = "JacX07/anime_master";

const git: Git = (...args) => execFileSync("git", args, {
  encoding: "utf8", timeout: 15_000, env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
}).trim();

const request: Request = async (path) => {
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  const response = await fetch(`https://api.github.com/repos/${repository}/${path}`, {
    headers: {
      Accept: "application/vnd.github+json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(
    `API GitHub : HTTP ${response.status}. Pour un dépôt privé, fournir GH_TOKEN avec Actions en lecture.`,
  );
  return response.json();
};

export async function requireGreenCI(sha: string, api: Request) {
  const data = await api(`actions/workflows/ci.yml/runs?branch=main&event=push&head_sha=${sha}&per_page=1`) as { workflow_runs: Run[] };
  const run = data.workflow_runs?.[0];
  if (!run || run.head_sha !== sha || run.head_branch !== "main" || run.event !== "push"
    || run.status !== "completed" || run.conclusion !== "success") {
    throw new Error(`Publication refusée : CI absente ou non verte pour main@${sha}.`);
  }
  const result = await api(`actions/runs/${run.id}/jobs?filter=latest&per_page=100`) as { jobs: Job[] };
  const checks = result.jobs?.filter((job) => job.name === "Checks");
  if (checks?.length !== 1 || checks[0].head_sha !== sha
    || checks[0].status !== "completed" || checks[0].conclusion !== "success") {
    throw new Error("Publication refusée : le job Checks doit avoir réussi (pas ignoré).");
  }
  return run.html_url;
}

export async function publishProduction(apply: boolean, runGit: Git = git, api: Request = request) {
  const remote = runGit("remote", "get-url", "--push", "origin");
  if (!/^git@github\.com:JacX07\/anime_master(?:\.git)?$|^https:\/\/github\.com\/JacX07\/anime_master(?:\.git)?$/.test(remote)) {
    throw new Error("Publication refusée : origin doit pointer vers JacX07/anime_master sur GitHub.");
  }
  runGit("fetch", "--no-tags", "origin");
  const heads = () => runGit("ls-remote", "--heads", "origin", "refs/heads/main", "refs/heads/production");
  const before = heads();
  const ref = (name: string) => before.split("\n").find((line) => line.endsWith(`\trefs/heads/${name}`))?.split("\t")[0];
  const sha = ref("main");
  const production = ref("production");
  if (!sha || !/^[a-f0-9]{40}$/.test(sha)) throw new Error("Branche main distante absente ou invalide.");
  if (production) runGit("merge-base", "--is-ancestor", production, sha);
  const url = await requireGreenCI(sha, api);
  if (heads() !== before) throw new Error("Les branches distantes ont changé : relancer la commande.");
  console.log(`CI verte : ${url}\nPublication : ${production ?? "nouvelle branche"} → ${sha}`);
  if (!apply) {
    console.log("Aperçu seulement. Pour publier : npm run production:publish -- --apply");
    return;
  }
  // shortcut: contrôle local contournable par un push direct ; utiliser GitHub Pro pour une protection serveur privée.
  runGit("push", "origin", `${sha}:refs/heads/production`);
  console.log(`Production publiée : ${sha}`);
}

if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.some((arg) => arg !== "--apply") || args.length > 1) {
    console.error("Usage : npm run production:publish -- [--apply]");
    process.exitCode = 1;
  } else {
    publishProduction(args.includes("--apply")).catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : "Échec de publication.");
      process.exitCode = 1;
    });
  }
}
