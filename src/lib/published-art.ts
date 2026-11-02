import manifest from "../data/published-illustrations.json";

/** Images livrées avec le code, sans lecture ni écriture du disque local en production. */
export const publishedArt: Readonly<Partial<Record<string, string>>> = manifest;
export function publishedArtUrl(key: string): string | null {
  return Object.hasOwn(publishedArt, key) ? publishedArt[key] ?? null : null;
}
export function publishedResources() {
  const resources: Record<string, string> = {};
  for (const [key, url] of Object.entries(publishedArt)) {
    if (key.startsWith("resource-") && url) resources[key.slice(9)] = url;
  }
  return resources;
}
