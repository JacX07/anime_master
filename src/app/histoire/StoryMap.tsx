import { useState, type CSSProperties } from "react";
import { ResourceArt } from "@/components/ResourceArt";
import { Icon } from "@/components/icons";
import { isBoss, isFinalBoss, LEVELS, RESOURCE_NAMES, STORY_BOSSES } from "@/lib/story";
import { storyResume } from "@/lib/story-map";
import type { UniverseView } from "./StoryBoard";
import { STORY_ART } from "./story-art";
import { StoryDrops } from "./StoryDrops";
import { StarRewards } from "./StarRewards";

const points = [[180, 365], [355, 320], [475, 240], [315, 160], [200, 70]];
const route = "M180 365C180 345 355 350 355 320S475 280 475 240 315 200 315 160 200 115 200 70";

export function StoryMap({ universes, stock, pending, onPrepare, onClaim }: {
  universes: UniverseView[];
  stock: Record<string, number>;
  pending: boolean;
  onPrepare: (level: number, universe: UniverseView) => void;
  onClaim?: (universe: string, tier: number) => Promise<{ ok: boolean; error?: string }>;
}) {
  const resume = storyResume(universes);
  const [position, setPosition] = useState({ key: resume?.key ?? universes[0]?.key, act: Math.ceil((resume?.level ?? 1) / 5) });
  const world = universes.find((u) => u.key === position.key) ?? universes[0];
  if (!world) return null;
  const { act } = position;
  const art = STORY_ART[world.key];
  const level = Math.min(Math.max(world.maxLevel + 1, (act - 1) * 5 + 1), act * 5);
  const stars = Object.values(world.stars).reduce((sum, n) => sum + n, 0);
  const open = world.unlocked && level <= world.maxLevel + 1;
  return (
    <section className="hs-map hs-map-parcours" aria-label="Parcours du mode histoire">
      <header className="hs-map-toolbar">
        <label>Univers <select aria-label="Univers" value={world.key} onChange={(e) => {
          const u = universes.find((x) => x.key === e.target.value)!;
          setPosition({ key: u.key, act: Math.ceil(Math.min(u.maxLevel + 1, LEVELS) / 5) });
        }}>{universes.map((u) => <option key={u.key} value={u.key}>{u.name}{u.unlocked ? "" : " · Verrouillé"}</option>)}</select></label>
        <div className="hs-actions" role="group" aria-label="Actes">{[1, 2, 3].map((n) => <button key={n} type="button" className="ui-button text-action" aria-pressed={act === n} disabled={!world.unlocked || world.maxLevel < (n - 1) * 5} onClick={() => setPosition({ ...position, act: n })}>Acte {n}</button>)}</div>
        <button type="button" className="ui-button text-action" onClick={() => resume && setPosition({ key: resume.key, act: Math.ceil(resume.level / 5) })}>Ma progression</button>
      </header>
      <div className={`hs-map-scene${world.unlocked ? "" : " is-locked"}`} role="group" aria-label="Carte ascendante : départ en bas, boss en haut" style={{ "--hs-art": `url("${art?.acts?.[act]?.background ?? art?.background ?? `/story-map/${world.key}.svg`}")` } as CSSProperties}>
        <div className="hs-map-location"><h2>{art?.acts?.[act]?.location ?? art?.location ?? world.name}</h2><p>{world.name} · Acte {act}{world.unlocked ? "" : " · Verrouillé"}</p></div>
        <svg className="hs-map-route" viewBox="0 0 680 440" preserveAspectRatio="none" aria-hidden="true"><path d={route} stroke="#111b17" strokeWidth="9"/><path d={route} stroke="#a7b9a3" strokeWidth="2" strokeDasharray="3 8"/></svg>
        {points.map(([x, y], i) => {
          const n = (act - 1) * 5 + i + 1;
          const unlocked = world.unlocked && n <= world.maxLevel + 1;
          const done = n <= world.maxLevel;
          const current = world.key === resume?.key && n === resume.level;
          const count = world.stars[n] ?? 0;
          return <button key={n} type="button" data-universe={world.key} data-level={n} disabled={!unlocked || pending}
            className={`hs-map-node${done ? " is-done" : ""}${current ? " is-current" : ""}${isBoss(n) ? " is-boss" : ""}${isFinalBoss(n) ? " is-final" : ""}`}
            style={{ left: `${x / 680 * 100}%`, top: `${y / 440 * 100}%` }} aria-current={current ? "step" : undefined}
            aria-label={`${world.name}, combat ${n}, ${done ? "terminé" : unlocked ? "disponible" : "verrouillé"}, ${count} étoiles`}
            onClick={() => onPrepare(n, world)}>
            <span className="hs-node-face" aria-hidden="true">{isBoss(n) ? <span className="hs-map-emblem" style={{ backgroundImage: `url("/story-map/${world.key}-boss.svg")` }}/> : <><Icon name={!unlocked ? "lock" : done ? "valider" : "atk"}/><b>{n}</b></>}</span>
            <small>{isFinalBoss(n) ? "Boss final" : isBoss(n) ? "Boss d’acte" : `Combat ${n}`}<span className="hs-node-stars">{done ? "★".repeat(count) + "☆".repeat(3 - count) : current ? "Vous êtes ici" : ""}</span>{STORY_BOSSES[world.key]?.[n] && <span className="hs-map-boss-name">{STORY_BOSSES[world.key][n].name}</span>}</small>
          </button>;
        })}
      </div>
      <div className="hs-map-hint"><p>{stars} / 45 étoiles · {world.maxLevel} combats terminés</p><button type="button" className="ui-button text-action" disabled={!open || pending} onClick={() => onPrepare(level, world)}>{pending ? "Chargement…" : !world.unlocked ? "Univers verrouillé" : `Préparer le combat ${level}`}</button></div>
      {!world.unlocked && <p className="hs-team-note">Termine l’univers précédent pour débloquer celui-ci.</p>}
      <StarRewards key={world.key} universe={world} onClaim={onClaim}/>
      <section className="hs-map-objects" aria-label="Objets de cet univers"><h2>Objets de cet univers</h2><p>Les quantités et bonus de première victoire s’affichent à la préparation.</p><div className="hs-object-list">{[world.resource, "fragment-de-signature", world.weaponResource].map((key) => <div key={key}><ResourceArt resource={key} size={32}/><span>{RESOURCE_NAMES[key] ?? key}<small>{key === world.weaponResource ? "Boss final · garanti" : "50 % par unité d’éveil"} · Stock : {stock[key] ?? 0}</small></span></div>)}</div></section>
      <details className="hs-map-loot"><summary>Butin du combat {level}</summary><StoryDrops universeKey={world.key} level={level} cleared={level <= world.maxLevel}/></details>
    </section>
  );
}
