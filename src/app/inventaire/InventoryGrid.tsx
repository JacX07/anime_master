"use client";

import { recycleArtifactsAction, upgradeArtifactAction } from "@/app/artifact-actions";
import { ArtifactFilterBar, useArtifactFilter } from "@/components/team/ArtifactFilters";
import { ARTIFACT_MAX_LEVEL, artifactRecycleValue, artifactUpgradeCost } from "@/lib/artifact-upgrade";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArtifactTile } from "@/components/ArtifactTile";
import { ArtifactOwner } from "@/components/ArtifactOwner";
import { ResourceArt } from "@/components/ResourceArt";
import { Icon } from "@/components/icons";
import { INVENTORY_CATEGORIES, filterInventory, type InventoryCategory, type InventoryItem } from "@/lib/inventory";
import { UNIVERSES } from "@/lib/story";
import { artifactSubstatUpgrades, artifactRarity, artifactStatIcon, artifactStatLabel, artifactStatValue } from "@/lib/artifact-display";
import { equipArtifactAction } from "@/app/battle-actions";
import { PageHeading } from "@/components/mq/PageHeading";

const number = new Intl.NumberFormat("fr-FR");
function ItemIcon({ item, size = 64 }: { item: InventoryItem; size?: number }) {
  const fallback = <Icon name={item.icon === "heart" ? "coeur" : item.icon === "ore" ? "cristal" : item.icon === "weapon" ? "atk" : item.icon === "artifact" ? "equipement" : "cristal"} className="inventory-icon" style={{ width: size, height: size }} />;
  return item.image ? <Image src={item.image} width={size} height={size} alt="" aria-hidden="true" /> : item.resource ? <ResourceArt key={item.resource} resource={item.resource} size={size} fallback={fallback} /> : fallback;
}

