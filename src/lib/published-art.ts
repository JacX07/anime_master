import manifest from "../data/published-illustrations.json";

/** Images livrées avec le code, sans lecture ni écriture du disque local en production. */
export const publishedArt: Readonly<Partial<Record<string, string>>> = manifest;
export function publishedArtUrl(key: string): string | null {
  return Object.hasOwn(publishedArt, key) ? publishedArt[key] ?? null : null;
}
/**
 * Images de ressources livrées en dur (public/images/materials) : elles ne dépendent pas du manifeste généré par
 * `scripts/export-illustrations.ts` et survivent à sa régénération ; elles remplacent une image du manifeste de même clé.
 */
export const MATERIAL_ART: Readonly<Record<string, string>> = {
  "materiau-donjon-one-piece": "/images/materials/materiau-donjon-one-piece.webp", // Éclat du Trône
  "metal-a-chakra": "/images/materials/metal-a-chakra.webp",
  "outil-maudit": "/images/materials/outil-maudit.webp",
  // Ressources légendaires des empereurs : icônes provisoires dessinées, à remplacer par des illustrations
  "cheveux-roux-de-shanks": "/images/materials/cheveux-roux-de-shanks.webp",
  "meche-de-big-mom": "/images/materials/meche-de-big-mom.webp",
  "ecaille-de-kaido": "/images/materials/ecaille-de-kaido.webp",
  "moustache-de-barbe-blanche": "/images/materials/moustache-de-barbe-blanche.webp",
  // Armes légendaires des empereurs (clés d'arme)
  griffon: "/images/weapons/griffon.webp",
  napoleon: "/images/weapons/napoleon.webp",
  hassaikai: "/images/weapons/hassaikai.webp",
  murakumogiri: "/images/weapons/murakumogiri.webp",
};
export function publishedResources() {
  const resources: Record<string, string> = {};
  for (const [key, url] of Object.entries(publishedArt)) {
    if (key.startsWith("resource-") && url) resources[key.slice(9)] = url;
  }
  return { ...resources, ...MATERIAL_ART };
}
