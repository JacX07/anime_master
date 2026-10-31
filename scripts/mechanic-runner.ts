// Agent du Spell Builder (docs/specs/combat.md §12) : implémente une nouvelle mécanique de sort dans un worktree git séparé,
// sur la branche mecanique/<nom>, puis vérifie les garde-fous. Ne touche jamais à main. Lancé en arrière-plan par /builder.
// Usage : npx tsx scripts/mechanic-runner.ts <jobId>

import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, symlinkSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "../src/lib/db";
import { mechanicPrompt } from "../src/lib/mechanic-prompt";
import type { SimResult } from "../src/lib/spell-sim";

const ROOT = process.cwd();
const MAX_ATTEMPTS = 2;
const TOOLS = "Read Edit Write Glob Grep Bash(npx tsc:*) Bash(npx eslint:*) Bash(npx tsx:*) Bash(npm run check:*) Bash(git diff:*) Bash(git status:*)";

function sh(cwd: string, cmd: string, args: string[]) {
  const r = spawnSync(cmd, args, { cwd, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  return { ok: r.status === 0, out: `${r.stdout ?? ""}${r.stderr ?? ""}` };
}
const tail = (s: string, n = 1500) => (s.length > n ? "…" + s.slice(-n) : s);

function agent(cwd: string, prompt: string): Promise<{ out: string; code: number | null }> {
  return new Promise((resolve) => {
    const p = spawn("claude", ["-p", prompt, "--permission-mode", "acceptEdits", "--allowedTools", TOOLS, "--no-session-persistence"], { cwd, stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    p.stdout.on("data", (d) => (out += d));
    p.stderr.on("data", (d) => (out += d));
    p.on("close", (code) => resolve({ out: out.trim(), code }));
    p.on("error", (e) => resolve({ out: `Impossible de lancer claude : ${e.message}`, code: -1 }));
  });
}

async function main() {
  const job = await prisma.mechanicJob.findUniqueOrThrow({ where: { id: process.argv[2] } });
  const ch = await prisma.character.findUniqueOrThrow({ where: { id: job.characterId }, select: { name: true, rarity: true, type: true } });
  let log = "";
  const say = async (line: string) => {
    log += `[${new Date().toLocaleTimeString("fr-FR")}] ${line}\n`;
    await prisma.mechanicJob.update({ where: { id: job.id }, data: { log } });
  };
  const slug = `m${Date.now().toString(36)}`;
  const branch = `mecanique/${slug}`;
  const wt = join(ROOT, ".claude", "worktrees", slug);
  await prisma.mechanicJob.update({ where: { id: job.id }, data: { status: "running", branch } });

  try {
    mkdirSync(join(ROOT, ".claude", "worktrees"), { recursive: true });
    const add = sh(ROOT, "git", ["worktree", "add", "-b", branch, wt, "HEAD"]);
    if (!add.ok) throw new Error(`git worktree : ${add.out}`);
    symlinkSync(join(ROOT, "node_modules"), join(wt, "node_modules"));
    symlinkSync(join(ROOT, "data"), join(wt, "data"));
    symlinkSync(join(ROOT, ".env"), join(wt, ".env"));
    mkdirSync(join(wt, "src", "generated"), { recursive: true });
    symlinkSync(join(ROOT, "src", "generated", "prisma"), join(wt, "src", "generated", "prisma"));
    await say(`Worktree prêt : ${branch}`);

    const tscLines = (s: string) => new Set(s.split("\n").filter((l) => /error TS/.test(l)));
    const baseTsc = tscLines(sh(wt, "npx", ["tsc", "--noEmit"]).out);
    const baseFp = sh(wt, "npx", ["tsx", "scripts/spell-fingerprint.ts"]);
    if (!baseFp.ok) throw new Error(`Empreinte de référence impossible : ${tail(baseFp.out)}`);
    await say(`Référence : ${baseFp.out.trim()}`);

    let feedback = "";
    let summary = "";
    let failures: string[] = [];
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      await prisma.mechanicJob.update({ where: { id: job.id }, data: { attempts: attempt } });
      await say(`Agent, tentative ${attempt}/${MAX_ATTEMPTS}…`);
      const run = await agent(wt, mechanicPrompt({ wish: job.wish, characterId: job.characterId, name: ch.name, rarity: ch.rarity, slot: "secondary", mode: "worktree", feedback }));
      summary = run.out;
      await say(`Agent terminé (code ${run.code}, ${summary.length} caractères)`);
      // L'agent lui-même a échoué (limite d'usage, CLI absente…) : inutile de réessayer, et surtout pas de faux « prête ».
      if (run.code !== 0) {
        failures = [`L'agent n'a pas pu travailler : ${tail(summary, 400)}`];
        break;
      }

      failures = [];
      if (!existsSync(join(wt, "mechanic-draft.json")) && !sh(wt, "git", ["status", "--porcelain"]).out.trim())
        failures.push("L'agent n'a produit ni code ni brouillon de sort.");
      const tsc = [...tscLines(sh(wt, "npx", ["tsc", "--noEmit"]).out)].filter((l) => !baseTsc.has(l));
      if (tsc.length) failures.push(`tsc : ${tsc.length} nouvelle(s) erreur(s)\n${tsc.slice(0, 8).join("\n")}`);
      const changed = sh(wt, "git", ["diff", "--name-only", "HEAD"]).out.split("\n").filter((f) => /\.(ts|tsx)$/.test(f));
      if (changed.length) {
        const lint = sh(wt, "npx", ["eslint", ...changed]);
        if (!lint.ok) failures.push(`eslint\n${tail(lint.out)}`);
      }
      for (const script of ["check:spells", "check:battle", "check:replay"]) {
        const r = sh(wt, "npm", ["run", script]);
        if (!r.ok) failures.push(`${script} en échec\n${tail(r.out)}`);
      }
      const fp = sh(wt, "npx", ["tsx", "scripts/spell-fingerprint.ts"]);
      if (fp.out.trim() !== baseFp.out.trim()) failures.push(`Régression : l'empreinte des combats existants a changé (${fp.out.trim()} au lieu de ${baseFp.out.trim()}). Une nouvelle mécanique ne doit modifier aucun combat existant.`);
      if (!failures.length) break;
      await say(`Garde-fous en échec (${failures.length})`);
      feedback = failures.join("\n\n");
    }

    if (failures.length) {
      await prisma.mechanicJob.update({ where: { id: job.id }, data: { status: "failed", log, report: `Échec après ${MAX_ATTEMPTS} tentatives. Rien n'est fusionné.\n\n${failures.join("\n\n")}\n\nDernier message de l'agent :\n${summary}` } });
      return;
    }

    let draft: unknown = null, sim = "pas de brouillon de sort à simuler";
    const draftFile = join(wt, "mechanic-draft.json");
    if (existsSync(draftFile)) {
      draft = JSON.parse(readFileSync(draftFile, "utf8"));
      const r = sh(wt, "npx", ["tsx", "scripts/builder-sim.ts", String(job.characterId), draftFile, "2000"]);
      rmSync(draftFile);
      if (r.ok) {
        const s = JSON.parse(r.out.trim().split("\n").pop()!) as SimResult;
        sim = `${s.verdict.toUpperCase()} — écart ${(s.delta * 100).toFixed(1)} pts face au sort d’origine (±${(s.margin * 100).toFixed(1)} pt, 2000 paires)${s.ssrVsUr !== null ? `, 4 SSR vs 4 UR sans sorts : ${(s.ssrVsUr * 100).toFixed(1)} %` : ""}`;
      } else sim = `simulation impossible : ${tail(r.out, 400)}`;
    }

    sh(wt, "git", ["add", "-A"]);
    sh(wt, "git", ["commit", "-m", `Mécanique de sort : ${job.wish.slice(0, 60)}`, "-m", "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"]);
    const stat = sh(wt, "git", ["diff", "--stat", "HEAD~1"]).out.trim();
    await say("Prête à valider");
    await prisma.mechanicJob.update({
      where: { id: job.id },
      data: {
        status: "review", log, draft: (draft as object) ?? undefined,
        report: `${summary}\n\nGarde-fous : typecheck, lint, check:spells, check:battle, check:replay et empreinte des combats existants identique — tous OK.\n\nSimulation du brouillon : ${sim}\n\nFichiers :\n${stat}`,
      },
    });
  } catch (e) {
    await say(`Erreur : ${e instanceof Error ? e.message : String(e)}`);
    await prisma.mechanicJob.update({ where: { id: job.id }, data: { status: "failed", log, report: `Erreur du lanceur : ${e instanceof Error ? e.message : String(e)}` } });
  }
}

main().finally(() => prisma.$disconnect());
