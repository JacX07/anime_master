import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ResourceArt } from "@/components/ResourceArt";
import { isBoss, isFinalBoss, LEVELS, RESOURCE_NAMES, STORY_BOSSES } from "@/lib/story";
import { storyResume } from "@/lib/story-map";
import type { UniverseView } from "./StoryBoard";
import { STORY_ART } from "./story-art";
import { StoryDrops } from "./StoryDrops";
import { StarRewards } from "./StarRewards";

const points = [[130, 70], [270, 125], [430, 150], [535, 215], [370, 265]];
const route = "M130 0V70C130 96 212 125 270 125S365 150 430 150 535 175 535 215 440 265 370 265 130 276 130 320";
const name = (key: string) => RESOURCE_NAMES[key] ?? key;

export function StoryMap({ universes, stock, ready, chosenTeamSize, pending, onFight, onClaim }: {
  universes: UniverseView[];
  stock: Record<string, number>;
  ready: boolean;
  chosenTeamSize: number;
  pending: boolean;
  onFight: (level: number, universe: UniverseView) => void;
  onClaim?: (universe: string, tier: number) => Promise<{ ok: boolean; error?: string }>;
}) {
  const resume = storyResume(universes);
  const [selected, setSelected] = useState(resume);
  const [position, setPosition] = useState({ key: resume?.key ?? universes[0]?.key, act: Math.ceil((resume?.level ?? 1) / 5) });
  const viewport = useRef<HTMLDivElement>(null);
  const u = universes.find((x) => x.key === selected?.key);

  function centerNode(key: string, level: number) {
    const root = viewport.current;
    const target = root?.querySelector<HTMLElement>(`[data-universe="${key}"][data-level="${level}"]`);
    if (root && target) root.scrollTop += target.getBoundingClientRect().top - root.getBoundingClientRect().top - root.clientHeight / 2;
  }

  const resumeKey = resume?.key;
  const resumeLevel = resume?.level;
  useEffect(() => {
    if (resumeKey && resumeLevel) centerNode(resumeKey, resumeLevel);
  }, [resumeKey, resumeLevel]);

  // Le repère suit le défilement sans changer la sélection du combat.
  useEffect(() => {
    const root = viewport.current;
    if (!root) return;
    let frame = 0;
    function update() {
      const line = root!.getBoundingClientRect().top + 100;
      let current: HTMLElement | undefined;
      for (const act of root!.querySelectorAll<HTMLElement>("[data-act]")) {
        if (!current || act.getBoundingClientRect().top <= line) current = act;
        else break;
      }
      if (current) setPosition({ key: current.dataset.key!, act: Number(current.dataset.act) });
    }
    function scroll() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    }
    root.addEventListener("scroll", scroll, { passive: true });
    scroll();
    return () => { root.removeEventListener("scroll", scroll); cancelAnimationFrame(frame); };
  }, []);

  const visible = universes.find((x) => x.key === position.key);
  const n = selected?.level ?? 1;
  const open = !!u?.unlocked && n <= u.maxLevel + 1;
  const accessible = universes.filter((world) => world.unlocked);
  const totalStars = accessible.reduce((sum, world) => sum + Object.values(world.stars).reduce((n, stars) => n + stars, 0), 0);
  const maxStars = accessible.reduce((sum, world) => sum + Math.min(LEVELS, world.maxLevel + 1) * 3, 0);
  return (
    <section className="hs-map" aria-label="Parcours du mode histoire">
      <header className="hs-map-toolbar">
        <p>Un seul chemin à travers les {universes.length} univers.</p>
        <p className="hs-star-total" aria-label={`Total : ${totalStars} étoile${totalStars === 1 ? "" : "s"} sur ${maxStars} possibles dans les univers débloqués`} title="Chaque combat vaut jusqu’à 3 étoiles.">{totalStars} / {maxStars} étoiles</p>
        <button className="bt-btn" type="button" onClick={() => {
          if (resume) { setSelected(resume); centerNode(resume.key, resume.level); }
        }}>Ma progression</button>
      </header>
      {visible && <StarRewards key={visible.key} universe={visible} onClaim={onClaim} />}
      <div className="hs-map-viewport" ref={viewport} tabIndex={0} role="region" aria-label="Carte continue, défilement vertical">
        <nav className="hs-map-tracker" aria-label="Position sur la carte">
          <span>Univers {visible?.rank ?? 1} · Acte {position.act}</span>
          <label>
            <span className="sr-only">Rejoindre un univers</span>
            <select value={position.key} onChange={(e) => centerNode(e.target.value, 1)}>
              {universes.map((x) => <option key={x.key} value={x.key}>{x.rank}. {x.name}{!x.unlocked ? " · Verrouillé" : ""}</option>)}
            </select>
          </label>
        </nav>
        {universes.map((world) => (
          <section key={world.key} className="hs-map-world" aria-label={`Univers ${world.rank} : ${world.name}`} style={{
            "--hs-color": STORY_ART[world.key]?.color ?? "#80b4ff",
            "--hs-art": `url("${STORY_ART[world.key]?.background ?? `/story-map/${world.key}.svg`}")`,
          } as CSSProperties}>
            <header className="hs-map-world-head">
              <small>Univers {world.rank}{world.kind === "collision" ? " · Collision" : ""}{!world.unlocked ? " · Verrouillé" : ""}</small>
              <h2>{world.name}</h2>
              <p>{STORY_ART[world.key]?.location}</p>
            </header>
            {[1, 2, 3].map((act) => {
              const art = STORY_ART[world.key]?.acts?.[act];
              return (
              <div key={act} className="hs-map-act" data-key={world.key} data-act={act} style={art ? { "--hs-art": `url("${art.background}")` } as CSSProperties : undefined}>
                <h3>Acte {act}<small>{art?.location ?? (act === 3 ? "Vers le boss final" : act === 2 ? "Au cœur de l’univers" : "Entrée dans l’univers")}</small></h3>
                <svg className="hs-map-route" viewBox="0 0 720 320" preserveAspectRatio="none" aria-hidden="true">
                  <path d={route} stroke="#081323" strokeWidth="9" opacity=".8" />
                  <path d={route} stroke={world.maxLevel >= act * 5 ? "#00c8b4" : "#a1b7d4"} strokeWidth="2.5" strokeDasharray="3 8" opacity=".7" />
                </svg>
                {points.map(([x, y], i) => {
                  const level = (act - 1) * 5 + i + 1;
                  const done = level <= world.maxLevel;
                  const stars = world.stars[level] ?? 0;
                  const current = world.key === resumeKey && level === resumeLevel;
                  const unlocked = world.unlocked && level <= world.maxLevel + 1;
                  return (
                    <button key={level} type="button" data-universe={world.key} data-level={level}
                      className={`hs-map-node${done ? " is-done" : ""}${current ? " is-current" : ""}${isBoss(level) ? " is-boss" : ""}${isFinalBoss(level) ? " is-final" : ""}`}
                      style={{ left: `${x / 720 * 100}%`, top: y }}
                      aria-current={current ? "step" : undefined}
                      aria-pressed={selected?.key === world.key && n === level}
                      aria-label={`${world.name}${STORY_BOSSES[world.key]?.[level] ? ` · ${STORY_BOSSES[world.key][level].name}` : ""}, acte ${act}, ${isFinalBoss(level) ? "boss final" : isBoss(level) ? "boss d’acte" : "combat"} ${level}, ${done ? "terminé" : unlocked ? "disponible" : "verrouillé"}, ${stars} étoile${stars === 1 ? " pleine" : "s pleines"}, ${3 - stars} étoile${3 - stars === 1 ? " vide" : "s vides"}`}
                      onClick={() => setSelected({ key: world.key, level })}>
                      {isBoss(level) ? <span className="hs-map-emblem" style={{ backgroundImage: `url("/story-map/${world.key}-boss.svg")` }} /> : done ? "✓" : level}
                      <small>{isFinalBoss(level) ? "Boss final" : isBoss(level) ? "Boss d’acte" : current ? "Vous êtes ici" : `${world.rank}-${level}`}{isBoss(level) && done ? " ✓" : ""}<span className="hs-node-stars" title={`${stars} étoile${stars === 1 ? " pleine" : "s pleines"}, ${3 - stars} étoile${3 - stars === 1 ? " vide" : "s vides"}`}>{"★".repeat(stars)}{"☆".repeat(3 - stars)}</span>{STORY_BOSSES[world.key]?.[level] && <span className="hs-map-boss-name">{STORY_BOSSES[world.key][level].name}</span>}</small>
                    </button>
                  );
                })}
              </div>
              );
            })}
          </section>
        ))}
        <footer className="hs-map-end">Le bout du voyage · {universes.length} univers · {universes.length * LEVELS} combats</footer>
      </div>
      {u && selected && <section className="hs-map-selection" aria-live="polite">
        <div>
          <small>Univers {u.rank} · Acte {Math.ceil(n / 5)} · Combat {n}</small>
          <h3>{u.name}{STORY_BOSSES[u.key]?.[n] ? ` · ${STORY_BOSSES[u.key][n].name}` : ""} · {isFinalBoss(n) ? "Boss final" : isBoss(n) ? "Boss d’acte" : `Combat ${n}`}</h3>
          <p>Ennemis : {u.mixes[n - 1]?.join(" · ")} · ×{u.startScale.toFixed(2).replace(".", ",")} à ×{u.difficulty.toFixed(2).replace(".", ",")} des stats de leur rareté{u.rank === 1 ? " (tutoriel)" : ""}.</p>
          <StoryDrops universeKey={u.key} level={n} cleared={n <= u.maxLevel} />
          <p className="hs-map-stock"><ResourceArt resource={u.resource} />{name(u.resource)} : {stock[u.resource] ?? 0} · <ResourceArt resource="fragment-de-signature" />{stock["fragment-de-signature"] ?? 0} fragments · <ResourceArt resource={u.weaponResource} />{name(u.weaponResource)} : {stock[u.weaponResource] ?? 0}</p>
          <p>{!u.unlocked ? "Termine l’univers précédent pour débloquer celui-ci." : !open ? "Remporte le combat précédent pour débloquer ce jalon." : !ready ? chosenTeamSize === 0 ? "Compose une équipe de 4 cartes pour combattre." : "Choisis exactement deux personnages pour lancer le duo." : n <= u.maxLevel ? "Combat terminé · Rejouable" : "Prochain combat disponible"}</p>
        </div>
        <button className="bt-btn" type="button" disabled={!open || !ready || pending} onClick={() => onFight(n, u)}>{!open ? "Verrouillé" : pending ? "Chargement…" : n <= u.maxLevel ? "Rejouer" : "Combattre"}</button>
      </section>}
    </section>
  );
}
