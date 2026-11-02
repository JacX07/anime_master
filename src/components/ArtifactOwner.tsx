import type { Rarity } from "@/generated/prisma/enums";

export function ArtifactOwner({ character }: { character: { name: string; imageUrl: string; rarity: Rarity } }) {
  return <figure className="artifact-owner-card" data-rarity={character.rarity} aria-label={`Objet équipé sur ${character.name}`}>
    {/* Même CDN que CharacterCard, sans optimisation Next. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img referrerPolicy="no-referrer" src={character.imageUrl} width={94} height={126} alt={character.name} />
    <figcaption><b>{character.name}</b><span>{character.rarity} · Équipé</span></figcaption>
  </figure>;
}
