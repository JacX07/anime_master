// Nettoyage des descriptions AniList pour l'affichage sur les cartes (SPEC §4).

const MAX_LENGTH = 250;
const MAX_SENTENCES = 2;

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#039;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
};

/** Texte complet nettoyé : sans spoilers, fiche d'attributs, markdown ni HTML. */
export function cleanDescription(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let s = raw;

  // Spoilers AniList : ~!texte!~ (peut s'étendre sur plusieurs lignes)
  s = s.replace(/~!([\s\S]*?)!~/g, " ");
  // Spoiler non refermé : on coupe tout ce qui suit
  s = s.replace(/~![\s\S]*$/, " ");

  // Mentions de source : (Source: Wikipedia)
  s = s.replace(/\(\s*source:[^)]*\)/gi, " ");

  // Sauts de ligne HTML, avant de traiter les lignes « fiche »
  s = s.replace(/<br\s*\/?>/gi, "\n");

  // Lignes « fiche » en tête : __Height:__ 190 cm, **Age:** 17…
  // (la clé peut contenir un saut de ligne dans les données AniList)
  s = s.replace(/^\s*(?:__|\*\*)+[^_*]{1,60}?:\s*(?:__|\*\*)+[^\n]*$/gm, "");

  // HTML restant
  s = s.replace(/<[^>]+>/g, " ");
  s = s.replace(/&[a-z#0-9]+;/gi, (e) => ENTITIES[e.toLowerCase()] ?? " ");

  // Markdown : images img(...), liens [texte](url), titres, emphase, centrage ~~~
  s = s.replace(/img\d*%?\([^)]*\)/gi, " ");
  s = s.replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1");
  s = s.replace(/^#+\s*/gm, "");
  s = s.replace(/(\*\*|__)(.*?)\1/g, "$2");
  s = s.replace(/(^|[\s(])[*_]([^*_\n]+)[*_](?=[\s).,;:!?]|$)/g, "$1$2");
  s = s.replace(/~~~/g, " ").replace(/~~(.*?)~~/g, "$1");
  s = s.replace(/https?:\/\/\S+/g, " ");

  s = s.replace(/\s+/g, " ").trim();
  return s.length > 0 ? s : null;
}

/** Version courte pour la carte : 2 phrases ou ~250 caractères, coupée sur un mot. */
export function shortenDescription(text: string | null): string | null {
  if (!text) return null;

  const sentences = text.match(/[^.!?]+[.!?]+(?:["')\]]+)?(?=\s|$)/g);
  let short = sentences ? sentences.slice(0, MAX_SENTENCES).map((x) => x.trim()).join(" ") : text;
  if (!short) short = text;

  if (short.length <= MAX_LENGTH) return short;
  const cut = short.slice(0, MAX_LENGTH);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > MAX_LENGTH * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:.-]+$/, "")}…`;
}
