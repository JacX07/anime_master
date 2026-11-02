"use client";
import { teamPowers } from "@/lib/team-power";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { PageHeading } from "@/components/mq/PageHeading";
import { CharacterCard } from "@/components/CharacterCard";
import { setAttackTeamAction, setDefenseTeamAction } from "@/app/battle-actions";
import type { getPlayerInventory } from "@/lib/player-inventory";
import type { SavedSquad, SquadSlots } from "@/lib/squads";
import { RARITY_NAMES, TYPE_LABELS } from "@/lib/labels";
import { CardDialog, type TeamCard } from "./TeamBuilder";
import { saveSquadAction } from "./actions";
import "./squads.css";

type Kind = "ATTACK" | "DEFENSE";
const empty = (): SquadSlots => [null, null, null, null];
const same = (a: SquadSlots, b: SquadSlots) => a.join() === b.join();
const builtin = (id: string): id is Kind => id === "ATTACK" || id === "DEFENSE";
export function SquadManager({ cards, presets, saved, inventory }: {
  cards: TeamCard[]; presets: SavedSquad[]; saved: Record<Kind, SquadSlots>;
  inventory: Awaited<ReturnType<typeof getPlayerInventory>>;
}) {
  const [squads, setSquads] = useState<SavedSquad[]>([
    { id: "ATTACK", name: "Attaque", slots: saved.ATTACK },
    { id: "DEFENSE", name: "Défense", slots: saved.DEFENSE }, ...presets,
  ]);
  const [selected, setSelected] = useState("ATTACK");
  const current = squads.find((s) => s.id === selected)!;
  const [draft, setDraft] = useState<SquadSlots>(current.slots);
  const [name, setName] = useState(current.name);
  const [editing, setEditing] = useState(false);
  const [target, setTarget] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [query, setQuery] = useState("");
  const [rarity, setRarity] = useState("");
  const [type, setType] = useState("");
  const [shown, setShown] = useState(50);
  const [focus, setFocus] = useState<TeamCard | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const picker = useRef<HTMLDialogElement>(null);
  const creator = useRef<HTMLDialogElement>(null);
  const byId = useMemo(() => new Map(cards.map((card) => [card.id, card])), [cards]);
  // Sold, traded or auctioned cards are shown as empty slots, never silently replaced.
  const slots = draft.map((id) => id && byId.has(id) ? id : null);
  const selectedCards = slots.flatMap((id) => id ? [byId.get(id)!] : []);
  const powers = teamPowers(selectedCards, inventory.items);
  const powerById = new Map(selectedCards.map((card, index) => [card.id, powers[index]]));
  const members = slots.map((id) => id ? { ...byId.get(id)!, power: powerById.get(id)! } : null);
  const full = slots.every(Boolean);
  const dirty = editing && (!same(draft, current.slots) || name !== current.name);
  const filtered = useMemo(() => cards.filter((c) => (!rarity || c.rarity === rarity) && (!type || c.type === type) && `${c.name} ${c.series ?? ""}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())), [cards, rarity, type, query]);
  useEffect(() => {
    const dialog = picker.current;
    if (target !== null && dialog && !dialog.open) dialog.showModal();
    if (target === null && dialog?.open) dialog.close();
  }, [target]);
  useEffect(() => {
    const dialog = creator.current;
    if (creating && dialog && !dialog.open) dialog.showModal();
    if (!creating && dialog?.open) dialog.close();
  }, [creating]);
  useEffect(() => {
    if (!dirty) return;
    const unload = (event: BeforeUnloadEvent) => event.preventDefault();
    const navigate = (event: MouseEvent) => {
      const link = (event.target as Element)?.closest("a[href]");
      if (link && !window.confirm("Abandonner les modifications de cette squad ?")) { event.preventDefault(); event.stopPropagation(); }
    };
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", navigate, true);
    return () => { window.removeEventListener("beforeunload", unload); document.removeEventListener("click", navigate, true); };
  }, [dirty]);
  function choose(squad: SavedSquad) {
    if (dirty && !window.confirm("Abandonner les modifications de cette squad ?")) return;
    setSelected(squad.id); setDraft(squad.slots); setName(squad.name); setEditing(false); setMessage(null);
  }
  function openPicker(index: number) {
    setQuery(""); setRarity(""); setType(""); setShown(50); setTarget(index);
  }
  function save() {
    start(async () => {
      try {
        if (builtin(selected)) {
          const result = await (selected === "ATTACK" ? setAttackTeamAction(slots as string[]) : setDefenseTeamAction(slots as string[]));
          if (!result.ok) { setMessage({ ok: false, text: result.error }); return; }
        } else {
          const result = await saveSquadAction(selected, name, slots);
          if (!result.ok) { setMessage({ ok: false, text: result.error }); return; }
        }
        setSquads((all) => all.map((s) => s.id === selected ? { ...s, name: name.trim(), slots } : s));
        setDraft(slots); setName(name.trim()); setEditing(false); setMessage({ ok: true, text: "Squad enregistrée." });
      } catch { setMessage({ ok: false, text: "Enregistrement impossible, réessaie." }); }
    });
  }
  function activate(kind: Kind) {
    start(async () => {
      try {
        const result = await (kind === "ATTACK" ? setAttackTeamAction(slots as string[]) : setDefenseTeamAction(slots as string[]));
        if (!result.ok) { setMessage({ ok: false, text: result.error }); return; }
        setSquads((all) => all.map((s) => s.id === kind ? { ...s, slots } : s));
        setMessage({ ok: true, text: `Squad utilisée en ${kind === "ATTACK" ? "attaque" : "défense"}.` });
      } catch { setMessage({ ok: false, text: "Activation impossible, réessaie." }); }
    });
  }
  return <div className="squads-manager">
    <PageHeading eyebrow="COMMANDEMENT TACTIQUE" title="Squads" description="Composez et gérez vos escouades pour chaque bataille."><button className="ui-button" disabled={pending} onClick={() => { if (!dirty || window.confirm("Abandonner les modifications de cette squad ?")) { setNewName(""); setCreating(true); } }}>+ Nouvelle squad</button></PageHeading>
    <div className="squads-layout">
      <nav className="squads-list" aria-label="Mes squads">
        {squads.map((s, index) => <button key={s.id} className="squad-summary" aria-pressed={selected === s.id} disabled={pending} onClick={() => choose(s)}>
          <span>{String(index + 1).padStart(2, "0")}</span><div><b>{s.name}</b><small>{s.slots.filter((id) => id && byId.has(id)).length} / 4 membres{builtin(s.id) ? ` · ${s.id === "ATTACK" ? "Attaque active" : "Défense active"}` : ""}</small></div>
        </button>)}
      </nav>
      <section className="squad-stage" aria-label="Squad sélectionnée">
        <div className="squad-stage-head"><h2>{current.name}</h2><span>Puissance totale <b>{new Intl.NumberFormat("fr-FR").format(members.reduce((sum, c) => sum + (c?.power ?? 0), 0))}</b></span></div>
        {editing && !builtin(selected) && <label className="squad-name">Nom de la squad<input value={name} maxLength={60} onChange={(e) => setName(e.target.value)} /></label>}
        <div className="squad-members">
          {members.map((card, index) => <div key={index} className="squad-member">
            <button className="squad-card" disabled={pending} aria-label={`${editing ? "Remplacer" : "Voir"} ${card?.name ?? `emplacement ${index + 1}`}`} onClick={() => { if (editing) openPicker(index); else if (card) setFocus(card); }}>
              {card ? <CharacterCard {...card} /> : <span className="squad-empty">{editing ? "+ Choisir un personnage" : "Emplacement vide"}</span>}
            </button>
            <small>{index === 0 ? "Leader" : `Poste ${index + 1}`}</small>
            {editing && card && <button className="ui-button" disabled={pending} onClick={() => setDraft(slots.map((id, i) => i === index ? null : id))}>Retirer</button>}
          </div>)}
        </div>
        <div className="squad-actions">
          {editing ? <><button className="ui-button" disabled={pending || !name.trim() || (builtin(selected) && !full)} onClick={save}>{pending ? "Enregistrement…" : "Enregistrer la squad"}</button><button className="ui-button" disabled={pending} onClick={() => { setDraft(current.slots); setName(current.name); setEditing(false); setMessage(null); }}>Annuler</button></> : <>
            <button className="ui-button" disabled={pending} onClick={() => { setEditing(true); setMessage(null); }}>Modifier la squad</button>
            {!builtin(selected) && <><button className="ui-button" disabled={pending || !full} onClick={() => activate("ATTACK")}>Utiliser en attaque</button><button className="ui-button" disabled={pending || !full} onClick={() => activate("DEFENSE")}>Utiliser en défense</button></>}
          </>}
        </div>
        {message && <p role={message.ok ? "status" : "alert"}>{message.text}</p>}
      </section>
    </div>
    <dialog ref={creator} className="squad-modal squad-create" aria-labelledby="squad-create-title" onClose={() => setCreating(false)}>
      <form onSubmit={(event) => { event.preventDefault(); start(async () => { try { const result = await saveSquadAction(null, newName, empty()); if (!result.ok) { setMessage({ ok: false, text: result.error }); return; } setSquads((all) => [...all, result.squad]); setSelected(result.squad.id); setName(result.squad.name); setDraft(empty()); setEditing(true); setCreating(false); setMessage(null); } catch { setMessage({ ok: false, text: "Création impossible, réessaie." }); } }); }}>
        <h2 id="squad-create-title">Nouvelle squad</h2><label>Nom<input autoFocus required maxLength={60} value={newName} onChange={(e) => setNewName(e.target.value)} /></label>
        <button className="ui-button" disabled={pending || !newName.trim()}>Créer la squad</button><button type="button" className="ui-button" disabled={pending} onClick={() => setCreating(false)}>Annuler</button>
        {message && !message.ok && <p role="alert">{message.text}</p>}
      </form>
    </dialog>
    <dialog ref={picker} className="squad-modal squad-picker" aria-labelledby="squad-picker-title" onClose={() => setTarget(null)} onClick={(e) => { if (e.target === e.currentTarget) setTarget(null); }}>
      {target !== null && <><div className="squad-picker-head"><h2 id="squad-picker-title">Choisir le personnage · Poste {target + 1}</h2><button className="ui-button" onClick={() => setTarget(null)}>Fermer</button></div>
        <div className="squad-picker-filters"><input type="search" aria-label="Rechercher une carte" placeholder="Nom ou anime…" value={query} onChange={(e) => { setQuery(e.target.value); setShown(50); }} />
          <select aria-label="Rareté" value={rarity} onChange={(e) => { setRarity(e.target.value); setShown(50); }}><option value="">Toutes raretés</option>{Object.entries(RARITY_NAMES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
          <select aria-label="Type" value={type} onChange={(e) => { setType(e.target.value); setShown(50); }}><option value="">Tous types</option>{Object.entries(TYPE_LABELS).map(([key, label]) => <option key={key} value={key}>{label.name}</option>)}</select>
        </div>
        <p role="status">{Math.min(shown, filtered.length)} / {filtered.length} cartes</p>
        {!filtered.length && <p>Aucune carte ne correspond.</p>}
        <div className="squad-picker-grid">{filtered.slice(0, shown).map((card) => {
          const occupied = slots.some((id, i) => i !== target && id === card.id);
          return <button key={card.id} className="squad-card" disabled={occupied} title={occupied ? "Déjà dans la squad" : card.name} aria-label={`Choisir ${card.name}`} onClick={() => { setDraft(slots.map((id, i) => i === target ? card.id : id)); setTarget(null); setMessage(null); }}><CharacterCard {...card} />{occupied && <small>Déjà dans la squad</small>}</button>;
        })}</div>
        {shown < filtered.length && <button className="ui-button" onClick={() => setShown((count) => count + 50)}>Afficher plus ({filtered.length - shown} restantes)</button>}
      </>}
    </dialog>
    <CardDialog editable={false} card={focus} inventory={inventory} team={members.filter((c): c is TeamCard => c !== null)} slot={-1} full onClose={() => setFocus(null)} onToggle={() => {}} />
  </div>;
}
