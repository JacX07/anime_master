// Règles pures du chat (docs/specs/social.md §4) : canaux, taille, filtre de mots.

export const CHAT_MAX_LENGTH = 500;
export const CHAT_MIN_INTERVAL_MS = 1000;
export const CHAT_RETENTION_DAYS = 90;
export const CHAT_PAGE = 50;
/** Niveau d'Arpenteur minimal pour écrire dans le chat général (anti-spam). */
export const GENERAL_MIN_LEVEL = 3;

/** Liste de mots masqués (minuscules, sans accents). À compléter ici : un mot interdit est remplacé par des astérisques. */
export const BLOCKED_WORDS: string[] = ["connard", "connasse", "salope", "enculé", "encule", "nazi", "nigger", "negro", "pute", "fdp", "ntm"];

export type Channel = { kind: "general" } | { kind: "guild"; guildId: string } | { kind: "dm"; a: string; b: string };

export const GENERAL = "general";
export const guildChannel = (guildId: string) => `guild:${guildId}`;
export const dmChannel = (x: string, y: string) => (x < y ? `dm:${x}:${y}` : `dm:${y}:${x}`);

export function parseChannel(id: string): Channel | null {
  if (id === GENERAL) return { kind: "general" };
  if (id.startsWith("guild:") && id.length > 6) return { kind: "guild", guildId: id.slice(6) };
  const m = /^dm:([^:]+):([^:]+)$/.exec(id);
  if (m && m[1] < m[2]) return { kind: "dm", a: m[1], b: m[2] };
  return null;
}

const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

/** Nettoie un message : espaces, longueur, mots interdits masqués. Renvoie null si vide. */
export function cleanMessage(raw: string): string | null {
  let text = String(raw ?? "").replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, "").replace(/\s+/g, " ").trim();
  if (!text) return null;
  if (text.length > CHAT_MAX_LENGTH) throw new RangeError(`Message trop long (${CHAT_MAX_LENGTH} caractères maximum).`);
  const folded = fold(text);
  // NFD retire des marques mais garde la longueur des lettres : les positions restent alignées.
  if (folded.length === text.length) {
    for (const word of BLOCKED_WORDS) {
      const re = new RegExp(`(?<![a-z0-9])${fold(word).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![a-z0-9])`, "g");
      let match: RegExpExecArray | null;
      const chars = [...text];
      while ((match = re.exec(folded))) for (let i = match.index; i < match.index + match[0].length; i++) chars[i] = "*";
      text = chars.join("");
    }
  }
  return text;
}
