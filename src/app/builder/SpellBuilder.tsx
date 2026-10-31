"use client";

import { useMemo, useState, useTransition } from "react";
import { EFFECTS, newEffect, TARGET_CHOICES, type Field } from "@/lib/spell-schema";
import { SLOT_LABELS, describeBuilderSpell, builderSpellSource, type BuilderEntry, type BuilderSlot } from "@/lib/builder-slots";
import { describeBasicAttack, type BasicAttack, type BasicRider } from "@/lib/basic-attacks";
import { describeEffect, describeSpell, type CharacterSpell, type Effect } from "@/lib/spells";
import { MechanicPanel } from "./MechanicPanel";
import { applyToGameAction, resetSpellAction, saveSpellAction } from "./actions";
import type { SimResult } from "@/lib/spell-sim";

export interface BuilderChar {
  id: number; name: string; imageUrl: string; rarity: "SSR" | "UR"; type: string; attack: number; defense: number;
  spells: BuilderEntry[];
}

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));
const pts = (x: number) => `${x >= 0 ? "+" : ""}${(x * 100).toFixed(1)} pts`;

export function SpellBuilder({ chars }: { chars: BuilderChar[] }) {
  const [q, setQ] = useState("");
  const [rar, setRar] = useState("");
  const [id, setId] = useState<number | null>(null);
  const [slot, setSlot] = useState<BuilderSlot>("secondary");
  const [basic, setBasic] = useState<BasicAttack | null>(null);
  const [spell, setSpell] = useState<CharacterSpell | null>(null);
  const [msg, setMsg] = useState("");
  const [games, setGames] = useState(4000);
  const [prog, setProg] = useState<number | null>(null);
  const [sim, setSim] = useState<SimResult | null>(null);
  const [pending, start] = useTransition();
  const ch = chars.find((c) => c.id === id) ?? null;
  const entry = ch?.spells.find((s) => s.slot === slot);
  const value = basic ?? spell;
  const busy = pending || prog !== null;

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return chars.filter((c) => (!rar || c.rarity === rar) && (!s ||
      [c.name, ...c.spells.flatMap((s) => [s.original.name, s.custom?.name ?? ""]) ].some((name) => name.toLowerCase().includes(s))));
  }, [chars, q, rar]);

  const load = (v: BasicAttack | CharacterSpell) => {
    setBasic("rider" in v ? clone(v) : null);
    setSpell("effects" in v ? clone(v) : null);
    setSim(null); setMsg("");
  };
  const pick = (c: BuilderChar, next: BuilderEntry = c.spells[0]) => {
    setId(c.id); setSlot(next.slot); load(next.custom ?? next.original);
  };
  const edit = (f: (s: CharacterSpell) => void) => { setSim(null); setSpell((s) => { if (!s) return s; const n = clone(s); f(n); return n; }); };

  const save = () => ch && value && start(async () => {
    const r = await saveSpellAction(ch.id, value, slot);
    setMsg(r.ok ? "Enregistré." : r.error);
  });
  const apply = () => ch && value && start(async () => {
    const r = await applyToGameAction(ch.id, value, slot);
    setMsg(r.ok ? "Appliqué au jeu (src/lib/skill-overrides.json, à commiter)." : r.error);
  });
  const reset = () => ch && entry && start(async () => {
    const r = await resetSpellAction(ch.id, slot);
    if (!r.ok) { setMsg(r.error); return; }
    load(entry.original); setMsg("Retour au sort du jeu pour cet emplacement.");
  });

  async function simulate() {
    if (!ch || !value) return;
    setSim(null); setMsg(""); setProg(0);
    try {
    const res = await fetch("/api/builder/simulate", { method: "POST", body: JSON.stringify({ characterId: ch.id, spell: value, slot, games }) });
    if (!res.ok || !res.body) { setMsg("Simulation refusée."); setProg(null); return; }
    const reader = res.body.getReader(), dec = new TextDecoder();
    let buf = "";
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const l of lines.filter(Boolean)) {
        const m = JSON.parse(l);
        if (m.progress != null) setProg(m.progress / m.total);
        else if (m.result) setSim(m.result);
        else if (m.error) setMsg(m.error);
      }
    }
    } catch {
      setMsg("La simulation a échoué. Réessaie.");
    } finally {
      setProg(null);
    }
  }

  return (
    <div className="sb">
      <aside className="sb-list">
        <h2>Sorts existants</h2>
        <div className="sb-filters">
          <input aria-label="Chercher un personnage ou un sort" placeholder="Personnage ou sort" value={q} onChange={(e) => setQ(e.target.value)} />
          <select aria-label="Rareté" value={rar} onChange={(e) => setRar(e.target.value)}>
            <option value="">SSR + UR</option><option>SSR</option><option>UR</option>
          </select>
        </div>
        <p className="sb-desc" role="status">{list.length} personnage{list.length > 1 ? "s" : ""} · 4 sorts par personnage.</p>
        {list.length === 0 && <p className="vt-muted">Aucun personnage ou sort trouvé.</p>}
        <ul>
          {list.map((c) => (
            <li key={c.id}>
              <div className="sb-character">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.imageUrl} alt="" loading="lazy" />
                <span>{c.name}<small>{c.rarity} · {c.type}</small></span>
              </div>
              {c.spells.map((s) => (
                <button key={s.slot} type="button" title={describeBuilderSpell(s.custom ?? s.original, true)} disabled={busy} aria-pressed={c.id === id && s.slot === slot} onClick={() => pick(c, s)}>
                  <span><small>{SLOT_LABELS[s.slot]}{s.custom ? " · modifié" : ""}</small>
                    <strong className="sb-spell-name">{(s.custom ?? s.original).name}</strong>
                    <small>{describeBuilderSpell(s.custom ?? s.original)}</small>
                    <small>{s.timing}</small>
                  </span>
                </button>
              ))}
            </li>
          ))}
        </ul>
      </aside>

      {ch && entry && value ? (
        <section className="sb-edit">
          <h2>{ch.name} <small>{ch.rarity} · {ch.type} · ATK {ch.attack} / DEF {ch.defense}</small></h2>
          <div className="sb-actions" aria-label="Emplacement du sort">
            {ch.spells.map((s) => <button key={s.slot} type="button" className="bt-btn" aria-pressed={slot === s.slot} disabled={busy} onClick={() => pick(ch, s)}>{SLOT_LABELS[s.slot]}</button>)}
          </div>
          <p className="sb-desc">{entry.timing}</p>
          <div className="sb-preview" tabIndex={0} title={describeBuilderSpell(entry.original, true)}>
            <strong>{SLOT_LABELS[slot]} d&apos;origine : {entry.original.name}</strong>
            <p>{describeBuilderSpell(entry.original)}</p>
            <button type="button" className="bt-btn" disabled={busy} onClick={() => load(entry.original)}>Modifier le sort d&apos;origine</button>
          </div>
          <label className="sb-row">Nom du sort
            <input value={value.name} disabled={busy} maxLength={60} onChange={(e) => { setSim(null); if (basic) setBasic({ ...basic, name: e.target.value }); else edit((s) => { s.name = e.target.value; }); }} />
          </label>
          <fieldset className="sb-editor-fields" disabled={busy}>
          {basic && <BasicEditor attack={basic} onChange={(value) => { setBasic(value); setSim(null); }} />}
          {spell && <>
          <label className="sb-row">Cible
            <select value={String(spell.target)} onChange={(e) => edit((s) => { s.target = e.target.value === "null" ? null : (e.target.value as CharacterSpell["target"]); })}>
              {TARGET_CHOICES.map((t) => <option key={String(t.value)} value={String(t.value)}>{t.label}</option>)}
            </select>
          </label>

          {spell.effects.map((e, i) => (
            <fieldset key={i} className="sb-effect">
              <legend>{EFFECTS[e.k].label}</legend>
              <button type="button" className="sb-x" aria-label="Retirer l'effet" onClick={() => edit((s) => { s.effects.splice(i, 1); })}>✕</button>
              <div className="sb-fields">
                {EFFECTS[e.k].fields.map((f) => (
                  <FieldInput key={f.key} f={f} value={(e as unknown as Record<string, unknown>)[f.key]}
                    unit={f.key === "amount" && e.k === "mod" ? e.stat === "crit" || e.stat === "dodge" ? "pts" : "%" : ["pct", "ignoreDef", "drain"].includes(f.key) ? "%" : undefined}
                    onChange={(v) => edit((s) => { (s.effects[i] as unknown as Record<string, unknown>)[f.key] = v; })} />
                ))}
              </div>
              <p className="sb-desc">{describeEffect(e)}</p>
            </fieldset>
          ))}
          <select className="sb-add" value="" onChange={(e) => e.target.value && edit((s) => { s.effects.push(newEffect(e.target.value as Effect["k"])); })}>
            <option value="">+ Ajouter un effet…</option>
            {Object.entries(EFFECTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>

          <p className="sb-preview" tabIndex={0} title={spell.effects.length ? describeSpell(spell, true) : undefined}><strong>{spell.name}</strong> — {spell.effects.length ? describeSpell(spell) : "aucun effet"}</p>

          </>}
          </fieldset>
          {basic && <p className="sb-preview" tabIndex={0} title={describeBasicAttack(basic)}><strong>{basic.name}</strong> — {describeBasicAttack(basic, false)}</p>}
          <div className="sb-actions">
            <button type="button" className="bt-btn" onClick={save} disabled={busy || !value.name.trim() || (spell !== null && !spell.effects.length)}>Enregistrer</button>
            <button type="button" className="bt-btn sb-go" onClick={apply} disabled={busy || !value.name.trim() || (spell !== null && !spell.effects.length)}>Appliquer au jeu</button>
            <button type="button" className="bt-btn" disabled={busy} onClick={reset}>Revenir au sort du jeu</button>
            <button type="button" className="bt-btn" onClick={() => navigator.clipboard.writeText(builderSpellSource(ch.id, slot, value)).then(() => setMsg("Code copié avec son emplacement de destination."))}>Exporter</button>
            {msg && <span className="sb-msg">{msg}</span>}
          </div>

          <div className="sb-sim">
            <select disabled={busy} value={games} onChange={(e) => setGames(Number(e.target.value))}>
              <option value={500}>Rapide (500 paires)</option><option value={4000}>Précis (4 000 paires)</option>
            </select>
            <button type="button" className="bt-btn sb-go" onClick={simulate} disabled={busy || (spell !== null && !spell.effects.length)}>Simulate</button>
            {prog !== null && <progress value={prog} max={1} />}
          </div>
          {sim && (
            <div className="sb-result" data-verdict={sim.verdict}>
              <p><strong>{sim.verdict.toUpperCase()}</strong> — <strong>{pts(sim.delta)}</strong> par rapport au sort d&apos;origine ({sim.games} paires de combats).</p>
              <p>Avantage en PV restants : <strong>{pts(sim.hpDelta)}</strong> (±{(sim.hpMargin * 100).toFixed(1)} pt) — plus parlant que les victoires quand le sort gagne déjà presque tout.</p>
              <p>Impact isolé : brouillon {pts(sim.weight)} · origine {pts(sim.referenceWeight)}. Incertitude sur l&apos;écart : ±{(sim.margin * 100).toFixed(1)} pt à 95 %.</p>
              <p className="sb-desc">Mêmes équipes et mêmes graines pour le brouillon et l&apos;origine. Cette comparaison mesure la modification ; elle ne certifie pas l&apos;équilibre global du sort existant.</p>
              {sim.ssrVsUr !== null && <p>4 SSR (emplacement testé isolé sur ce personnage) contre 4 UR sans capacités personnalisées : {(sim.ssrVsUr * 100).toFixed(1)} % de victoires{sim.ssrVsUr >= 0.5 ? " ⚠ un UR doit dominer" : ""}.</p>}
            </div>
          )}
          <MechanicPanel characterId={ch.id} name={ch.name} rarity={ch.rarity} slot={slot} draft={value} />
        </section>
      ) : (
        <p className="vt-muted">Consulte les sorts existants à gauche, puis sélectionne un personnage pour modifier son nom, sa cible et ses effets.</p>
      )}
    </div>
  );
}

