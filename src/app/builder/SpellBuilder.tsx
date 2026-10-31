"use client";

import { useMemo, useState, useTransition } from "react";
import { EFFECTS, newEffect, TARGET_CHOICES, type Field } from "@/lib/spell-schema";
import { spellSource } from "@/lib/spell-export";
import { describeEffect, describeSpell, type CharacterSpell, type Effect } from "@/lib/spells";
import { resetSpellAction, saveSpellAction } from "./actions";

export interface BuilderChar {
  id: number; name: string; imageUrl: string; rarity: "SSR" | "UR"; type: string; attack: number; defense: number;
  /** Sort actuel du jeu (spells.ts) */
  base: CharacterSpell;
  /** Sort édité enregistré, ou null */
  custom: CharacterSpell | null;
}
interface Sim { games: number; weight: number; ssrVsUr: number | null; verdict: "trop fort" | "ok" | "inutile" }

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));
const pts = (x: number) => `${x >= 0 ? "+" : ""}${(x * 100).toFixed(1)} pts`;

export function SpellBuilder({ chars }: { chars: BuilderChar[] }) {
  const [q, setQ] = useState("");
  const [rar, setRar] = useState("");
  const [id, setId] = useState<number | null>(null);
  const [spell, setSpell] = useState<CharacterSpell | null>(null);
  const [msg, setMsg] = useState("");
  const [games, setGames] = useState(4000);
  const [prog, setProg] = useState<number | null>(null);
  const [sim, setSim] = useState<Sim | null>(null);
  const [, start] = useTransition();
  const ch = chars.find((c) => c.id === id) ?? null;

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return chars.filter((c) => (!rar || c.rarity === rar) && (!s || c.name.toLowerCase().includes(s))).slice(0, 80);
  }, [chars, q, rar]);

  const pick = (c: BuilderChar) => {
    setId(c.id); setSpell(clone(c.custom ?? c.base)); setSim(null); setMsg(""); setProg(null);
  };
  const edit = (f: (s: CharacterSpell) => void) => setSpell((s) => { if (!s) return s; const n = clone(s); f(n); return n; });

  const save = () => ch && spell && start(async () => {
    const r = await saveSpellAction(ch.id, spell);
    setMsg(r.ok ? "Enregistré." : r.error);
  });
  const reset = () => ch && start(async () => {
    await resetSpellAction(ch.id);
    setSpell(clone(ch.base)); setSim(null); setMsg("Retour au sort du jeu.");
  });

  async function simulate() {
    if (!ch || !spell) return;
    setSim(null); setMsg(""); setProg(0);
    const res = await fetch("/api/builder/simulate", { method: "POST", body: JSON.stringify({ characterId: ch.id, spell, games }) });
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
    setProg(null);
  }

  return (
    <div className="sb">
      <aside className="sb-list">
        <div className="sb-filters">
          <input placeholder="Chercher un personnage" value={q} onChange={(e) => setQ(e.target.value)} />
          <select value={rar} onChange={(e) => setRar(e.target.value)}>
            <option value="">SSR + UR</option><option>SSR</option><option>UR</option>
          </select>
        </div>
        <ul>
          {list.map((c) => (
            <li key={c.id}>
              <button type="button" aria-pressed={c.id === id} onClick={() => pick(c)}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.imageUrl} alt="" loading="lazy" />
                <span>{c.name}<small>{c.rarity} · {c.type}{c.custom ? " · modifié" : ""}</small></span>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      {ch && spell ? (
        <section className="sb-edit">
          <h2>{ch.name} <small>{ch.rarity} · {ch.type} · ATK {ch.attack} / DEF {ch.defense}</small></h2>
          <label className="sb-row">Nom du sort
            <input value={spell.name} maxLength={60} onChange={(e) => edit((s) => { s.name = e.target.value; })} />
          </label>
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

          <p className="sb-preview"><strong>{spell.name}</strong> — {spell.effects.length ? describeSpell(spell) : "aucun effet"}</p>

          <div className="sb-actions">
            <button type="button" className="bt-btn" onClick={save} disabled={!spell.effects.length}>Enregistrer</button>
            <button type="button" className="bt-btn" onClick={reset}>Revenir au sort du jeu</button>
            <button type="button" className="bt-btn" onClick={() => navigator.clipboard.writeText(spellSource(ch.id, ch.name, spell)).then(() => setMsg("Code copié, à coller dans CHARACTER_SPELLS."))}>Exporter</button>
            {msg && <span className="sb-msg">{msg}</span>}
          </div>

          <div className="sb-sim">
            <select value={games} onChange={(e) => setGames(Number(e.target.value))}>
              <option value={500}>Rapide (500 combats, ±2 pts)</option><option value={4000}>Précis (4 000 combats)</option>
            </select>
            <button type="button" className="bt-btn sb-go" onClick={simulate} disabled={prog !== null || !spell.effects.length}>Simulate</button>
            {prog !== null && <progress value={prog} max={1} />}
          </div>
          {sim && (
            <div className="sb-result" data-verdict={sim.verdict}>
              <p><strong>{sim.verdict.toUpperCase()}</strong> — le sort pèse <strong>{pts(sim.weight)}</strong> (cible +4, plage +1 à +6), {sim.games} combats.</p>
              {sim.ssrVsUr !== null && <p>4 SSR avec sorts contre 4 UR sans sorts : {(sim.ssrVsUr * 100).toFixed(1)} % de victoires{sim.ssrVsUr >= 0.5 ? " ⚠ un UR doit dominer" : ""}.</p>}
            </div>
          )}
        </section>
      ) : (
        <p className="vt-muted">Choisis un personnage à gauche.</p>
      )}
    </div>
  );
}

function FieldInput({ f, value, onChange }: { f: Field; value: unknown; onChange: (v: unknown) => void }) {
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
  return (
    <label className="sb-f">{f.label}
      <span className="sb-num">
        <input type="range" min={f.min} max={f.max} step={f.step} value={n} onChange={(e) => onChange(Number(e.target.value))} />
        <output>{+n.toFixed(2)}</output>
      </span>
    </label>
  );
}
