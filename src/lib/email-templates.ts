import type { Mail } from "./email";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function layout(title: string, intro: string, label: string, url: string, outro: string) {
  return `<!doctype html><html lang="fr"><body style="margin:0;background:#0b0e0f;padding:24px;font-family:Arial,sans-serif">
<table role="presentation" width="100%" style="max-width:480px;margin:0 auto;background:#f3efe4;border-collapse:collapse"><tr><td style="background:#0b0e0f;color:#d5bb7f;text-align:center;padding:18px;font:500 18px Georgia,serif;letter-spacing:.14em">ANIMA CLASH</td></tr>
<tr><td style="padding:22px;color:#222;font-size:14px;line-height:1.5"><b style="font-size:16px">${esc(title)}</b><br><br>${intro}<br><br>
<a href="${esc(url)}" style="display:inline-block;background:#c4a76d;color:#0b0e0f;font-weight:700;padding:11px 20px;text-decoration:none">${esc(label)}</a><br><br>
<span style="color:#777;font-size:12px">${outro}</span><br><br><span style="color:#999;font-size:11px">Si le bouton ne marche pas, copie ce lien : ${esc(url)}</span></td></tr></table></body></html>`;
}

export function verificationEmail(to: string, name: string, url: string): Mail {
  return {
    to, subject: "Confirme ton adresse e-mail — Anima Clash",
    html: layout("Confirme ton adresse e-mail", `Bienvenue, ${esc(name)} ! Un clic pour activer ton compte :`, "Confirmer mon e-mail", url, "Ce lien est valable 24 heures. Si tu n’es pas à l’origine de cette inscription, ignore ce message."),
    text: `Bienvenue, ${name} ! Confirme ton adresse e-mail : ${url}\nCe lien est valable 24 heures. Si tu n'es pas à l'origine de cette inscription, ignore ce message.`,
  };
}

export function resetPasswordEmail(to: string, name: string, url: string): Mail {
  return {
    to, subject: "Réinitialise ton mot de passe — Anima Clash",
    html: layout("Réinitialise ton mot de passe", `Bonjour ${esc(name)}, tu as demandé à changer ton mot de passe :`, "Choisir un nouveau mot de passe", url, "Ce lien est valable 1 heure et ne sert qu’une fois. Si tu n’as rien demandé, ignore ce message : ton mot de passe ne change pas."),
    text: `Bonjour ${name}, pour choisir un nouveau mot de passe : ${url}\nCe lien est valable 1 heure et ne sert qu'une fois. Si tu n'as rien demandé, ignore ce message.`,
  };
}
