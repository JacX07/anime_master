// Bannières spéciales temporaires (SPEC étape 4 bis §5, refonte du 2026-10-17) : un anime ou un groupe d'animes, avec des
// dates, payées en cristaux spéciaux. Seuls les personnages de ces animes peuvent sortir (les taux de rareté ne changent pas).
// Pour en ajouter une : une entrée ici, avec les identifiants AniList des séries (table Media). Elle est créée à la première
// lecture pendant ses dates, puis disparaît d'elle-même à la fin.

export interface BannerEvent {
  /** Clé stable, préfixée par `event-` (ex. `event-jjk-2026-11`) */
  key: string;
  name: string;
  description: string;
  /** Identifiants AniList des séries (Media.id) dont les personnages forment la bannière */
  mediaIds: number[];
  startsAt: string;
  endsAt: string;
}

export const BANNER_EVENTS: BannerEvent[] = [];
