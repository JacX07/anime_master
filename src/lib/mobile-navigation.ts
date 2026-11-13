export const MOBILE_DESTINATIONS = [
  { id: "home", href: "/", label: "Accueil", icon: "aventure" },
  { id: "collection", href: "/album", label: "Collection", icon: "collection" },
  { id: "play", href: "/jouer", label: "Jouer", icon: "combat" },
  { id: "summon", href: "/packs", label: "Invocation", icon: "paquet" },
  { id: "menu", href: "/menu", label: "Menu", icon: "parametres" },
] as const;

export type MobileSection = (typeof MOBILE_DESTINATIONS)[number]["id"];

export function mobileSection(path: string): MobileSection {
  const segment = path.split(/[/?#]/)[1] ?? "";
  if (!segment) return "home";
  if (["album", "character", "equipe", "inventaire", "forge", "eveil"].includes(segment)) return "collection";
  if (["jouer", "histoire", "donjons", "raid", "tour", "expeditions", "arene", "duels", "combat"].includes(segment)) return "play";
  if (segment === "packs") return "summon";
  return "menu";
}
