import type { Metadata } from "next";
import { signIn } from "@/app/auth-actions";
import { AuthForm } from "@/components/AuthForm";

export const metadata: Metadata = { title: "Connexion — Anime Masters" };

export default function LoginPage() {
  return (
    <main className="mx-auto w-full max-w-sm flex-1 px-4 py-16">
      <h1 className="mb-8 text-2xl font-bold">Connexion</h1>
      <AuthForm mode="login" action={signIn} />
    </main>
  );
}
