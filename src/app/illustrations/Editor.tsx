"use client";

import { useState } from "react";
import styles from "./editor.module.css";
export type ArtItem = { key: string; name: string; detail: string; group: "characters" | "resources"; rarity?: string; url: string | null; custom: boolean };
const PAGE_SIZE = 48;
export function Editor({ initialItems }: { initialItems: ArtItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [group, setGroup] = useState("characters");
  const [query, setQuery] = useState("");
  const [rarity, setRarity] = useState("");
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const filtered = items.filter((item) => item.group === group && (group !== "characters" || !rarity || item.rarity === rarity) && `${item.name} ${item.detail}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
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
  return <>
    <div className={styles.filters}>
      <button type="button" className="vt-chip" aria-pressed={group === "characters"} onClick={() => { setGroup("characters"); setPage(1); }}>Personnages</button>
      <button type="button" className="vt-chip" aria-pressed={group === "resources"} onClick={() => { setGroup("resources"); setPage(1); }}>Objets et ressources</button>
      <label>Rechercher <input type="search" value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} /></label>
      {group === "characters" && <label>Rareté <select value={rarity} onChange={(e) => { setRarity(e.target.value); setPage(1); }}><option value="">Toutes</option>{["UR", "SSR", "SR", "R", "N"].map((r) => <option key={r}>{r}</option>)}</select></label>}
    </div>
    <p role="status" className={styles.message}>{message || `${filtered.length} éléments`}</p>
    {!filtered.length && <p>Aucun résultat. Essaie un autre nom.</p>}
    <ul className={styles.grid}>{filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((item) => <li key={item.key} className={styles.item}>
      <div className={styles.preview}>{item.url ?
        // eslint-disable-next-line @next/next/no-img-element
        <img key={item.url} src={item.url} alt={item.name} loading="lazy" /> : <span>Image à ajouter</span>}</div>
      <b>{item.name}</b><small>{item.detail}</small><small>{item.custom ? "Image personnalisée" : "Visuel d’origine"}</small>
      <label className={styles.upload}>{busy === item.key ? "Enregistrement…" : "Choisir une image"}<input aria-label={`Image de ${item.name}`} type="file" accept="image/png,image/jpeg,image/webp" disabled={busy !== null} onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ""; if (file) void update(item, file); }} /></label>
      {item.custom && <button type="button" className="vt-chip" disabled={busy !== null} onClick={() => void update(item)}>Rétablir l’origine</button>}
    </li>)}</ul>
    <nav className={styles.filters} aria-label="Pages des illustrations"><button type="button" className="vt-chip" disabled={page === 1} onClick={() => setPage(page - 1)}>Précédente</button><span>{page} / {pages}</span><button type="button" className="vt-chip" disabled={page >= pages} onClick={() => setPage(page + 1)}>Suivante</button></nav>
  </>;
}
