"use client";

import { useRef, useState } from "react";
import { Icon } from "@/components/icons";
import "./editor.css";
export type ArtItem = { key: string; name: string; detail: string; group: "characters" | "resources"; rarity?: string; url: string | null; custom: boolean };
const PAGE_SIZE = 24;
export function Editor({ initialItems }: { initialItems: ArtItem[] }) {
  const inspector = useRef<HTMLElement>(null);
  const [items, setItems] = useState(initialItems);
  const [selectedKey, setSelectedKey] = useState(initialItems[0]?.key ?? "");
  const [dragging, setDragging] = useState(false);
  const [group, setGroup] = useState("characters");
  const [query, setQuery] = useState("");
  const [rarity, setRarity] = useState("");
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const filtered = items.filter((item) => item.group === group && (group !== "characters" || !rarity || item.rarity === rarity) && `${item.name} ${item.detail}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const selected = visible.find((item) => item.key === selectedKey) ?? visible[0];
  async function update(item: ArtItem, file?: File) {
    if (file && (file.size > 5 * 1024 * 1024 || !["image/png", "image/jpeg", "image/webp"].includes(file.type))) { setMessage("Choisis un PNG, JPEG ou WebP de 5 Mo maximum."); return; }
    setBusy(item.key); setMessage("");
    try {
      const form = new FormData();
      if (file) form.set("image", file);
      const response = await fetch(`/api/illustrations/${item.key}`, { method: file ? "POST" : "DELETE", body: file ? form : undefined });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Enregistrement impossible.");
      setItems((current) => current.map((entry) => entry.key === item.key ? { ...entry, url: result.url, custom: Boolean(file) } : entry));
      setMessage(`${item.name} : ${file ? "image enregistrée" : "visuel d’origine rétabli"}.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Enregistrement impossible. Réessaie."); }
    finally { setBusy(null); }
  }
  return <div className="art-editor">
    <div className="art-toolbar">
      <div className="art-tabs" aria-label="Catégorie d’illustration">
        {([["characters", "Personnages"], ["resources", "Objets et ressources"]] as const).map(([key, label]) => <button key={key} type="button" aria-pressed={group === key} onClick={() => { setGroup(key); setPage(1); setMessage(""); }}>{label}<span>{items.filter((item) => item.group === key).length}</span></button>)}
      </div>
      <label className="art-search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></svg><span className="art-sr">Rechercher</span><input type="search" placeholder={group === "characters" ? "Un personnage, un anime…" : "Un objet, une ressource…"} value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} /></label>
    </div>
    <div className="art-filterbar">
      {group === "characters" && <div className="art-rarities" aria-label="Filtrer par rareté">{["", "UR", "SSR", "SR", "R", "N"].map((r) => <button type="button" key={r} aria-pressed={rarity === r} style={r ? { "--art-rarity": `var(--rarity-${r})` } as React.CSSProperties : undefined} onClick={() => { setRarity(r); setPage(1); }}>{r || "Toutes"}</button>)}</div>}
      <p className="art-count">{filtered.length.toLocaleString("fr-FR")} {group === "characters" ? "personnages" : "objets et ressources"}</p>
    </div>
    {message && <p role="status" className="art-message">{message}</p>}
    <div className="art-workspace">
      <section className="art-catalog" aria-label="Galerie des illustrations">
        {!filtered.length && <div className="art-empty"><h2>Aucun résultat</h2><p>Essaie un autre nom ou une autre rareté.</p></div>}
        <ul className="art-grid">{visible.map((item) => <li key={item.key}>
          <button type="button" className="art-tile" aria-pressed={selected?.key === item.key} onClick={() => { setSelectedKey(item.key); if (matchMedia("(max-width: 760px)").matches) inspector.current?.scrollIntoView({ block: "start" }); }}>
            <div className={`art-thumbnail ${group === "resources" ? "art-object" : ""}`}>
              {item.url ?
                // eslint-disable-next-line @next/next/no-img-element
                <img key={item.url} src={item.url} alt="" loading="lazy" /> : <Icon name="bonus" />}
              {item.rarity && <span className="art-rarity" style={{ color: `var(--rarity-${item.rarity})` }}>{item.rarity}</span>}
              {item.custom && <span className="art-custom" title="Image personnalisée" aria-label="Image personnalisée">✓</span>}
            </div>
            <span className="art-tile-name">{item.name}</span><span className="art-tile-series">{item.detail.replace(/^[A-Z]+ · /, "")}</span>
          </button>
        </li>)}</ul>
        {filtered.length > 0 && <nav className="art-pagination" aria-label="Pages des illustrations"><button type="button" disabled={page === 1} onClick={() => setPage(page - 1)}>Précédente</button><span>Page {page} sur {pages}</span><button type="button" disabled={page >= pages} onClick={() => setPage(page + 1)}>Suivante</button></nav>}
      </section>
      {selected && <aside ref={inspector} className="art-inspector" aria-label={`Modifier l’illustration de ${selected.name}`}>
        <div className={`art-large-preview ${group === "resources" ? "art-object" : ""}`}>
          {selected.url ?
            // eslint-disable-next-line @next/next/no-img-element
            <img key={selected.url} src={selected.url} alt={`Illustration de ${selected.name}`} /> : <div className="art-no-image"><Icon name="bonus" /><span>Ton illustration apparaîtra ici</span></div>}
        </div>
        <div className="art-inspector-body">
          <div className="art-inspector-heading"><h2>{selected.name}</h2>{selected.rarity && <span style={{ color: `var(--rarity-${selected.rarity})` }}>{selected.rarity}</span>}</div>
          <p className="art-series">{selected.detail.replace(/^[A-Z]+ · /, "")}</p>
          <p className="art-image-status"><i data-custom={selected.custom} />{selected.custom ? "Illustration personnalisée" : selected.url ? "Illustration d’origine" : "Aucune illustration"}</p>
          <label className={`art-dropzone ${dragging ? "art-dragging" : ""} ${busy ? "art-disabled" : ""}`} onDragOver={(e) => { e.preventDefault(); if (!busy) setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(e) => { e.preventDefault(); setDragging(false); const file = e.dataTransfer.files[0]; if (file && !busy) void update(selected, file); }}>
            <Icon name="nav-album" /><strong>{busy === selected.key ? "Enregistrement…" : "Importer une image"}</strong><span>ou glisse ton fichier ici</span>
            <input className="art-sr" aria-label={`Image de ${selected.name}`} type="file" accept="image/png,image/jpeg,image/webp" disabled={busy !== null} onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ""; if (file) void update(selected, file); }} />
          </label>
          <p className="art-file-help">PNG, JPEG ou WebP · 5 Mo max.<br />L’image est enregistrée dès l’import.</p>
          {selected.custom && <button type="button" className="art-reset" disabled={busy !== null} onClick={() => void update(selected)}>Rétablir l’illustration d’origine</button>}
        </div>
      </aside>}
    </div>
  </div>;
}
