"use client";
import { useId, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { Icon } from "@/components/icons";
import { ArtifactTile } from "@/components/ArtifactTile";
import { ArtifactOwner } from "@/components/ArtifactOwner";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { equipArtifactAction } from "@/app/battle-actions";
import { upgradeArtifactAction } from "@/app/artifact-actions";
import { ARTIFACT_SLOTS, SLOT_NAMES } from "@/lib/dungeons";
import { artifactSubstatUpgrades, artifactRarity, artifactStatIcon, artifactStatLabel, artifactStatValue } from "@/lib/artifact-display";
import { ARTIFACT_MAX_LEVEL, artifactUpgradeCost, artifactUpgradeTotal } from "@/lib/artifact-upgrade";

/** Paliers d'amélioration directe : chacun révèle ou double une sous-stat. */
const UPGRADE_STEPS = [4, 8, 12, ARTIFACT_MAX_LEVEL];
import { weaponDef } from "@/lib/weapons";
import type { getPlayerInventory } from "@/lib/player-inventory";
import { GearPreview } from "./StatisticsPanel";
import type { TeamCard } from "./TeamBuilder";

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

export function EquipmentPanel({ inventory, card, team = [] }: { inventory: Inventory; card: TeamCard; team?: TeamCard[] }) {
  const [slot, setSlot] = useState<Slot | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const detailRef = useRef<HTMLElement>(null);
  const detailId = useId();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState("");
  const router = useRouter();
  const weapon = weaponDef(card.weaponKey ?? "");
  const artifacts = inventory.items.filter((item) => item.artifact);
  const visible = slot && slot !== "ARME" ? artifacts.filter((item) => item.artifact!.slot === slot) : [];
  const selected = visible.find((item) => item.key === selectedKey);
  function closeDetails() {
    document.getElementById(`${detailId}-${selectedKey}`)?.focus();
    setSelectedKey(null); setMessage("");
  }
  function run(action: () => Promise<{ ok: boolean; error?: string }>, success: string, refresh = true) {
    setMessage("");
    start(async () => {
      try {
        const result = await action();
        setMessage(result.ok ? success : result.error ?? "L’opération a échoué.");
        if (result.ok && refresh) router.refresh();
      } catch { setMessage("L’opération a échoué, réessaie."); }
    });
  }
  return <section className="cd-gear" aria-label={`Équipement de ${card.name}`}>
    <div className="gear-slots" role="group" aria-label="Choisir un emplacement d’équipement">
      {(["ARME", ...ARTIFACT_SLOTS] as Slot[]).map((key) => {
        const worn = artifacts.find((item) => item.artifact!.slot === key && item.artifact!.equippedCard?.id === card.id);
        return <button type="button" key={key} data-rarity={worn?.artifact!.rarity} aria-pressed={slot === key} aria-controls="gear-compatible" onClick={() => { setSlot(slot === key ? null : key); setSelectedKey(slot === key ? null : worn?.key ?? null); setMessage(""); }} title={key === "ARME" ? weapon?.name ?? "Arme non forgée" : worn?.name ?? "Emplacement vide"}>
          {worn?.image ? <Image src={worn.image} width={64} height={64} alt="" /> : <SlotIcon slot={key} />}
          <span><strong>{key === "ARME" ? "Arme" : SLOT_NAMES[key]}</strong>
          <small>{key === "ARME" ? weapon ? "Équipée" : "Vide" : worn ? `+${worn.artifact!.level}` : "Vide"}</small></span>
        </button>;
      })}
    </div>
    <p className="cd-gear-balance">{inventory.balance.toLocaleString("fr-FR")} Ryō</p>
    {slot && <div className="gear-compatible" id="gear-compatible" onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); if (selected) closeDetails(); else setSlot(null); } }}>
      <header className="gear-picker-head"><h3>{slot === "ARME" ? "Arme du personnage" : `${SLOT_NAMES[slot]} · objets compatibles (${visible.length})`}</h3><button type="button" className="gear-close" onClick={() => { setSlot(null); setSelectedKey(null); setMessage(""); }}>Fermer la liste</button></header>
      {slot === "ARME" ? <div className="gear-weapon"><SlotIcon slot="ARME" /><h4>{weapon?.name ?? "Aucune arme forgée"}</h4><p>{weapon ? weapon.passive : "Les armes légendaires se forgent sur une carte à 5 étoiles et restent liées à cet exemplaire."}</p><Link href={card.stars === 5 ? "/forge" : "/eveil"}>{weapon ? "Voir à la forge" : card.stars === 5 ? "Forger une arme" : "Éveiller cette carte à 5★"}</Link></div> : <>
        <div className="gear-workspace">
          <div className="artifact-tile-grid" role="group" aria-label="Artefacts compatibles">{visible.map((item) => <ArtifactTile key={item.key} item={item} selected={selectedKey === item.key} controls={detailId} onSelect={() => {
            setSelectedKey(item.key); setMessage("");
            if (window.matchMedia("(max-width: 700px)").matches) requestAnimationFrame(() => detailRef.current?.scrollIntoView({ block: "start", behavior: "instant" }));
          }} />)}</div>
          <aside ref={detailRef} className="gear-detail" id={detailId} aria-label="Fiche de l’artefact" onKeyDown={(event) => { if (event.key === "Escape" && selected) { event.preventDefault(); event.stopPropagation(); closeDetails(); } }}>
          {selected ? (() => {
          const item = selected;
          const artifact = item.artifact!;
          const worn = artifact.equippedCard?.id === card.id;
          const max = artifact.level >= ARTIFACT_MAX_LEVEL;
          const cost = artifactUpgradeCost(artifact.rarity, artifact.level);
          return <article key={item.key} className="gear-item" data-rarity={artifact.rarity}>
            <header className="gear-detail-heading"><p className="gear-rarity">{artifactRarity(artifact.rarity).label}</p><button type="button" className="gear-close" onClick={closeDetails}>Fermer</button></header>
            <h4>{item.name}</h4>
            <div className="gear-item-art">{item.image ? <Image src={item.image} width={170} height={170} alt={item.name} /> : <SlotIcon slot={slot} />}<span>+{artifact.level}</span></div>
            <div className="gear-item-body"><div><p className="gear-main-stat"><Icon name={artifactStatIcon(artifact.mainStat)} /><strong>{artifactStatLabel(artifact.mainStat)} {artifactStatValue(artifact.mainStat, artifact.mainValue)}</strong></p>
            <ul>{artifact.subStats.map((stat, i) => <li key={`${stat.stat}-${i}`}><Icon name={artifactStatIcon(stat.stat)} />{artifactStatLabel(stat.stat)} {artifactStatValue(stat.stat, stat.value)}{artifactSubstatUpgrades(stat) > 0 && <span className="substat-upgrades" aria-label={`${artifactSubstatUpgrades(stat)} améliorations`}> +{artifactSubstatUpgrades(stat)}</span>}</li>)}</ul>
            </div>{artifact.equippedCard ? <ArtifactOwner character={artifact.equippedCard.character} /> : <span className="gear-owner">Disponible</span>}</div>
            <div className="gear-item-actions">
            <button type="button" className="gear-equip" disabled={pending} onClick={() => run(() => equipArtifactAction(artifact.id, worn ? null : card.id), worn ? "Objet retiré." : `Objet équipé sur ${card.name}.`)}>{worn ? "Retirer" : "Équiper"}</button>
            <button type="button" className="gear-upgrade" disabled={pending || max || inventory.balance < cost} onClick={() => run(() => upgradeArtifactAction(artifact.id, artifact.level), `Objet amélioré au niveau +${artifact.level + 1}.`)}>{max ? "Niveau maximum +16" : `Améliorer · ${cost.toLocaleString("fr-FR")} Ryō`}</button></div>
            {!max && <div className="gear-upgrade-jumps" role="group" aria-label="Améliorer directement jusqu’à un palier">
              {UPGRADE_STEPS.filter((to) => to > artifact.level + 1).map((to) => {
                const total = artifactUpgradeTotal(artifact.rarity, artifact.level, to);
                return <button key={to} type="button" className="ui-button" disabled={pending || inventory.balance < total} onClick={() => run(() => upgradeArtifactAction(artifact.id, artifact.level, to), `Objet amélioré au niveau +${to}.`)}>{to === ARTIFACT_MAX_LEVEL ? "Max" : `+${to}`} · {total.toLocaleString("fr-FR")} Ryō</button>;
              })}
            </div>}
            {!max && inventory.balance < cost && <small>Ryō insuffisants</small>}
            {message && <p className="gear-message" role="status">{message}</p>}
            <GearPreview card={card} team={team} inventory={inventory} artifact={artifact} />
          </article>;
        })() : <p className="gear-detail-placeholder">Sélectionne un artefact pour afficher sa fiche.</p>}
          </aside>
        </div>
        {!visible.length && <div className="gear-empty"><SlotIcon slot={slot} /><p>Aucun objet pour cet emplacement.</p><Link href="/donjons">Chercher des artefacts en donjon</Link></div>}
        <p className="gear-help">+5 % de la stat principale par niveau jusqu’à +16. Aux niveaux 4, 8, 12 et 16, une sous-stat est révélée ou doublée.</p>
      </>}
      {message && !selected && <p className="gear-message" role="status">{message}</p>}
    </div>}
  </section>;
}
