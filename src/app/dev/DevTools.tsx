"use client";

import { useActionState, useEffect, useState, useTransition, type ReactNode } from "react";
import { RarityGem } from "@/components/icons";
import { devAction, searchAction, type DevState, type FoundCharacter } from "./actions";

type Option = { key: string; name: string };
const RARITIES = ["UR", "SSR", "SR", "R", "N"] as const;

/** Un formulaire d'outil : son propre retour, pour savoir quelle action a répondu. */
function DevForm({ op, submit, children, hidden }: { op: string; submit: string; children: ReactNode; hidden?: Record<string, string | number> }) {
  const [state, run, pending] = useActionState<DevState, FormData>(devAction, null);
  return (
    <form action={run} className="dev-form">
      <input type="hidden" name="op" value={op} />
      {hidden && Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <div className="dev-fields">{children}</div>
      <button type="submit" className="ui-button" disabled={pending}>{pending ? "…" : submit}</button>
      {state && <p className={state.ok ? "dev-ok" : "dev-ko"} role="status">{state.message}</p>}
    </form>
  );
}

const Num = ({ name, label, value, min, max }: { name: string; label: string; value: number; min?: number; max?: number }) =>
  <label><span>{label}</span><input name={name} type="number" defaultValue={value} min={min} max={max} step={1} required /></label>;

const Select = ({ name, label, options }: { name: string; label: string; options: Option[] }) =>
  <label><span>{label}</span><select name={name}>{options.map((o) => <option key={o.key} value={o.key}>{o.name}</option>)}</select></label>;

const rarityOptions = (all?: string) => [...(all ? [{ key: "ALL", name: all }] : []), ...RARITIES.map((r) => ({ key: r, name: r }))];

function CharacterPicker() {
  const [q, setQ] = useState("");
  const [found, setFound] = useState<FoundCharacter[]>([]);
  const [picked, setPicked] = useState<FoundCharacter | null>(null);
  const [searching, startSearch] = useTransition();

  useEffect(() => {
    const t = window.setTimeout(() => startSearch(async () => {
      try { setFound(q.trim().length >= 2 ? await searchAction(q) : []); } catch { setFound([]); }
    }), 250);
    return () => window.clearTimeout(t);
  }, [q]);

  return (
    <div className="dev-picker">
      <label className="dev-search"><span>Rechercher un personnage</span>
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Luffy, Gojo, Mikasa…" autoComplete="off" />
      </label>
      {searching && <p className="dev-note">Recherche…</p>}
      {found.length > 0 && (
        <ul className="dev-results">
          {found.map((c) => (
            <li key={c.id}>
              <button type="button" aria-pressed={picked?.id === c.id} onClick={() => setPicked(c)}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.imageUrl} alt="" referrerPolicy="no-referrer" />
                <span>{c.name}</span>
                <RarityGem rarity={c.rarity} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {picked && (
        <DevForm op="give" submit={`Donner ${picked.name}`} hidden={{ character: picked.id, label: picked.name }}>
          <Num name="copies" label="Exemplaires" value={1} min={1} max={50} />
          <Num name="stars" label="Éveil (0 à 5)" value={0} min={0} max={5} />
        </DevForm>
      )}
    </div>
  );
}

export function DevTools({ universes, dungeons, materials, summary }: {
  universes: Option[];
  dungeons: Option[];
  materials: Option[];
  summary: { label: string; value: string }[];
}) {
  return (
    <div className="dev-tools">
      <dl className="dev-summary">
        {summary.map((s) => <div key={s.label}><dt>{s.label}</dt><dd>{s.value}</dd></div>)}
      </dl>

      <section className="dev-panel" aria-labelledby="dev-cards">
        <h2 id="dev-cards">Personnages</h2>
        <CharacterPicker />
        <h3>Lot au hasard</h3>
        <DevForm op="random" submit="Donner le lot">
          <Select name="rarity" label="Rareté" options={rarityOptions()} />
          <Num name="count" label="Nombre" value={10} min={1} max={100} />
          <Num name="stars" label="Éveil (0 à 5)" value={0} min={0} max={5} />
        </DevForm>
      </section>

      <section className="dev-panel" aria-labelledby="dev-awaken">
        <h2 id="dev-awaken">Éveil des cartes</h2>
        <DevForm op="stars" submit="Appliquer l'éveil">
          <Select name="rarity" label="Cartes" options={rarityOptions("Toutes")} />
          <Num name="stars" label="Étoiles (0 à 5)" value={5} min={0} max={5} />
        </DevForm>
      </section>

      <section className="dev-panel" aria-labelledby="dev-level">
        <h2 id="dev-level">Arpenteur</h2>
        <p className="dev-note">Donjons dès le niveau 5, Raids 15, Tour 20, Expéditions 25 (avec l&apos;histoire requise).</p>
        <DevForm op="level" submit="Fixer le niveau">
          <Num name="level" label="Niveau (1 à 50)" value={25} min={1} max={50} />
        </DevForm>
      </section>

      <section className="dev-panel" aria-labelledby="dev-progress">
        <h2 id="dev-progress">Progression</h2>
        <h3>Histoire</h3>
        <DevForm op="story" submit="Appliquer">
          <Select name="universe" label="Jusqu'à l'univers" options={universes} />
          <Num name="level" label="Combats gagnés (0 à 15)" value={15} min={0} max={15} />
        </DevForm>
        <h3>Tour</h3>
        <DevForm op="tower" submit="Fixer l'étage">
          <Num name="floor" label="Étage atteint (0 à 500)" value={50} min={0} max={500} />
        </DevForm>
        <h3>Donjons</h3>
        <DevForm op="dungeon" submit="Fixer la difficulté">
          <Select name="dungeon" label="Donjon" options={dungeons} />
          <Num name="level" label="Difficulté vaincue (0 à 10)" value={10} min={0} max={10} />
        </DevForm>
      </section>

      <section className="dev-panel" aria-labelledby="dev-resources">
        <h2 id="dev-resources">Ressources</h2>
        <DevForm op="ryo" submit="Ajouter des Ryō">
          <Num name="amount" label="Ryō" value={10000} />
        </DevForm>
        <DevForm op="crystals" submit="Ajouter des cristaux">
          <Num name="amount" label="Cristaux" value={500} />
        </DevForm>
        <DevForm op="materials" submit="Ajouter les matériaux">
          <Select name="key" label="Matériau" options={[{ key: "ALL", name: "Tous les matériaux" }, ...materials]} />
          <Num name="amount" label="Quantité" value={100} min={1} />
        </DevForm>
      </section>
    </div>
  );
}
