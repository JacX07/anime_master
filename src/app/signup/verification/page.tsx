import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ResendButton } from "@/components/AuthForm";
import "@/components/auth.css";

export const metadata: Metadata = { title: "Vérifie ta boîte mail — Anime Masters" };

async function Body({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const { email } = await searchParams;
  return (
    <>
      <p className="auth-lead">{email ? <>On a envoyé un lien de confirmation à <b>{email}</b>.</> : "On a envoyé un lien de confirmation à ton adresse."} Clique dessus pour activer ton compte.</p>
      <p className="auth-notice">Le lien est valable 24 heures.</p>
      <p className="auth-lead" style={{ marginTop: 14 }}>Rien reçu ? Regarde les courriers indésirables, puis {email ? <ResendButton email={email} /> : <Link href="/login" className="auth-link">retourne à la connexion</Link>}.</p>
    </>
  );
}

export default function VerificationPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <p className="auth-eyebrow">Inscription</p>
        <h1>Vérifie ta boîte mail</h1>
        <Suspense fallback={null}><Body searchParams={searchParams} /></Suspense>
        <p className="auth-alt"><Link href="/login">Retour à la connexion</Link></p>
      </section>
    </main>
  );
}
