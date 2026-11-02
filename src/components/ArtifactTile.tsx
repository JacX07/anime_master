import Image from "next/image";
import { Icon } from "@/components/icons";
import { artifactRarity } from "@/lib/artifact-display";
import type { InventoryItem } from "@/lib/inventory";

export function ArtifactTile({ item, selected, controls, onSelect }: { item: InventoryItem; selected: boolean; controls: string; onSelect: () => void }) {
  const artifact = item.artifact!;
  return <button type="button" id={`${controls}-${item.key}`} className="artifact-tile inventory-slot" data-rarity={artifact.rarity} aria-pressed={selected} aria-controls={controls} aria-label={`${item.name}, ${artifactRarity(artifact.rarity).label}, niveau +${artifact.level}`} onClick={onSelect}>
    {item.image ? <Image src={item.image} width={96} height={96} alt="" /> : <Icon name="equipement" />}
    <span className="artifact-tile-level">+{artifact.level}</span>
  </button>;
}
