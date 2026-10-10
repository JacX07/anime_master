"use server";

import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { PASSWORD_MIN, USERNAME_MAX, USERNAME_MIN, auth } from "@/lib/auth";

export interface AuthFormState {
  error?: string;
  values?: { username?: string; email?: string };
}

const ERRORS: Record<string, string> = {
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
};

function describe(err: unknown): string {
  if (err instanceof APIError) {
    const code = (err.body as { code?: string } | undefined)?.code;
    if (code && ERRORS[code]) return ERRORS[code];
  }
  console.error("Erreur d'authentification :", err);
  return "Une erreur est survenue, réessaie.";
}

const field = (form: FormData, name: string) => String(form.get(name) ?? "").trim();

export async function signUp(_prev: AuthFormState, form: FormData): Promise<AuthFormState> {
  const username = field(form, "username");
  const email = field(form, "email").toLowerCase();
  const password = String(form.get("password") ?? "");
  const values = { username, email };

  if (!/^[a-zA-Z0-9_]+$/.test(username)) return { error: ERRORS.INVALID_USERNAME, values };
  if (username.length < USERNAME_MIN) return { error: ERRORS.USERNAME_TOO_SHORT, values };
  if (username.length > USERNAME_MAX) return { error: ERRORS.USERNAME_TOO_LONG, values };
  if (password.length < PASSWORD_MIN) return { error: ERRORS.PASSWORD_TOO_SHORT, values };

  try {
    await auth.api.signUpEmail({ body: { email, password, name: username, username } });
  } catch (err) {
    return { error: describe(err), values };
  }
  revalidatePath("/", "layout"); // aucune page du compte précédent ne doit rester en cache
  redirect("/packs");
}

export async function signIn(_prev: AuthFormState, form: FormData): Promise<AuthFormState> {
  const email = field(form, "email").toLowerCase();
  const password = String(form.get("password") ?? "");
  try {
    await auth.api.signInEmail({ body: { email, password } });
  } catch (err) {
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
