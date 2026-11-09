import type { Metadata } from "next";
import { requestPasswordReset } from "@/app/auth-actions";
import { ForgotForm } from "@/components/AuthForm";
import "@/components/auth.css";

export const metadata: Metadata = { title: "Mot de passe oublié — Anime Masters" };

export default function ForgotPasswordPage() {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <p className="auth-eyebrow">Mot de passe oublié</p>
        <h1>On t’envoie un lien</h1>
        <p className="auth-lead">Entre l’e-mail de ton compte. Si un compte existe, tu reçois un lien valable 1 heure.</p>
        <ForgotForm action={requestPasswordReset} />
      </section>
    </main>
  );
}
