// Authentification (SPEC étape 2) : Better Auth, email + mot de passe, pseudo unique.

import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { username } from "better-auth/plugins";
import { prisma } from "./db";
import { createAuthMiddleware } from "better-auth/api";
import { authThrottle } from "./auth-throttle";
import { track } from "./events";

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;
export const PASSWORD_MIN = 8;

export const auth = betterAuth({
  hooks: {
    before: authThrottle(prisma),
    // Connexion ou inscription réussie : une session vient d'être créée.
    after: createAuthMiddleware(async (ctx) => {
      const kind = /^\/sign-in(\/|$)/.test(ctx.path) ? "login" : /^\/sign-up(\/|$)/.test(ctx.path) ? "signup" : null;
      const id = ctx.context.newSession?.user.id;
      if (kind && id) await track(kind, id);
    }),
  },
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: { enabled: true, minPasswordLength: PASSWORD_MIN, autoSignIn: true },
  // La session est relue à chaque page et chaque action : sans cache, une rafale de pages (préchargement des
  // liens du menu) fait des dizaines de lectures en parallèle et sature les 15 clients du Session pooler.
  // Le cookie signé sert la session 5 minutes sans interroger la base (un changement de rôle met ≤ 5 min à s'appliquer).
  session: { cookieCache: { enabled: true, maxAge: 5 * 60 } },
  plugins: [
    username({ minUsernameLength: USERNAME_MIN, maxUsernameLength: USERNAME_MAX, displayUsername: false }),
    // Doit rester le dernier plugin : pose les cookies depuis les Server Actions
    nextCookies(),
  ],
});
