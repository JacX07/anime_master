import type { Metadata } from "next";
import { signUp } from "@/app/auth-actions";
import { AuthForm } from "@/components/AuthForm";
import { WELCOME_PACKS } from "@/lib/pack-stock";

export const metadata: Metadata = { title: "Inscription — Anime Masters" };

export default function SignupPage() {
  return (
    <main className="mx-auto w-full max-w-sm flex-1 px-4 py-16">
      <h1 className="mb-2 text-2xl font-bold">Créer un compte</h1>
      <p className="mb-8 text-sm text-muted">{WELCOME_PACKS} paquets de bienvenue t&apos;attendent.</p>
      <AuthForm mode="signup" action={signUp} />
    </main>
  );
}
