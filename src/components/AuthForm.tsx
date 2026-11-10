"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { resendVerification, type AuthFormState } from "@/app/auth-actions";
import "./auth.css";

type Action = (prev: AuthFormState, form: FormData) => Promise<AuthFormState>;

function Field({ label, ...input }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return <label className="auth-field">{label}<input {...input} /></label>;
}

function Messages({ state }: { state: AuthFormState }) {
  return (
    <>
      {state.error && <p role="alert" className="auth-error">{state.error}</p>}
      {state.notice && <p role="status" className="auth-notice">{state.notice}</p>}
    </>
  );
}

/** « Renvoyer l'e-mail » de confirmation (1 par minute et par adresse, limite côté serveur). */
export function ResendButton({ email, label = "Renvoyer l’e-mail" }: { email: string; label?: string }) {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  return (
    <>
      <button type="button" className="auth-link" disabled={pending} onClick={() => start(async () => { const r = await resendVerification(email); setMessage({ ok: r.ok, text: r.message }); })}>{pending ? "Envoi…" : label}</button>
      {message && <p role="status" className={message.ok ? "auth-notice" : "auth-error"}>{message.text}</p>}
    </>
  );
}

export function AuthForm({ mode, action, notice, canReset = false }: { mode: "signup" | "login"; action: Action; notice?: string; canReset?: boolean }) {
  const [state, formAction, pending] = useActionState(action, {});
  const signup = mode === "signup";
  return (
    <form action={formAction} className="auth-form">
      {notice && <p role="status" className="auth-notice">{notice}</p>}
      {signup && <Field label="Pseudo" name="username" required minLength={3} maxLength={20} pattern="[a-zA-Z0-9_]+" autoComplete="username" defaultValue={state.values?.username} />}
      {signup && <Field label="Code d’invitation" name="inviteCode" required autoComplete="off" spellCheck={false} />}
      <Field label="E-mail" name="email" type="email" required autoComplete="email" defaultValue={state.values?.email} />
      <Field label="Mot de passe" name="password" type="password" required minLength={signup ? 8 : undefined} autoComplete={signup ? "new-password" : "current-password"} />
      <Messages state={state} />
      {state.unverified && <div><ResendButton email={state.unverified} label="Renvoyer l’e-mail de confirmation" /></div>}
      <div className="auth-row">
        <button type="submit" disabled={pending} className="ui-button">{pending ? "Un instant…" : signup ? "Créer mon compte" : "Se connecter"}</button>
        {!signup && canReset && <Link href="/forgot-password" className="auth-link">Mot de passe oublié ?</Link>}
      </div>
      <p className="auth-alt">
        {signup ? <>Déjà un compte ? <Link href="/login">Se connecter</Link></> : <>Pas encore de compte ? <Link href="/signup">S’inscrire</Link></>}
      </p>
    </form>
  );
}

export function ForgotForm({ action }: { action: Action }) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="auth-form">
      <Field label="E-mail" name="email" type="email" required autoComplete="email" defaultValue={state.values?.email} />
      <Messages state={state} />
      <button type="submit" disabled={pending} className="ui-button">{pending ? "Un instant…" : "Envoyer le lien"}</button>
      <p className="auth-alt"><Link href="/login">Retour à la connexion</Link></p>
    </form>
  );
}

export function ResetForm({ action, token }: { action: Action; token: string }) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="auth-form">
      <input type="hidden" name="token" value={token} />
      <Field label="Nouveau mot de passe" name="password" type="password" required minLength={8} autoComplete="new-password" />
      <Field label="Confirmer" name="confirm" type="password" required minLength={8} autoComplete="new-password" />
      <Messages state={state} />
      <button type="submit" disabled={pending} className="ui-button">{pending ? "Un instant…" : "Enregistrer"}</button>
    </form>
  );
}
