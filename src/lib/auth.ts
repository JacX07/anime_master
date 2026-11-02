// Authentification (SPEC étape 2) : Better Auth, email + mot de passe, pseudo unique.

import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { username } from "better-auth/plugins";
import { prisma } from "./db";
import { authThrottle } from "./auth-throttle";

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;
export const PASSWORD_MIN = 8;

export const auth = betterAuth({
  hooks: { before: authThrottle(prisma) },
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: { enabled: true, minPasswordLength: PASSWORD_MIN, autoSignIn: true },
  plugins: [
    username({ minUsernameLength: USERNAME_MIN, maxUsernameLength: USERNAME_MAX, displayUsername: false }),
    // Doit rester le dernier plugin : pose les cookies depuis les Server Actions
    nextCookies(),
  ],
});
