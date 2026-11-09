// Envoi d'e-mails via Resend (API HTTP, sans dépendance). Variables : RESEND_API_KEY et EMAIL_FROM.
// Sans clé : en développement le message est écrit dans la console du serveur ; en production l'envoi échoue (journalisé).

import "server-only";
import { after } from "next/server";

export interface Mail { to: string; subject: string; html: string; text: string }

export async function sendEmail(mail: Mail): Promise<void> {
  const key = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  if (!key || !from) {
    if (process.env.NODE_ENV === "production") throw new Error("E-mail non configuré (RESEND_API_KEY et EMAIL_FROM).");
    console.info(`[e-mail non envoyé : pas de clé] À : ${mail.to}\nObjet : ${mail.subject}\n${mail.text}`);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [mail.to], subject: mail.subject, html: mail.html, text: mail.text }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Resend a répondu ${res.status}.`);
}

/** Envoi sans attendre (évite de révéler si l'adresse existe par le temps de réponse) ; échec journalisé sans détail. */
export function sendEmailInBackground(mail: Mail) {
  const run = () => sendEmail(mail).catch((error: unknown) => console.error("Échec d'envoi d'e-mail :", error instanceof Error ? error.message : "inconnu"));
  try { after(run); } catch { void run(); } // hors requête (scripts) : envoi direct
}