export function InventoryGrid({ items, cards, balance = 0 }: { balance?: number; items: InventoryItem[]; cards: { id: string; serial: number; character: { name: string } }[] }) {
  const router = useRouter();
  const detailRef = useRef<HTMLElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [category, setCategory] = useState<InventoryCategory>("Tout");
  const [query, setQuery] = useState("");
  const [universe, setUniverse] = useState("");
  const [sort, setSort] = useState("quantity");
  const [showEmpty, setShowEmpty] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const artifactFilter = useArtifactFilter(filterInventory(items, category, query, universe, showEmpty, sort));
  const visible = artifactFilter.filtered;
  const selected = visible.find((item) => item.key === selectedKey);
  function closeDetails() {
    document.getElementById(`inventory-detail-${selectedKey}`)?.focus();
    setSelectedKey(null); setError("");
  }
  // Recyclage en lot : artefacts non équipés jusqu'à une rareté donnée (améliorés seulement si demandé)
  const RANK = ["N", "R", "SR", "SSR", "UR"] as const;
  const [recycleMax, setRecycleMax] = useState<(typeof RANK)[number]>("R");
  const [recycleLeveled, setRecycleLeveled] = useState(false);
  const [notice, setNotice] = useState("");
  const recyclable = items.flatMap((item) => item.artifact && !item.artifact.equippedCard && RANK.indexOf(item.artifact.rarity as (typeof RANK)[number]) <= RANK.indexOf(recycleMax) && (recycleLeveled || item.artifact.level === 0) ? [item.artifact] : []);
  const recycleTotal = recyclable.reduce((sum, a) => sum + artifactRecycleValue(a.rarity, a.level), 0);
  // Confirmation dans la page (les fenêtres du navigateur peuvent être bloquées)
  const [toRecycle, setToRecycle] = useState<{ ids: string[]; total: number } | null>(null);
  function recycle(ids: string[], total: number) {
    if (ids.length) setToRecycle({ ids, total });
  }
  function confirmRecycle() {
    if (!toRecycle) return;
    const { ids } = toRecycle;
    setToRecycle(null);
    setError(""); setNotice("");
    startTransition(async () => {
      try {
        const r = await recycleArtifactsAction(ids);
        if (!r.ok) return setError(r.error);
        setNotice(`${r.count} artefact${r.count > 1 ? "s" : ""} recyclé${r.count > 1 ? "s" : ""} : +${number.format(r.ryo)} Ryō.`);
        setSelectedKey(null);
        router.refresh();
      } catch { setError("Le recyclage a échoué, réessaie."); }
    });
  }
  function selectItem(key: string) {
    setSelectedKey(key); setError("");
    if (window.matchMedia("(max-width: 700px)").matches) requestAnimationFrame(() => detailRef.current?.scrollIntoView({ block: "start", behavior: "instant" }));
  }
  return <><PageHeading eyebrow="RÉSERVES DE LA CITADELLE" title="Inventaire" description="Gérez vos ressources, équipements et objets précieux."><div className="mq-currency"><span>◇ {number.format(balance)} Ryō</span></div></PageHeading>
  <section className="inventory" aria-label="Objets et matériaux">
    <div className="inventory-tabs mq-section-tabs" role="group" aria-label="Catégorie d’objet">
      {INVENTORY_CATEGORIES.map((tab) => <button key={tab} type="button" aria-pressed={category === tab} onClick={() => setCategory(tab)}>{tab}</button>)}
    </div>
    <div className="inventory-toolbar">
      <label className="inventory-search"><span className="sr-only">Rechercher un objet</span><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="10" cy="10" r="6" /><path d="m15 15 6 6" /></svg><input type="search" placeholder="Rechercher un objet…" value={query} onChange={(e) => setQuery(e.target.value)} /></label>
      <label><span className="sr-only">Filtrer par univers</span><select value={universe} onChange={(e) => setUniverse(e.target.value)}><option value="">Tous les univers</option><option value="common">Commun</option>{UNIVERSES.map((u) => <option key={u.key} value={u.key}>{u.name}</option>)}</select></label>
      <label><span className="sr-only">Trier les objets</span><select value={sort} onChange={(e) => setSort(e.target.value)}><option value="quantity">Quantité décroissante</option><option value="name">Nom de A à Z</option></select></label>
    </div>
    <div className="inventory-options"><p role="status">{visible.length} objet{visible.length > 1 ? "s" : ""} affiché{visible.length > 1 ? "s" : ""}</p><label><input type="checkbox" checked={showEmpty} onChange={(e) => setShowEmpty(e.target.checked)} />Afficher les non possédés</label></div>
    {(category === "Tout" || category === "Équipement") && items.some((item) => item.artifact) && <ArtifactFilterBar filter={artifactFilter} sets={false} />}
    {(category === "Tout" || category === "Équipement") && items.some((item) => item.artifact) && <div className="inventory-recycle" role="group" aria-label="Recycler des artefacts en lot">
      <span>Recycler les artefacts non équipés jusqu’à</span>
      <select value={recycleMax} onChange={(e) => setRecycleMax(e.target.value as (typeof RANK)[number])} aria-label="Rareté maximale">{RANK.map((r) => <option key={r} value={r}>{r} · {artifactRarity(r).label}</option>)}</select>
      <label><input type="checkbox" checked={recycleLeveled} onChange={(e) => setRecycleLeveled(e.target.checked)} /> y compris les améliorés</label>
      <button type="button" className="ui-button" disabled={pending || !recyclable.length} onClick={() => recycle(recyclable.map((a) => a.id), recycleTotal)}>{recyclable.length ? `Recycler ${recyclable.length} · +${number.format(recycleTotal)} Ryō` : "Rien à recycler"}</button>
    </div>}
    {toRecycle && <div className="inventory-recycle-confirm" role="alertdialog" aria-label="Confirmer le recyclage"><span>Recycler définitivement {toRecycle.ids.length} artefact{toRecycle.ids.length > 1 ? "s" : ""} contre {number.format(toRecycle.total)} Ryō ?</span><button type="button" className="ui-button" disabled={pending} onClick={confirmRecycle}>Confirmer</button><button type="button" className="ui-button" onClick={() => setToRecycle(null)}>Annuler</button></div>}
    {notice && <p className="inventory-notice" role="status">{notice}</p>}
    <div className="inventory-workspace" data-selected={Boolean(selected)}>
      <div>
        {visible.length ? <div className="inventory-grid mq-inventory-grid" role="group" aria-label="Choisir un objet">
          {visible.map((item) => item.artifact ? <ArtifactTile key={item.key} item={item} selected={selected?.key === item.key} controls="inventory-detail" onSelect={() => selectItem(item.key)} /> : <button type="button" key={item.key} className="inventory-slot mq-inventory-item" data-tone={item.tone} data-empty={item.quantity === 0 || undefined} aria-pressed={selected?.key === item.key} aria-controls={selected ? "inventory-detail" : undefined} aria-label={`${item.name}, ${number.format(item.quantity)} en stock${item.equippedBy ? `, équipé sur ${item.equippedBy.name}` : ""}`} title={`${item.name}${item.equippedBy ? ` · Équipé sur ${item.equippedBy.name}` : ` · ${number.format(item.quantity)}`}`} onClick={() => selectItem(item.key)}>
            <span className={`mq-item-gem mq-gem-${["gold", "blue", "gray", "green", "violet"].indexOf(item.tone) % 5}`}><ItemIcon item={item} size={36} /></span><div className="inventory-item-copy"><h3>{item.name}</h3><p>{item.categories.join(" / ") || "Ressource"}</p></div>{item.equippedBy && <span className="inventory-equipped-badge" title={`Équipé sur ${item.equippedBy.name}`}>✓ {item.equippedBy.name}</span>}<b className="inventory-quantity">×{number.format(item.quantity)}</b>
          </button>)}
        </div> : <div className="inventory-empty"><h3>{category === "Consommables" ? "Aucun consommable pour le moment" : "Aucun objet à afficher"}</h3><p>{query || universe ? "Essaie un autre nom ou un autre univers." : "Tes prochains butins apparaîtront ici. Tu peux aussi afficher les objets non possédés."}</p><Link href="/histoire">Explorer l’histoire</Link></div>}
        <p className="inventory-hint">Sélectionne un objet pour voir sa provenance et ses utilisations.</p>
      </div>
      {selected && <aside ref={detailRef} className="inventory-detail" data-artifact={Boolean(selected.artifact)} style={selected.artifact ? { borderColor: artifactRarity(selected.artifact.rarity).color } : undefined} id="inventory-detail" aria-label="Détails de l’objet" onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); closeDetails(); } }}>
        {selected ? <><button type="button" className="gear-close inventory-detail-close" onClick={closeDetails}>Fermer</button><div className="inventory-art" data-tone={selected.tone}><ItemIcon item={selected} size={170} />{selected.artifact && <span className="artifact-level">+{selected.artifact.level}</span>}</div>
          <p className="inventory-category">{selected.categories.join(" / ") || "Ressource"}{selected.artifact && <> · <span style={{ color: artifactRarity(selected.artifact.rarity).color }}>{artifactRarity(selected.artifact.rarity).label}</span></>}</p><h3>{selected.name}</h3>
          {!selected.artifact && <p className="inventory-description">{selected.description}</p>}
          {selected.artifact?.equippedCard ? <ArtifactOwner character={selected.artifact.equippedCard.character} /> : selected.equippedBy && <p className="inventory-equipped-owner">✓ Équipé sur <b>{selected.equippedBy.name}</b></p>}
          <dl><div><dt>{selected.artifact ? "Rareté" : "En stock"}</dt><dd>{selected.artifact ? artifactRarity(selected.artifact.rarity).label : number.format(selected.quantity)}</dd></div><div><dt>Provenance</dt><dd>{selected.source}</dd></div>
            {selected.artifact && <><div className="inventory-main-stat"><dt><Icon name={artifactStatIcon(selected.artifact.mainStat)} /><strong>{artifactStatLabel(selected.artifact.mainStat)}</strong></dt><dd><strong>{artifactStatValue(selected.artifact.mainStat, selected.artifact.mainValue)}</strong></dd></div>{selected.artifact.subStats.map((stat, index) => <div key={`${stat.stat}-${index}`}><dt><Icon name={artifactStatIcon(stat.stat)} />{artifactStatLabel(stat.stat)}{artifactSubstatUpgrades(stat) > 0 && <span className="substat-upgrades" aria-label={`${artifactSubstatUpgrades(stat)} améliorations`}> +{artifactSubstatUpgrades(stat)}</span>}</dt><dd>{artifactStatValue(stat.stat, stat.value)}</dd></div>)}</>}
          </dl>
          {selected.artifact && <label className="inventory-equip">Carte équipée<select disabled={pending} value={selected.artifact.equippedCard?.id ?? ""} onChange={(event) => {
            const cardId = event.target.value || null;
            setError("");
            startTransition(async () => {
              try {
                const result = await equipArtifactAction(selected.artifact!.id, cardId);
                if (!result.ok) setError(result.error);
                else router.refresh();
              } catch {
                setError("L’opération a échoué, réessaie.");
              }
            });
          }}><option value="">Aucune</option>{cards.map((card) => <option key={card.id} value={card.id}>{card.character.name} #{card.serial}</option>)}</select></label>}
          {selected.artifact && <button type="button" className="inventory-equip-target" disabled={pending || selected.artifact.level >= ARTIFACT_MAX_LEVEL || balance < artifactUpgradeCost(selected.artifact.rarity, selected.artifact.level)} onClick={() => {
            setError("");
            startTransition(async () => {
              try {
                const result = await upgradeArtifactAction(selected.artifact!.id, selected.artifact!.level);
                if (!result.ok) setError(result.error);
                else router.refresh();
              } catch { setError("L’amélioration a échoué, réessaie."); }
            });
          }}>{selected.artifact.level >= ARTIFACT_MAX_LEVEL ? "Niveau maximum +16" : `Améliorer · ${artifactUpgradeCost(selected.artifact.rarity, selected.artifact.level).toLocaleString("fr-FR")} Ryō`}</button>}
          {selected.artifact && <button type="button" className="inventory-equip-target" disabled={pending || !!selected.artifact.equippedCard} title={selected.artifact.equippedCard ? "Retire-le d’abord de la carte" : undefined} onClick={() => recycle([selected.artifact!.id], artifactRecycleValue(selected.artifact!.rarity, selected.artifact!.level))}>{selected.artifact.equippedCard ? "Équipé : recyclage impossible" : `Recycler · +${number.format(artifactRecycleValue(selected.artifact.rarity, selected.artifact.level))} Ryō`}</button>}
          {error && <p role="alert" className="hs-error">{error}</p>}
          <div className="inventory-actions">{selected.links.map((link) => <Link key={link.href} href={link.href}>{link.label}</Link>)}</div>
        </> : <div className="inventory-detail-placeholder"><span aria-hidden="true">◇</span><p>Sélectionne un objet pour découvrir ses détails.</p></div>}
      </aside>}
    </div>
  </section></>;
}
