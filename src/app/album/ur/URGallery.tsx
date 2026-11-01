"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { CharacterCard, type CharacterCardProps } from "@/components/CharacterCard";
import styles from "./gallery.module.css";

type GalleryCharacter = CharacterCardProps & { id: number };

export function URGallery({ characters }: { characters: GalleryCharacter[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [index, setIndex] = useState(0);
  const character = characters[index];
  const move = (delta: number) => setIndex((current) => Math.max(0, Math.min(characters.length - 1, current + delta)));

  if (!character) return <p className="vt-empty">Aucune carte UR disponible pour le moment.</p>;

  return (
    <>
      <p className="vt-count">{characters.length} illustration{characters.length > 1 ? "s" : ""} UR</p>
      <ul className={styles.grid}>
        {characters.map((item, position) => (
          <li key={item.id}>
            <button
              type="button"
              className={styles.card}
              aria-label={`Agrandir l’illustration de ${item.name}`}
              aria-haspopup="dialog"
              onClick={() => {
                setIndex(position);
                dialog.current?.showModal();
              }}
            >
              <CharacterCard {...item} characterId={item.id} />
            </button>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialog}
        className={styles.viewer}
        aria-labelledby="ur-illustration-title"
        onClick={(event) => {
          if (event.target === event.currentTarget) dialog.current?.close();
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            move(event.key === "ArrowLeft" ? -1 : 1);
          }
        }}
      >
        <div className={styles.content}>
          <header className={styles.header}>
            <div aria-live="polite">
              <h2 id="ur-illustration-title">{character.name}</h2>
              {character.series && <p className="vt-muted">{character.series}</p>}
            </div>
            <button type="button" className={styles.control} onClick={() => dialog.current?.close()}>Fermer</button>
          </header>
          {/* Illustration servie directement par le CDN AniList, sans recadrage. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img key={character.id} className={styles.art} src={character.imageUrl} alt={`Illustration de ${character.name}`} referrerPolicy="no-referrer" />
          <nav className={styles.controls} aria-label="Parcourir les illustrations UR">
            <button type="button" className={styles.control} disabled={index === 0} onClick={() => move(-1)}>Précédente</button>
            <span aria-live="polite">{index + 1} / {characters.length}</span>
            <button type="button" className={styles.control} disabled={index === characters.length - 1} onClick={() => move(1)}>Suivante</button>
          </nav>
          <Link href={`/character/${character.id}`} className={styles.detail}>Voir la fiche du personnage</Link>
          <p className={styles.hint}>Flèches pour parcourir · Échap pour fermer</p>
        </div>
      </dialog>
    </>
  );
}
