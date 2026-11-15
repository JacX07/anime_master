"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { Rarity } from "@/generated/prisma/enums";
import { Icon, RarityGem } from "@/components/icons";
import { closeOnBackdrop } from "@/lib/dialog";

type Character = { id: number; name: string; imageUrl: string; rarity: Rarity };

export function HomeCharacter({ userId, characters }: { userId: string; characters: Character[] }) {
  const storageKey = `home-character:${userId}`;
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [admiring, setAdmiring] = useState(false);
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(60);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    try {
      const saved = Number(localStorage.getItem(storageKey));
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Préférence locale relue après hydratation, sans modifier l'avatar.
      if (characters.some((character) => character.id === saved)) setSelectedId(saved);
    } catch { /* Le choix reste utilisable lorsque le stockage est indisponible. */ }
  }, [storageKey, characters]);
  useEffect(() => {
    if (!admiring) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setAdmiring(false); };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [admiring]);
  const selected = characters.find((character) => character.id === selectedId) ?? characters[0];
  const needle = query.trim().toLocaleLowerCase("fr");
  const shown = characters.filter((character) => character.name.toLocaleLowerCase("fr").includes(needle));

  return <section className="mobile-home-hero" aria-label="Personnage d’accueil" data-admiring={admiring || undefined}>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img className="mobile-home-art" src={selected?.imageUrl ?? "/images/backgrounds/accueil.webp"} alt={selected ? selected.name : ""} referrerPolicy="no-referrer" />
    <div className="mobile-home-copy" style={selected ? { "--home-rarity": `var(--rarity-${selected.rarity})` } as CSSProperties : undefined}>
      {selected ? <><span className="mobile-home-rarity" style={{ color: `var(--rarity-${selected.rarity})` }}><RarityGem rarity={selected.rarity} />{selected.rarity}</span><h1>{selected.name}</h1><small>Ton personnage d’accueil</small></>
        : <><small>ANIMA CLASH</small><h1>La Faille vous appelle.</h1><small>Ta prochaine légende t’attend.</small></>}
    </div>
    {characters.length > 0 && <button type="button" className="mobile-home-change" onClick={() => { setQuery(""); setLimit(60); dialog.current?.showModal(); }}><Icon name="modifier" />Changer</button>}
    <button type="button" className="home-admire home-desktop-only" aria-pressed={admiring} onClick={() => setAdmiring(!admiring)}>{admiring ? "Revenir au menu" : "Admirer"}</button>
    <dialog ref={dialog} className="mobile-character-picker" aria-labelledby="home-character-title" onClick={closeOnBackdrop}>
      <div className="mobile-character-head"><h2 id="home-character-title">Personnage d’accueil</h2><button type="button" className="ui-button" onClick={() => dialog.current?.close()}>Fermer</button></div>
      <p>Choisis une illustration parmi tes personnages. Ton avatar reste inchangé.</p>
      <input type="search" aria-label="Rechercher un personnage d’accueil" placeholder="Nom du personnage…" value={query} onChange={(event) => { setQuery(event.target.value); setLimit(60); }} />
      <div className="mobile-character-grid">
        {shown.slice(0, limit).map((character) => <button key={character.id} type="button" aria-pressed={selected?.id === character.id} onClick={() => {
          setSelectedId(character.id);
          try { localStorage.setItem(storageKey, String(character.id)); } catch { /* Choix conservé pour cette visite. */ }
          dialog.current?.close();
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={character.imageUrl} alt="" loading="lazy" referrerPolicy="no-referrer" />
          <b>{character.name}</b><small>{character.rarity}</small>
        </button>)}
      </div>
      {shown.length > limit && <button type="button" className="ui-button" onClick={() => setLimit((count) => count + 60)}>Afficher plus ({shown.length - limit} restants)</button>}
      {!shown.length && <p role="status">Aucun personnage ne correspond.</p>}
    </dialog>
  </section>;
}
