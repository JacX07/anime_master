// Code d'invitation : seules les personnes qui le connaissent peuvent créer un compte.
// Le code attendu est dans INVITE_CODE (variable d'environnement Vercel, modifiable sans toucher au code).
// En production, sans code configuré, les inscriptions sont FERMÉES (échec fermé) ; en dev et en test,
// sans code configuré, elles restent ouvertes pour ne pas gêner les scripts locaux.

import { timingSafeEqual } from "node:crypto";

export function inviteCodeValid(provided: unknown, env: NodeJS.ProcessEnv = process.env): boolean {
  const expected = env.INVITE_CODE?.trim();
  if (!expected) return env.NODE_ENV !== "production";
  if (typeof provided !== "string") return false;
  const a = Buffer.from(provided.trim().toLowerCase());
  const b = Buffer.from(expected.toLowerCase());
  // Comparaison à temps constant : la longueur seule peut fuiter, jamais le contenu.
  return a.length === b.length && timingSafeEqual(a, b);
}
