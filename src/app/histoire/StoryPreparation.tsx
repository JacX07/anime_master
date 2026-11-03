import { useEffect, useRef, useState } from "react";
import { CharacterCard } from "@/components/CharacterCard";
import { combatPowers } from "@/lib/combat-power";
import type { BattleCard } from "@/lib/battle";
import type { getStoryRoster } from "@/lib/battles";
import type { UniverseView } from "./StoryBoard";
import { StoryDrops } from "./StoryDrops";
import { STORY_ART } from "./story-art";

export type StoryCard = Awaited<ReturnType<typeof getStoryRoster>>[number];
export type StoryEnemy = { id: string; name: string; imageUrl: string; combat: BattleCard };
const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(n);

function Card({ card, power }: { card: StoryEnemy | StoryCard; power?: number }) {
  return <CharacterCard {...card.combat} power={power ?? combatPowers([card.combat])[0]} powerTitle="Puissance de combat" name={card.name} imageUrl={card.imageUrl} stars={"stars" in card ? card.stars : undefined} finish={"finish" in card ? card.finish : undefined}/>;
}

export function StoryPreparation({ universe, level, ownedCards, enemies, slots, duo, pending, error, onDuo, onChoose, onAuto, onBack, onFight }: {
  universe: UniverseView; level: number; ownedCards: StoryCard[]; enemies: StoryEnemy[];
  slots: (string | null)[]; duo: boolean; pending: boolean; error: string | null;
  onDuo: (duo: boolean) => void; onChoose: (slot: number, id: string) => void;
  onAuto: () => void; onBack: () => void; onFight: () => void;
}) {
  const [slot, setSlot] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, []);
  useEffect(() => {
    if (slot !== null) dialog.current?.showModal();
    else dialog.current?.close();
  }, [slot]);
  const size = duo ? 2 : 4;
  const cards = slots.map((id) => ownedCards.find((c) => c.id === id));
  const active = cards.slice(0, size).filter((c): c is StoryCard => !!c);
  const ready = active.length === size && new Set(active.map((c) => c.combat.characterId)).size === size;
  const powers = combatPowers(active.map((c) => c.combat));
  const enemyPowers = combatPowers(enemies.map((c) => c.combat));
  return <section className="hs-preparation" aria-label="Préparation du combat">
    <header className="hs-prep-heading"><div><h2 ref={heading} tabIndex={-1}>Combat {level}</h2><p>{universe.name} · {STORY_ART[universe.key]?.acts?.[Math.ceil(level / 5)]?.location ?? STORY_ART[universe.key]?.location} · Acte {Math.ceil(level / 5)}</p></div><button type="button" className="ui-button text-action" disabled={pending} onClick={onBack}>Retour à la carte</button></header>
    <div className="hs-prep-toolbar"><div className="hs-actions" role="group" aria-label="Taille de l’équipe"><button type="button" className="ui-button text-action" disabled={pending} aria-pressed={!duo} onClick={() => onDuo(false)}>Équipe · 4 cartes</button><button type="button" className="ui-button text-action" disabled={pending} aria-pressed={duo} onClick={() => onDuo(true)}>Duo · 2 cartes</button></div><button type="button" className="ui-button text-action" disabled={pending} onClick={onAuto}>Composition automatique</button></div>
    <div className="hs-vs-layout"><section aria-label="Ton équipe"><header className="hs-camp-head"><h3>Ton équipe</h3><strong>Puissance {fmt(powers.reduce((sum, n) => sum + n, 0))}</strong></header><div className="hs-prep-cards">{cards.map((card, i) => <button key={i} type="button" className={`hs-card-choice${i >= size ? " is-reserve" : ""}`} disabled={pending || i >= size} aria-label={`${card?.name ?? `Emplacement ${i + 1}`}, ${i >= size ? "en réserve" : "changer ce compagnon"}`} onClick={() => { setSearch(""); setSlot(i); }}>
      {card ? <Card card={card} power={i < size ? powers[active.indexOf(card)] : undefined}/> : <span className="hs-empty-slot">Emplacement {i + 1}</span>}<small>{i >= size ? "En réserve" : "Changer"}</small>
    </button>)}</div></section><span className="hs-vs-label" aria-label="contre">VS</span><section aria-label="Ennemis"><header className="hs-camp-head"><h3>Ennemis</h3><strong>Puissance {fmt(enemyPowers.reduce((sum, n) => sum + n, 0))}</strong></header><div className="hs-prep-cards">{enemies.map((card, i) => <div key={card.id} className="hs-enemy-card"><Card card={card} power={enemyPowers[i]}/><small>{card.combat.boss ? "Boss" : "Sbire"}</small></div>)}</div></section></div>
    <p className="hs-team-note" role="status">{pending ? "Enregistrement…" : "Clique une carte pour la remplacer. Ta composition est conservée quand tu quittes la page."}</p>
    {error && <p className="hs-error" role="alert">{error}</p>}
    <footer className="hs-prep-footer"><StoryDrops universeKey={universe.key} level={level} cleared={level <= universe.maxLevel}/><button type="button" className="ui-button text-action hs-fight-button" disabled={pending || !ready} onClick={onFight}>{pending ? "Chargement…" : level <= universe.maxLevel ? "Rejouer" : "Combattre"}</button></footer>
    {!ready && <p className="hs-team-note">Choisis {size} personnages différents pour combattre.</p>}
    <p className="hs-team-note">Une défaite ne coûte rien. Victoire : 1 étoile · aucun K.-O. : 2 · victoire en duo : 3, même si un personnage tombe.</p>
    <dialog ref={dialog} className="hs-picker" aria-labelledby="hs-picker-title" onCancel={() => setSlot(null)} onClose={() => setSlot(null)}><header><h2 id="hs-picker-title">Choisir un compagnon</h2><button type="button" className="ui-button text-action" onClick={() => setSlot(null)}>Fermer</button></header><label className="hs-picker-search">Rechercher un personnage<input value={search} onChange={(e) => setSearch(e.target.value)} type="search"/></label><div className="hs-picker-grid">{ownedCards.filter((c) => c.name.toLocaleLowerCase("fr").includes(search.toLocaleLowerCase("fr"))).map((card) => {
      const used = cards.some((c, i) => i !== slot && c?.combat.characterId === card.combat.characterId);
      return <button key={card.id} type="button" className="hs-card-choice" disabled={used || pending} aria-pressed={slot !== null && slots[slot] === card.id} aria-label={`Choisir ${card.name}${used ? ", déjà dans l’équipe" : ""}`} onClick={() => { if (slot !== null) onChoose(slot, card.id); setSlot(null); }}><Card card={card}/><small>{used ? "Déjà dans l’équipe" : card.name}</small></button>;
    })}</div>{!ownedCards.length && <p>Ouvre un booster pour recruter tes premiers compagnons.</p>}</dialog>
  </section>;
}
