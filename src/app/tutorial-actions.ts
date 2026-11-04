"use server";

import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { getAdventure } from "@/lib/adventure-state";
import { lockReason } from "@/lib/guide";
import { settleStep, tutorialStep, TUTORIAL_LENGTH, type TutorialFacts } from "@/lib/tutorial";

export type TutorialState = { step: number; locks: Record<string, string> };

async function facts(userId: string): Promise<TutorialFacts> {
  const [cards, team, story] = await Promise.all([
    prisma.card.count({ where: { ownerId: userId }, take: 1 }),
    prisma.battleTeam.findUnique({ where: { userId_kind: { userId, kind: "ATTACK" } }, select: { slots: { select: { card: { select: { ownerId: true } } } } } }),
    prisma.storyProgress.count({ where: { userId, universe: "one-piece", maxLevel: { gte: 1 } }, take: 1 }),
  ]);
  return { cards: cards > 0, team: (team?.slots.filter((s) => s.card.ownerId === userId).length ?? 0) === 4, storyWin: story > 0 };
}

/** Étape en cours, après avoir passé les actions déjà faites. Les conditions des modes verrouillés accompagnent la phase « modes ». */
export async function getTutorial(): Promise<TutorialState> {
  const user = await getSessionUser();
  if (!user) return { step: 0, locks: {} };
  const row = await prisma.user.findUnique({ where: { id: user.id }, select: { tutorialStep: true } });
  let step = row?.tutorialStep ?? 0;
  if (step >= 1 && tutorialStep(step)?.phase === "action") {
    const next = settleStep(step, await facts(user.id));
    if (next !== step) {
      // Écriture conditionnelle : deux onglets ouverts ne font pas reculer l'étape.
      await prisma.user.updateMany({ where: { id: user.id, tutorialStep: step }, data: { tutorialStep: next } });
      step = next;
    }
  }
  const locks: Record<string, string> = {};
  if (tutorialStep(step)?.phase === "modes") {
    const adventure = await getAdventure(user.id);
    for (const mode of adventure.modes) if (!mode.unlocked) locks[mode.key] = lockReason(mode);
  }
  return { step, locks };
}

/** Bouton « Suivant » (phases de présentation seulement). */
export async function nextTutorial(from: number): Promise<TutorialState> {
  const user = await getSessionUser();
  const step = tutorialStep(from);
  if (user && step && step.phase !== "action") {
    await prisma.user.updateMany({ where: { id: user.id, tutorialStep: from }, data: { tutorialStep: from >= TUTORIAL_LENGTH ? 0 : from + 1 } });
  }
  return getTutorial();
}

export async function skipTutorial(): Promise<void> {
  const user = await getSessionUser();
  if (user) await prisma.user.update({ where: { id: user.id }, data: { tutorialStep: 0 } });
}

/** Relance depuis la page Guide : les actions déjà faites sont passées automatiquement. */
export async function restartTutorial(): Promise<void> {
  const user = await getSessionUser();
  if (user) await prisma.user.update({ where: { id: user.id }, data: { tutorialStep: 1 } });
}
