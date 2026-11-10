/** Les e-mails (confirmation d'inscription, mot de passe oublié) ne sont actifs que si Resend est configuré.
 *  Sans RESEND_API_KEY et EMAIL_FROM, l'inscription et la connexion restent comme avant (aucune confirmation exigée). */
export function emailConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return !!env.RESEND_API_KEY?.trim() && !!env.EMAIL_FROM?.trim();
}
