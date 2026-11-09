import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { resetPassword } from "@/app/auth-actions";
import { ResetForm } from "@/components/AuthForm";
import "@/components/auth.css";

export const metadata: Metadata = { title: "Nouveau mot de passe — Anime Masters" };

type Search = Promise<{ token?: string; error?: string }>;

async function Body({ searchParams }: { searchParams: Search }) {
  const { token, error } = await searchParams;
  if (!token || error) {
    return <><p className="auth-error">Ce lien est expiré ou a déjà servi.</p><p className="auth-alt" style={{ marginTop: 14 }}><Link href="/forgot-password">Refaire une demande</Link></p></>;
  }
  return <ResetForm action={resetPassword} token={token} />;
}

export default function ResetPasswordPage({ searchParams }: { searchParams: Search }) {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <p className="auth-eyebrow">Nouveau mot de passe</p>
        <h1>Choisis-en un nouveau</h1>
        <Suspense fallback={null}><Body searchParams={searchParams} /></Suspense>
      </section>
    </main>
  );
}
