export const GUILD_COST = 1000;
export const GUILD_MAX = 20;
export const GUILD_COOLDOWN_MS = 24 * 60 * 60 * 1000;
export const GUILD_ICONS = ["squads", "combat", "mystere", "magie", "coeur", "aventure"] as const;
export const GUILD_ROLES = { OWNER: "Chef", OFFICER: "Officier", MEMBER: "Membre" } as const;
export type GuildInput = { name: string; tag: string; description: string; icon: string; joinMode: "OPEN" | "REQUEST" };
