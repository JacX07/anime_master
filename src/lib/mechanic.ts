// Demandes de mécaniques de sort (docs/specs/combat.md §12) : lancement de l'agent, fusion et rejet de sa branche. Dev seulement.

import "server-only";
import { spawn, spawnSync } from "node:child_process";
import { join } from "node:path";
import { prisma } from "./db";

const git = (...args: string[]) => {
  const r = spawnSync("git", args, { cwd: process.cwd(), encoding: "utf8" });
  return { ok: r.status === 0, out: `${r.stdout ?? ""}${r.stderr ?? ""}`.trim() };
};

/** Crée la demande et lance le runner en arrière-plan (processus détaché : il survit aux rechargements de Next). */
export async function startMechanic(characterId: number, wish: string) {
  const job = await prisma.mechanicJob.create({ data: { characterId, wish } });
  const p = spawn("npx", ["tsx", "scripts/mechanic-runner.ts", job.id], { cwd: process.cwd(), detached: true, stdio: "ignore" });
  p.unref();
  return job.id;
}

const wtOf = (branch: string) => join(process.cwd(), ".claude", "worktrees", branch.replace("mecanique/", ""));

function cleanup(branch: string, force: boolean) {
  git("worktree", "remove", "--force", wtOf(branch));
  git("branch", force ? "-D" : "-d", branch);
}

/** Fusionne la branche dans main (le dépôt courant) et enregistre le brouillon comme sort du personnage. */
export async function mergeMechanic(jobId: string) {
  const job = await prisma.mechanicJob.findUnique({ where: { id: jobId } });
  if (!job || job.status !== "review" || !job.branch) return { ok: false as const, error: "Demande introuvable ou pas prête" };
  const merged = git("merge", "--no-ff", "-m", `Mécanique de sort : ${job.wish.slice(0, 60)}`, job.branch);
  if (!merged.ok) {
    git("merge", "--abort");
    return { ok: false as const, error: `Fusion impossible (fichiers modifiés en cours ?) : ${merged.out.slice(-300)}` };
  }
  cleanup(job.branch, false);
  if (job.draft) {
    await prisma.spellOverride.upsert({
      where: { characterId: job.characterId },
      create: { characterId: job.characterId, spell: job.draft, status: "ready", wish: job.wish },
      update: { spell: job.draft, status: "ready", wish: job.wish },
    });
  }
  await prisma.mechanicJob.update({ where: { id: jobId }, data: { status: "merged" } });
  return { ok: true as const };
}

export async function discardMechanic(jobId: string) {
  const job = await prisma.mechanicJob.findUnique({ where: { id: jobId } });
  if (!job) return;
  if (job.branch && job.status !== "running") cleanup(job.branch, true);
  await prisma.mechanicJob.update({ where: { id: jobId }, data: { status: "discarded" } });
}
