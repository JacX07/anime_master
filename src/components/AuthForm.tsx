"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { AuthFormState } from "@/app/auth-actions";

interface Props {
  mode: "signup" | "login";
  action: (prev: AuthFormState, form: FormData) => Promise<AuthFormState>;
}

const inputClass =
  "w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 outline-none focus:border-violet-400";

export function AuthForm({ mode, action }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const signup = mode === "signup";

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {signup && (
        <label className="flex flex-col gap-1 text-sm">
          Pseudo
          <input
            name="username"
            required
            minLength={3}
            maxLength={20}
            pattern="[a-zA-Z0-9_]+"
            autoComplete="username"
            defaultValue={state.values?.username}
            className={inputClass}
          />
        </label>
      )}
      <label className="flex flex-col gap-1 text-sm">
        Email
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          defaultValue={state.values?.email}
          className={inputClass}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Mot de passe
        <input
          name="password"
          type="password"
          required
          minLength={signup ? 8 : undefined}
          autoComplete={signup ? "new-password" : "current-password"}
          className={inputClass}
        />
      </label>

      {state.error && (
        <p role="alert" className="rounded-lg bg-rose-500/15 px-3 py-2 text-sm text-rose-300">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-violet-500 px-4 py-2 font-semibold text-white hover:bg-violet-400 disabled:opacity-60"
      >
        {pending ? "Un instant…" : signup ? "Créer mon compte" : "Se connecter"}
      </button>

      <p className="text-center text-sm text-muted">
        {signup ? (
          <>
            Déjà un compte ? <Link href="/login" className="text-violet-300 hover:underline">Se connecter</Link>
          </>
        ) : (
          <>
            Pas encore de compte ? <Link href="/signup" className="text-violet-300 hover:underline">S&apos;inscrire</Link>
          </>
        )}
      </p>
    </form>
  );
}
