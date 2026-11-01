"use client";
import { useState } from "react";
import Link from "next/link";
import type { getAdventure } from "@/lib/adventure-state";

export function QuestBoard({ state }: { state: Awaited<ReturnType<typeof getAdventure>> }) {
  const [filter, setFilter] = useState("À suivre");
  const [limit, setLimit] = useState(20);
  const done = state.quests.filter((q) => q.done);
  const nextMode = state.modes.find((m) => !m.unlocked);
  const recommended = state.quests.filter((q) => !q.done && q.available && q.group !== "Succès").filter((q, i, all) => all.findIndex((other) => other.href === q.href) === i).slice(0, 3);
  const quests = state.quests.filter((q) => filter === "Accomplies" ? q.done : filter === "À suivre" ? !q.done && q.available : q.group === filter && !q.done);
  return <>
    <section className="quest-identity"><div><p className="quest-kicker">{state.rank.name}</p><h2>Arpenteur niveau {state.level}</h2><p>{state.rank.lore}</p></div><div className="quest-xp"><b>{state.xp.toLocaleString("fr-FR")} XP</b><progress aria-label="Progression vers le prochain niveau" value={state.next === null ? 1 : state.xp - state.floor} max={state.next === null ? 1 : state.next - state.floor} /><small>{state.next === null ? "Empreinte au niveau maximal" : `${state.next - state.xp} XP avant le niveau ${state.level + 1}`}</small></div></section>
    {nextMode && <section className="quest-next"><div><p className="quest-kicker">Prochain passage</p><h2>{nextMode.label}</h2><p>{nextMode.lore}</p></div><p>Niveau {nextMode.level} {state.level >= nextMode.level ? "✓" : `· actuel ${state.level}`}<br />{nextMode.worlds === 2 ? "Terminer les deux premiers univers" : nextMode.storyLevel === 15 ? "Terminer One Piece" : `Remporter le combat ${nextMode.storyLevel} de One Piece`}</p><Link href="/histoire">Continuer l’histoire</Link></section>}
    <section aria-label="Objectifs conseillés"><h2 className="quest-section-title">Ton prochain pas</h2><div className="quest-recommendations">{recommended.map((q) => <Link key={q.key} href={q.href}><span>+{q.xp} XP</span><h3>{q.title}</h3><p>{q.description}</p></Link>)}{!recommended.length && <p>Tu as accompli les objectifs actuellement disponibles. Retrouve tes découvertes dans le journal.</p>}</div></section>
    <section><h2 className="quest-section-title">Les passages du carnet</h2><div className="quest-modes">{state.modes.map((mode) => <Link key={mode.key} href={mode.href} data-open={mode.unlocked}><span>{mode.unlocked ? "Passage ouvert" : `Niveau ${mode.level}`}</span><h3>{mode.label}</h3><p>{mode.lore}</p>{mode.legacy && <small>Accès conservé depuis tes précédentes aventures.</small>}</Link>)}</div></section>
    <section><div className="quest-journal-head"><h2 className="quest-section-title">Journal des quêtes</h2><span>{done.length} objectifs accomplis</span></div><div className="quest-filters" role="group" aria-label="Filtrer les quêtes">{["À suivre", "Histoire", "Découverte", "Succès", "Accomplies"].map((name) => <button type="button" key={name} aria-pressed={filter === name} onClick={() => { setFilter(name); setLimit(20); }}>{name}</button>)}</div>
      <ul className="quest-list">{quests.slice(0, limit).map((q) => <li key={q.key}><div><small>{q.group}{q.done ? " · Accomplie" : !q.available ? " · À découvrir" : ""}</small><h3>{q.title}</h3><p>{q.description}</p></div><b>+{q.xp} XP</b>{q.done ? <span aria-label="Accomplie">✓</span> : q.available ? <Link href={q.href}>Poursuivre</Link> : <span>Passage à ouvrir</span>}</li>)}</ul>
      {!quests.length && <p>Aucune quête dans cette catégorie pour le moment.</p>}{quests.length > limit && <button className="quest-more" onClick={() => setLimit(limit + 20)}>Afficher la suite</button>}
    </section><p className="quest-note">L’expérience récompense les premières découvertes. Rejouer un combat ne redonne pas d’XP. Chaque niveau atteint rapporte 25 Ryō, avec 100 Ryō supplémentaires tous les dix niveaux ; le versement est automatique.</p>
  </>;
}
