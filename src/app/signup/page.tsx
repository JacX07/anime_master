import type { Metadata } from "next";
import { signUp } from "@/app/auth-actions";
import { AuthForm } from "@/components/AuthForm";
import { emailConfigured } from "@/lib/email-config";
import { WELCOME_CRYSTALS, WELCOME_DRAWS } from "@/lib/crystal-stock";

export const metadata: Metadata = { title: "Inscription — Anime Masters" };

export default function SignupPage() {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <p className="auth-eyebrow">Inscription</p>
        <h1>Créer un compte</h1>
        <p className="auth-lead">{WELCOME_CRYSTALS} cristaux et {WELCOME_DRAWS} tirages sur la bannière de ton choix t’attendent (50 cartes).{emailConfigured() ? " Un e-mail de confirmation te sera envoyé." : ""}</p>
        <AuthForm mode="signup" action={signUp} />
      </section>
    </main>
  );
}
