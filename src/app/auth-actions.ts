"use server";

import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { PASSWORD_MIN, USERNAME_MAX, USERNAME_MIN, auth } from "@/lib/auth";

export interface AuthFormState {
  error?: string;
  notice?: string;
  /** Adresse dont l'e-mail n'est pas confirmé : propose « Renvoyer l'e-mail ». */
  unverified?: string;
  values?: { username?: string; email?: string };
}

const ERRORS: Record<string, string> = {
  AUTH_RATE_LIMITED: "Trop de tentatives. Réessaie dans une minute.",
  AUTH_TEMPORARILY_UNAVAILABLE: "Authentification temporairement indisponible.",
  INVALID_INVITE_CODE: "Code d'invitation invalide.",
  USER_ALREADY_EXISTS: "Un compte existe déjà avec cet email.",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "Un compte existe déjà avec cet email.",
  USERNAME_IS_ALREADY_TAKEN: "Ce pseudo est déjà pris.",
  INVALID_USERNAME: "Pseudo invalide : lettres, chiffres et _ uniquement.",
  USERNAME_TOO_SHORT: `Pseudo trop court (${USERNAME_MIN} caractères minimum).`,
  USERNAME_TOO_LONG: `Pseudo trop long (${USERNAME_MAX} caractères maximum).`,
  PASSWORD_TOO_SHORT: `Mot de passe trop court (${PASSWORD_MIN} caractères minimum).`,
  PASSWORD_TOO_LONG: "Mot de passe trop long.",
  INVALID_EMAIL: "Adresse email invalide.",
  INVALID_EMAIL_OR_PASSWORD: "Email ou mot de passe incorrect.",
  EMAIL_NOT_VERIFIED: "Confirme ton adresse e-mail avant de te connecter.",
  INVALID_TOKEN: "Ce lien est expiré ou invalide.",
};

function describe(err: unknown): string {
  if (err instanceof APIError) {
    const code = (err.body as { code?: string } | undefined)?.code;
    if (code && ERRORS[code]) return ERRORS[code];
  }
  console.error("Erreur d'authentification (détails masqués).");
  return "Une erreur est survenue, réessaie.";
}

const field = (form: FormData, name: string) => String(form.get(name) ?? "").trim();

export async function signUp(_prev: AuthFormState, form: FormData): Promise<AuthFormState> {
  const username = field(form, "username");
  const email = field(form, "email").toLowerCase();
  const password = String(form.get("password") ?? "");
  const inviteCode = String(form.get("inviteCode") ?? "");
  const values = { username, email };

  if (!/^[a-zA-Z0-9_]+$/.test(username)) return { error: ERRORS.INVALID_USERNAME, values };
  if (username.length < USERNAME_MIN) return { error: ERRORS.USERNAME_TOO_SHORT, values };
  if (username.length > USERNAME_MAX) return { error: ERRORS.USERNAME_TOO_LONG, values };
  if (password.length < PASSWORD_MIN) return { error: ERRORS.PASSWORD_TOO_SHORT, values };

  try {
    // `inviteCode` n'est pas un champ de Better Auth : il est lu par le hook (src/lib/auth-throttle.ts).
    const body = { email, password, name: username, username, inviteCode, callbackURL: "/packs" };
    await auth.api.signUpEmail({ body });
  } catch (err) {
    return { error: describe(err), values };
  }
  // Pas de session avant la confirmation de l'e-mail : on invite à ouvrir le lien reçu.
  redirect(`/signup/verification?email=${encodeURIComponent(email)}`);
}

export async function signIn(_prev: AuthFormState, form: FormData): Promise<AuthFormState> {
  const email = field(form, "email").toLowerCase();
  const password = String(form.get("password") ?? "");
  try {
    await auth.api.signInEmail({ body: { email, password } });
  } catch (err) {
    if (err instanceof APIError && (err.body as { code?: string } | undefined)?.code === "EMAIL_NOT_VERIFIED") return { error: ERRORS.EMAIL_NOT_VERIFIED, unverified: email, values: { email } };
    return { error: describe(err), values: { email } };
  }
  revalidatePath("/", "layout");
  redirect("/packs");
}

export async function signOut() {
  await auth.api.signOut({ headers: await headers() });
  revalidatePath("/", "layout");
  redirect("/");
}

const rateLimited = (err: unknown) => err instanceof APIError && (err.body as { code?: string } | undefined)?.code === "AUTH_RATE_LIMITED";

/** « Renvoyer l'e-mail » de confirmation. Réponse identique que le compte existe ou non. */
export async function resendVerification(email: string): Promise<{ ok: boolean; message: string }> {
  const address = String(email).trim().toLowerCase();
  try {
    await auth.api.sendVerificationEmail({ body: { email: address, callbackURL: "/packs" } });
  } catch (err) {
    if (rateLimited(err)) return { ok: false, message: ERRORS.AUTH_RATE_LIMITED };
  }
  return { ok: true, message: "Si un compte non confirmé existe pour cette adresse, un e-mail vient de partir." };
}

/** Mot de passe oublié : le message ne dit jamais si l'adresse existe. */
export async function requestPasswordReset(_prev: AuthFormState, form: FormData): Promise<AuthFormState> {
  const email = field(form, "email").toLowerCase();
  if (!email) return { error: ERRORS.INVALID_EMAIL, values: { email } };
  try {
    await auth.api.requestPasswordReset({ body: { email, redirectTo: "/reset-password" } });
  } catch (err) {
    if (rateLimited(err)) return { error: ERRORS.AUTH_RATE_LIMITED, values: { email } };
  }
  return { notice: "Si ce compte existe, un e-mail vient de partir. Pense aux courriers indésirables.", values: { email } };
}

export async function resetPassword(_prev: AuthFormState, form: FormData): Promise<AuthFormState> {
  const token = field(form, "token");
  const password = String(form.get("password") ?? "");
  const confirm = String(form.get("confirm") ?? "");
  if (password.length < PASSWORD_MIN) return { error: ERRORS.PASSWORD_TOO_SHORT };
  if (password !== confirm) return { error: "Les deux mots de passe ne sont pas identiques." };
  try {
    await auth.api.resetPassword({ body: { newPassword: password, token } });
  } catch (err) {
    return { error: describe(err) };
  }
  redirect("/login?reset=1");
}
