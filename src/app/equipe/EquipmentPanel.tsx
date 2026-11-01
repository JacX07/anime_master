"use client";
import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { equipArtifactAction } from "@/app/battle-actions";
import { upgradeArtifactAction } from "@/app/artifact-actions";
import { ARTIFACT_SLOTS, SLOT_NAMES } from "@/lib/dungeons";
import { artifactRarity, artifactStatLabel, artifactStatValue } from "@/lib/artifact-display";
import { ARTIFACT_MAX_LEVEL, artifactUpgradeCost, upgradedMainValue } from "@/lib/artifact-upgrade";
import { weaponDef } from "@/lib/weapons";
import type { getPlayerInventory } from "@/lib/player-inventory";

type Inventory = Awaited<ReturnType<typeof getPlayerInventory>>;
type Slot = "ARME" | typeof ARTIFACT_SLOTS[number];
const paths: Record<Slot, string> = {
  ARME: "m30 5 6-1-1 6-16 16-5-5Z M10 19l13 13 M8 33l8-9",
  CASQUE: "M7 24v-7a13 13 0 0 1 26 0v7l-6 3v7h-5V23h-4v11h-5v-7Z M9 17h22",
  PLASTRON: "m13 5-8 8 6 7v15h18V20l6-7-8-8-7 4Z M13 5l3 12h8l3-12 M16 23h8",
  GANTS: "M11 34 7 21l3-2 4 6V10l4-1v12-15l4 1v14-12l4 1v12-9l4 1v14l-5 6Z",
  BOTTES: "M15 5h14l-3 18 8 5v7H7v-8l7-5Z M15 11h13 M7 29h26",
};
function SlotIcon({ slot }: { slot: Slot }) {
  return <svg viewBox="0 0 40 40" aria-hidden="true"><path d={paths[slot]} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export function EquipmentPanel({ inventory, card }: { inventory: Inventory; card: { id: string; name: string; weaponKey: string | null; stars: number } }) {
  const [slot, setSlot] = useState<Slot>("CASQUE");
  const [pending, start] = useTransition();
  const [message, setMessage] = useState("");
  const router = useRouter();
  const weapon = weaponDef(card.weaponKey ?? "");
  const artifacts = inventory.items.filter((item) => item.artifact);
  const visible = artifacts.filter((item) => item.artifact!.slot === slot);
  function run(action: () => Promise<{ ok: boolean; error?: string }>, success: string) {
    setMessage("");
    start(async () => {
      try {
        const result = await action();
        setMessage(result.ok ? success : result.error ?? "L’opération a échoué.");
        if (result.ok) router.refresh();
      } catch { setMessage("L’opération a échoué, réessaie."); }
    });
  }
  return <section className="gear-panel" aria-label={`Équipement de ${card.name}`}>
    <header className="gear-heading"><h2>Équipement</h2><span>{inventory.balance.toLocaleString("fr-FR")} Ryō</span></header>
    <div className="gear-slots" role="group" aria-label="Choisir un emplacement d’équipement">
      {(["ARME", ...ARTIFACT_SLOTS] as Slot[]).map((key) => {
        const worn = artifacts.find((item) => item.artifact!.slot === key && item.artifact!.equippedCard?.id === card.id);
        return <button type="button" key={key} aria-pressed={slot === key} aria-controls="gear-compatible" onClick={() => { setSlot(key); setMessage(""); }} title={key === "ARME" ? weapon?.name ?? "Arme non forgée" : worn?.name ?? "Emplacement vide"}>
          {worn?.image ? <Image src={worn.image} width={64} height={64} alt="" /> : <SlotIcon slot={key} />}
          <strong>{key === "ARME" ? "Arme" : SLOT_NAMES[key]}</strong>
          <small>{key === "ARME" ? weapon ? "Équipée" : "Vide" : worn ? `+${worn.artifact!.level}` : "Vide"}</small>
        </button>;
      })}
    </div>
    <div className="gear-compatible" id="gear-compatible">
      <h3>{slot === "ARME" ? "Arme du personnage" : `${SLOT_NAMES[slot]} · objets compatibles (${visible.length})`}</h3>
      {slot === "ARME" ? <div className="gear-weapon"><SlotIcon slot="ARME" /><h4>{weapon?.name ?? "Aucune arme forgée"}</h4><p>{weapon ? weapon.passive : "Les armes légendaires se forgent sur une carte à 5 étoiles et restent liées à cet exemplaire."}</p><Link href={card.stars === 5 ? "/forge" : "/eveil"}>{weapon ? "Voir à la forge" : card.stars === 5 ? "Forger une arme" : "Éveiller cette carte à 5★"}</Link></div> : <>
        <p className="gear-help">Équipe un objet directement ci-dessous. Un objet du même emplacement remplace celui déjà porté.</p>
        <div className="gear-item-grid">{visible.map((item) => {
          const artifact = item.artifact!;
          const worn = artifact.equippedCard?.id === card.id;
          const max = artifact.level >= ARTIFACT_MAX_LEVEL;
          const cost = artifactUpgradeCost(artifact.rarity, artifact.level);
          return <article key={item.key} className="gear-item" data-rarity={artifact.rarity}>
            <div className="gear-item-art">{item.image ? <Image src={item.image} width={96} height={96} alt="" /> : <SlotIcon slot={slot} />}<span>+{artifact.level}</span></div>
            <p className="gear-rarity">{artifactRarity(artifact.rarity).label}</p><h4>{item.name}</h4>
            <p className="gear-main-stat">{artifactStatLabel(artifact.mainStat)} {artifactStatValue(artifact.mainStat, artifact.mainValue)}</p>
            <ul>{artifact.subStats.map((stat, i) => <li key={`${stat.stat}-${i}`}>{artifactStatLabel(stat.stat)} {artifactStatValue(stat.stat, stat.value)}</li>)}</ul>
            <p className="gear-owner">{worn ? `Équipé sur ${card.name}` : artifact.equippedCard ? `Porté par ${artifact.equippedCard.character.name}` : "Disponible"}</p>
            <button type="button" className="gear-equip" disabled={pending} onClick={() => run(() => equipArtifactAction(artifact.id, worn ? null : card.id), worn ? "Objet retiré." : `Objet équipé sur ${card.name}.`)}>{worn ? "Retirer" : "Équiper"}</button>
            {!max && <p className="gear-preview">Au niveau +{artifact.level + 1} : {artifactStatValue(artifact.mainStat, upgradedMainValue(artifact.mainValue, artifact.level))} {artifactStatLabel(artifact.mainStat)}</p>}
            <button type="button" className="gear-upgrade" disabled={pending || max || inventory.balance < cost} onClick={() => run(() => upgradeArtifactAction(artifact.id, artifact.level), `Objet amélioré au niveau +${artifact.level + 1}.`)}>{max ? "Niveau maximum +10" : `Améliorer · ${cost.toLocaleString("fr-FR")} Ryō`}</button>
            {!max && inventory.balance < cost && <small>Ryō insuffisants</small>}
          </article>;
        })}</div>
        {!visible.length && <div className="gear-empty"><SlotIcon slot={slot} /><p>Aucun objet pour cet emplacement.</p><Link href="/donjons">Chercher des artefacts en donjon</Link></div>}
        <p className="gear-help">Amélioration garantie jusqu’à +10 : +5 % de la valeur initiale de la stat principale par niveau. Les sous-stats restent inchangées.</p>
      </>}
    </div>
    {message && <p className="gear-message" role="status">{message}</p>}
  </section>;
}
