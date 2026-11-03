// Vérifie le code d'invitation (fonction pure, sans base). Usage : npm run check (découvert automatiquement) ou
// node --import tsx scripts/check-invite.ts   (Node 24)

import { inviteCodeValid } from "../src/lib/invite";

let failures = 0;
function check(label: string, ok: boolean) {
  if (!ok) failures++;
  console.log(`${ok ? "✓" : "✗"} ${label}`);
}
const env = (o: Record<string, string>) => o as unknown as NodeJS.ProcessEnv;
const prod = (code?: string) => env({ NODE_ENV: "production", ...(code === undefined ? {} : { INVITE_CODE: code }) });
const dev = (code?: string) => env({ NODE_ENV: "development", ...(code === undefined ? {} : { INVITE_CODE: code }) });

check("Bon code accepté", inviteCodeValid("Faille-Ouverte-2026", prod("Faille-Ouverte-2026")));
check("Espaces autour ignorés", inviteCodeValid("  Faille-Ouverte-2026 ", prod("Faille-Ouverte-2026")));
check("Casse ignorée", inviteCodeValid("faille-ouverte-2026", prod("Faille-Ouverte-2026")));
check("Mauvais code refusé", !inviteCodeValid("Faille-Ouverte-2027", prod("Faille-Ouverte-2026")));
check("Code trop court refusé", !inviteCodeValid("Faille", prod("Faille-Ouverte-2026")));
check("Code vide refusé", !inviteCodeValid("", prod("Faille-Ouverte-2026")));
check("Code absent refusé", !inviteCodeValid(undefined, prod("Faille-Ouverte-2026")));
check("Valeur non texte refusée", !inviteCodeValid(12345, prod("12345")) && !inviteCodeValid({ a: 1 }, prod("x")) && !inviteCodeValid(["Faille-Ouverte-2026"], prod("Faille-Ouverte-2026")));
check("Production sans INVITE_CODE : inscriptions fermées, même avec un code", !inviteCodeValid("n'importe quoi", prod()) && !inviteCodeValid("", prod()));
check("Production avec INVITE_CODE vide : fermées", !inviteCodeValid("", prod("")) && !inviteCodeValid("x", prod("   ")));
check("Développement sans INVITE_CODE : ouvertes (scripts locaux)", inviteCodeValid(undefined, dev()) && inviteCodeValid("", dev()));
check("Développement avec INVITE_CODE : le code est exigé", !inviteCodeValid("mauvais", dev("secret-12345")) && inviteCodeValid("secret-12345", dev("secret-12345")));

if (failures) { console.error(`\n${failures} échec(s)`); process.exitCode = 1; } else console.log("\nTous les contrôles passent.");
