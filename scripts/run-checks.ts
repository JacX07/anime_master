import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { closeSync, mkdtempSync, openSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { client } from "./content-sync";

const ROOT = path.resolve(import.meta.dirname, "..");
type Result = { name: string; code: number; seconds: number; log: string };

export function discoverChecks(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).filter((file) => file.isFile() && /^check-.*\.ts$/.test(file.name)).map((file) => file.name).sort();
}

export async function runStep(name: string, args: string[], env: NodeJS.ProcessEnv, folder: string, seconds = 60, signal?: AbortSignal): Promise<Result> {
  const log = path.join(folder, `${name.replaceAll(/[^a-zA-Z0-9_.-]/g, "_")}.log`);
  const fd = openSync(log, "w");
  const start = Date.now();
  let code: number;
  try {
    code = await new Promise<number>((resolve) => {
      const child = spawn("timeout", ["--kill-after=5s", `${seconds}s`, process.execPath, ...args], {
        cwd: ROOT, env, stdio: ["ignore", fd, fd],
      });
      const abort = () => { child.kill("SIGTERM"); };
      signal?.addEventListener("abort", abort, { once: true });
      if (signal?.aborted) abort();
      child.once("error", () => resolve(1));
      child.once("close", (status, killed) => {
        signal?.removeEventListener("abort", abort);
        resolve(status ?? (killed === "SIGKILL" ? 137 : 143));
      });
    });
  } finally { closeSync(fd); }
  const result = { name, code, seconds: Math.round((Date.now() - start) / 100) / 10, log };
  console.log(`${code === 0 ? "OK" : "ÉCHEC"} ${name} (${result.seconds}s, code ${code}${code === 124 ? ", délai dépassé" : code === 137 ? ", arrêt forcé" : ""})`);
  return result;
}

async function main() {
  if (Number(process.versions.node.split(".")[0]) !== 24) throw new Error("Utiliser Node 24 : nvm use 24");
  if (process.env.NODE_ENV === "production") throw new Error("check est réservé aux tests");
  const adminUrl = process.env.CHECK_DATABASE_URL;
  if (!adminUrl) throw new Error("CHECK_DATABASE_URL obligatoire : connexion directe à un serveur Postgres de test autorisant CREATE DATABASE. DATABASE_URL n'est jamais utilisée.");
  const database = `am_check_${randomUUID().replaceAll("-", "")}`;
  const target = new URL(adminUrl);
  target.pathname = `/${database}`;
  const folder = mkdtempSync(path.join(tmpdir(), "anime-check-"));
  const env: NodeJS.ProcessEnv = {
    ...process.env, NODE_ENV: "test", DATABASE_URL: target.toString(), DIRECT_URL: target.toString(),
    CHECK_RUN_PREFIX: database, DOTENV_CONFIG_PATH: "/dev/null", DOTENV_CONFIG_OVERRIDE: "false",
    BETTER_AUTH_URL: "http://localhost:3000", BETTER_AUTH_SECRET: "anime-masters-disposable-check-database-only",
    SOURCE_DATABASE_URL: "", TARGET_DATABASE_URL: "",
  };
  const controller = new AbortController();
  let interrupted = 0;
  const onInterrupt = () => { interrupted = 130; controller.abort(); };
  const onTerminate = () => { interrupted = 143; controller.abort(); };
  process.once("SIGINT", onInterrupt);
  process.once("SIGTERM", onTerminate);
  const results: Result[] = [];
  const problems: string[] = [];
  const checks = discoverChecks(path.join(ROOT, "scripts"));
  const step = async (name: string, args: string[]) => {
    if (controller.signal.aborted) throw new Error("Suite interrompue");
    const result = await runStep(name, args, env, folder, 60, controller.signal);
    results.push(result);
    return result.code === 0;
  };
  const admin = client(adminUrl);
  let skipped = 0;
  let executedChecks = 0;
  console.log(`Base jetable : ${database}\nJournaux : ${folder}\n${checks.length} checks découverts automatiquement.`);
  try {
    await step("lint", ["node_modules/eslint/bin/eslint.js", "."]);
    await step("types-routes", ["node_modules/next/dist/bin/next", "typegen"]);
    await step("typescript", ["node_modules/typescript/bin/tsc", "--noEmit", "--incremental", "false"]);
    await admin.$executeRawUnsafe("SET statement_timeout = '15s'");
    await admin.$executeRawUnsafe(`CREATE DATABASE "${database}"`);
    const migrated = await step("migrations", ["node_modules/prisma/build/index.js", "migrate", "deploy"]);
    const seeded = migrated && await step("catalogue-test", ["--import", "tsx", "scripts/seed-checks.ts"]);
    if (seeded) {
      for (const name of checks) {
        await step(name, ["--import", "tsx", `scripts/${name}`]);
        executedChecks++;
      }
    } else {
      skipped = checks.length;
      console.error(`${skipped} checks non exécutés : préparation de la base en échec.`);
    }
  } catch {
    problems.push("Suite interrompue ou préparation Postgres impossible. Vérifier le serveur de test et ses permissions.");
    console.error(problems.at(-1));
    process.exitCode = interrupted || 1;
  } finally {
    skipped = checks.length - executedChecks;
    try {
      // Inclut les bases secondaires de check-content-sync si ce check a dépassé son délai.
      const databases = await admin.$queryRawUnsafe<{ datname: string }[]>(
        "SELECT datname FROM pg_database WHERE left(datname, length($1)) = $1", database,
      );
      for (const { datname } of databases) {
        if (!/^am_check_[a-f0-9]{32}(?:_sync_[a-f0-9_]+)?$/.test(datname)) throw new Error("Nom de base temporaire inattendu");
        await admin.$executeRawUnsafe(`DROP DATABASE "${datname}" WITH (FORCE)`);
      }
      console.log("Bases jetables supprimées.");
    } catch {
      problems.push(`Nettoyage en échec : supprimer uniquement les bases portant le préfixe ${database}.`);
      console.error(problems.at(-1));
      process.exitCode = 1;
    } finally { await admin.$disconnect(); }
    process.removeListener("SIGINT", onInterrupt);
    process.removeListener("SIGTERM", onTerminate);
    const failures = results.filter((result) => result.code !== 0);
    console.log(`\nRésumé : ${results.length - failures.length}/${results.length} étapes réussies, ${failures.length} échec(s), ${skipped} check(s) non exécuté(s), ${problems.length} problème(s) d'exécution/nettoyage.`);
    for (const failure of failures) console.log(`- ${failure.name} : code ${failure.code} — ${failure.log}`);
    writeFileSync(path.join(folder, "summary.json"), JSON.stringify({ database, results, skipped, interrupted, problems }, null, 2));
    console.log(`Rapport : ${folder}/summary.json`);
    if (failures.length || skipped || interrupted) process.exitCode = interrupted || 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    // Ne pas afficher les erreurs de connecteur, qui peuvent contenir une URL secrète.
    console.error(error instanceof Error && !error.name.startsWith("Prisma") ? error.message : "Impossible de lancer les checks");
    process.exitCode = 1;
  });
}
