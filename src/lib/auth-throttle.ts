import { createHash } from "node:crypto";
import { APIError, createAuthMiddleware } from "better-auth/api";
import type { PrismaClient } from "../generated/prisma/client";
import { inviteCodeValid } from "./invite";

// Le hook est exécuté pour HTTP et auth.api, contrairement au limiteur HTTP natif.
export function authThrottle(db: PrismaClient) {
  return createAuthMiddleware(async (ctx) => {
    const mail = /^\/(request-password-reset|send-verification-email)(\/|$)/.test(ctx.path);
    if (!mail && !/^\/(sign-in|sign-up)(\/|$)/.test(ctx.path)) return;
    const identity = String(ctx.body?.email ?? ctx.body?.username ?? "").trim().toLowerCase();
    const key = createHash("sha256").update(identity).digest("hex") + (mail ? ":mail" : "");
    try {
      // Pas de confiance dans X-Forwarded-For fourni par le client. Le plafond global
      // borne aussi les créations avec des identités différentes (petit jeu privé).
      // E-mails (réinitialisation, renvoi de confirmation) : 1 par minute et par adresse
      for (const [bucket, maximum] of [["global", 300], [key, mail ? 1 : 10]] as const) {
        const rows = await db.$queryRaw<{ count: number }[]>`
          INSERT INTO "AuthThrottle" ("key", "count", "expiresAt")
          VALUES (${bucket}, 1, clock_timestamp() + interval '1 minute')
          ON CONFLICT ("key") DO UPDATE SET
            "count" = CASE WHEN "AuthThrottle"."expiresAt" <= clock_timestamp() THEN 1
              ELSE LEAST("AuthThrottle"."count" + 1, ${maximum + 1}) END,
            "expiresAt" = CASE WHEN "AuthThrottle"."expiresAt" <= clock_timestamp()
              THEN clock_timestamp() + interval '1 minute' ELSE "AuthThrottle"."expiresAt" END
          RETURNING "count"`;
        if (rows[0].count > maximum) throw new APIError("TOO_MANY_REQUESTS", { code: "AUTH_RATE_LIMITED", message: "Trop de tentatives. Réessaie dans une minute." });
      }
      await db.$executeRaw`DELETE FROM "AuthThrottle" WHERE "key" IN (
        SELECT "key" FROM "AuthThrottle" WHERE "expiresAt" < clock_timestamp() LIMIT 100
      )`;
    } catch (error) {
      if (error instanceof APIError) throw error;
      // Échec fermé, sans exposer de détails de connexion.
      throw new APIError("SERVICE_UNAVAILABLE", { code: "AUTH_TEMPORARILY_UNAVAILABLE", message: "Authentification temporairement indisponible." });
    }
    // Inscription sur invitation. Placé après le limiteur : les essais de code comptent dans les 10 tentatives par minute.
    if (/^\/sign-up(\/|$)/.test(ctx.path) && !inviteCodeValid(ctx.body?.inviteCode)) {
      throw new APIError("FORBIDDEN", { code: "INVALID_INVITE_CODE", message: "Code d'invitation invalide." });
    }
  });
}