function FieldInput({ f, value, unit, onChange }: { f: Field; value: unknown; unit?: "%" | "pts"; onChange: (v: unknown) => void }) {
  if (f.type === "bool") return <label className="sb-f"><input type="checkbox" checked={value === true} onChange={(e) => onChange(e.target.checked || undefined)} /> {f.label}</label>;
  if (f.type === "choice")
    return (
      <label className="sb-f">{f.label}
        <select value={String(value ?? f.def)} onChange={(e) => onChange(e.target.value)}>
          {Object.entries(f.options).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </label>
    );
  const n = typeof value === "number" ? value : f.def;
  const scale = unit ? 100 : 1;
  const shown = n * scale;
  return (
    <label className="sb-f">{f.label}
      <span className="sb-num">
        <input type="range" min={f.min * scale} max={f.max * scale} step={f.step * scale} value={shown} onChange={(e) => onChange(Number(e.target.value) / scale)} />
        <output>{unit ? `${f.key === "amount" && shown > 0 ? "+" : ""}${shown.toFixed(0)} ${unit}` : +n.toFixed(2)}</output>
      </span>
    </label>
  );
}

const RIDER_LABELS = { mod: "Bonus / malus de stat", heal: "Soin", shield: "Bouclier", poison: "Poison", drain: "Vol de vie", ignoreDef: "Ignore DEF à la prochaine attaque" };
function BasicEditor({ attack, onChange }: { attack: BasicAttack; onChange: (a: BasicAttack) => void }) {
  const r = attack.rider;
  const change = (rider: BasicRider) => onChange({ ...attack, rider });
  return <div className="sb-fields">
    <p className="sb-desc" title="1× ATK fixe">Une cible ennemie et un seul petit effet (§4 ter).</p>
    <label className="sb-f">Effet
      <select value={r.kind} onChange={(e) => change(e.target.value === "mod" ? { kind: "mod", stat: "atk", amount: 0.03, to: "self" } : { kind: e.target.value as Exclude<BasicRider["kind"], "mod">, pct: 0.005 })}>
        {Object.entries(RIDER_LABELS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
      </select>
    </label>
    {r.kind === "mod" ? <>
      <label className="sb-f">Stat<select value={r.stat} onChange={(e) => change({ ...r, stat: e.target.value as typeof r.stat })}>{["atk", "def", "crit", "dodge"].map((s) => <option key={s} value={s}>{s}</option>)}</select></label>
      <label className="sb-f">Qui<select value={r.to} onChange={(e) => change({ ...r, to: e.target.value as typeof r.to })}><option value="self">Lanceur</option><option value="target">Cible</option></select></label>
      <label className="sb-f">Montant (% ou points)<input type="number" min={-3} max={3} step={0.1} value={+(r.amount * 100).toFixed(3)} onChange={(e) => change({ ...r, amount: Number(e.target.value) / 100 })} /></label>
    </> : <label className="sb-f">Valeur (%)<input type="number" min={0} max={r.kind === "poison" ? 0.5 : r.kind === "ignoreDef" ? 3 : 2} step={0.01} value={+(r.pct * 100).toFixed(3)} onChange={(e) => change({ ...r, pct: Number(e.target.value) / 100 })} /></label>}
  </div>;
}
