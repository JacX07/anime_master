// Spell Builder (docs/specs/combat.md §12) : accès réservé au développeur, en dev seulement.

import "server-only";
import { notFound } from "next/navigation";
import { prisma } from "./db";
import { getSessionUser, requireUser } from "./session";

/** Page : 404 en production, redirection vers /login hors session. */
export async function requireBuilder() {
  if (process.env.NODE_ENV === "production") notFound();
  return requireUser();
}

/** Route ou action : false en production ou hors session. */
export async function builderAllowed() {
  return process.env.NODE_ENV !== "production" && (await getSessionUser()) !== null;
}

export const listOverrides = () => prisma.spellOverride.findMany();
