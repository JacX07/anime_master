"use client";

import { useState } from "react";
import Link from "next/link";
import { ResourceArt } from "@/components/ResourceArt";
import { INVENTORY_CATEGORIES, filterInventory, type InventoryCategory, type InventoryItem } from "@/lib/inventory";
import { UNIVERSES } from "@/lib/story";

const number = new Intl.NumberFormat("fr-FR");
function ItemIcon({ item, size = 64 }: { item: InventoryItem; size?: number }) {
  const fallback = <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true" className="inventory-icon">
    {item.icon === "heart" ? <><path d="M32 54 9 29l7-16 13 5 3 8 5-8 13-5 5 16Z" fill="#b58af5" stroke="#e7d4ff" strokeWidth="1.5" /><path d="m16 13 11 19 5 22 5-22 13-19M9 29l18 3 5-6 5 6 18-3" fill="none" stroke="#eee0ff" /></> : item.icon === "ore" ? <><path d="m8 43 8-24 16-9 21 17 4 21-22 9Z" fill="#a0b0c7" stroke="#e1e9f5" /><path d="m16 19 16 8 21 0-18 18-27-2m24-33v17l3 18v12" fill="none" stroke="#576e91" strokeWidth="2" /><path d="m37 18 10 8-9 8-4-9" fill="#f5d79d" /></> : item.icon === "weapon" ? <><path d="m44 6 13 1-1 13-28 27-10-10Z" fill="#d3e9f6" stroke="#effaff" /><path d="m49 13-26 29" stroke="#79aac7" strokeWidth="3" /><path d="m12 33 23 23 5-5-23-23Z" fill="#dfbd78" /><path d="m9 56 14-15 6 6-14 15Z" fill="#8a6abd" stroke="#dbc9f7" /></> : <><path d="m32 5 17 15-6 29-11 10-17-16 4-24Z" fill="#73c8ed" stroke="#c9f1ff" /><path d="m32 5-5 21 5 33 11-10-3-25Z" fill="#c8efff" /><path d="m19 19 8 7 13-2 9-4M15 43l12-17" fill="none" stroke="#398dbb" /></>}
  </svg>;
  return item.resource ? <ResourceArt key={item.resource} resource={item.resource} size={size} fallback={fallback} /> : fallback;
}

export function InventoryGrid({ items }: { items: InventoryItem[] }) {
  const [category, setCategory] = useState<InventoryCategory>("Tout");
  const [query, setQuery] = useState("");
  const [universe, setUniverse] = useState("");
  const [sort, setSort] = useState("quantity");
  const [showEmpty, setShowEmpty] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const visible = filterInventory(items, category, query, universe, showEmpty, sort);
  const selected = visible.find((item) => item.key === selectedKey) ?? visible[0];
  const slots = Math.max(40, Math.ceil(visible.length / 10) * 10);
  return <section className="inventory" aria-label="Objets et matériaux">
    <div className="inventory-heading"><div><h2>Objets & matériaux</h2><p>Tout ce qu’il te faut pour progresser.</p></div><span className="inventory-stock">Stockage sans limite</span></div>
    <div className="inventory-tabs" role="group" aria-label="Catégorie d’objet">
      {INVENTORY_CATEGORIES.map((tab) => <button key={tab} type="button" aria-pressed={category === tab} onClick={() => setCategory(tab)}>{tab}</button>)}
    </div>
    <div className="inventory-toolbar">
      <label className="inventory-search"><span className="sr-only">Rechercher un objet</span><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="10" cy="10" r="6" /><path d="m15 15 6 6" /></svg><input type="search" placeholder="Rechercher un objet…" value={query} onChange={(e) => setQuery(e.target.value)} /></label>
      <label><span className="sr-only">Filtrer par univers</span><select value={universe} onChange={(e) => setUniverse(e.target.value)}><option value="">Tous les univers</option><option value="common">Commun</option>{UNIVERSES.map((u) => <option key={u.key} value={u.key}>{u.name}</option>)}</select></label>
      <label><span className="sr-only">Trier les objets</span><select value={sort} onChange={(e) => setSort(e.target.value)}><option value="quantity">Quantité décroissante</option><option value="name">Nom de A à Z</option></select></label>
    </div>
    <div className="inventory-options"><p role="status">{visible.length} objet{visible.length > 1 ? "s" : ""} affiché{visible.length > 1 ? "s" : ""}</p><label><input type="checkbox" checked={showEmpty} onChange={(e) => setShowEmpty(e.target.checked)} />Afficher les non possédés</label></div>
    <div className="inventory-workspace">
      <div>
        {visible.length ? <div className="inventory-grid" role="group" aria-label="Choisir un objet">
          {visible.map((item) => <button type="button" key={item.key} className="inventory-slot" data-tone={item.tone} data-empty={item.quantity === 0 || undefined} aria-pressed={selected?.key === item.key} aria-controls="inventory-detail" aria-label={`${item.name}, ${number.format(item.quantity)} en stock`} title={`${item.name} · ${number.format(item.quantity)}`} onClick={() => setSelectedKey(item.key)}>
            <ItemIcon item={item} /><span className="inventory-quantity">{number.format(item.quantity)}</span>
          </button>)}
          {Array.from({ length: slots - visible.length }, (_, i) => <span key={`empty-${i}`} className="inventory-slot inventory-slot-empty" aria-hidden="true" />)}
        </div> : <div className="inventory-empty"><h3>{category === "Consommables" ? "Aucun consommable pour le moment" : "Aucun objet à afficher"}</h3><p>{query || universe ? "Essaie un autre nom ou un autre univers." : "Tes prochains butins apparaîtront ici. Tu peux aussi afficher les objets non possédés."}</p><Link href="/histoire">Explorer l’histoire</Link></div>}
        <p className="inventory-hint">Sélectionne une case pour voir sa provenance et ses utilisations.</p>
      </div>
      <aside className="inventory-detail" id="inventory-detail" aria-label="Détails de l’objet">
        {selected ? <><div className="inventory-art" data-tone={selected.tone}><ItemIcon item={selected} size={128} /></div>
          <p className="inventory-category">{selected.categories.join(" / ") || "Ressource"}</p><h3>{selected.name}</h3>
          <p className="inventory-description">{selected.description}</p>
          <dl><div><dt>En stock</dt><dd>{number.format(selected.quantity)}</dd></div><div><dt>Provenance</dt><dd>{selected.source}</dd></div></dl>
          <div className="inventory-actions">{selected.links.map((link) => <Link key={link.href} href={link.href}>{link.label}</Link>)}</div>
        </> : <div className="inventory-detail-placeholder"><span aria-hidden="true">◇</span><p>Sélectionne un objet pour découvrir ses détails.</p></div>}
      </aside>
    </div>
  </section>;
}
