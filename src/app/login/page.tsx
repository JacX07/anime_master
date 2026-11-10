import type { Metadata } from "next";
import { Suspense } from "react";
import { signIn } from "@/app/auth-actions";
import { AuthForm } from "@/components/AuthForm";
import { emailConfigured } from "@/lib/email-config";

export const metadata: Metadata = { title: "Connexion — Anime Masters" };

async function LoginForm({ searchParams }: { searchParams: Promise<{ reset?: string }> }) {
  const { reset } = await searchParams;
  return <AuthForm mode="login" action={signIn} notice={reset ? "Mot de passe modifié. Connecte-toi avec le nouveau." : undefined} canReset={emailConfigured()} />;
}

export default function LoginPage({ searchParams }: { searchParams: Promise<{ reset?: string }> }) {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <p className="auth-eyebrow">Connexion</p>
        <h1>Content de te revoir</h1>
        <Suspense fallback={null}><LoginForm searchParams={searchParams} /></Suspense>
      </section>
    </main>
  );
}
