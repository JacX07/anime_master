"use client";

import { useActionState, useRef, useState } from "react";
import { staffAction, type StaffState } from "@/app/admin/actions";

export interface Field { name: string; label: string; type?: "number" | "text" | "select"; options?: { value: string; label: string }[]; placeholder?: string }

/** Formulaire d'action sensible : motif obligatoire et confirmation en deux temps (SPEC admin §2.5). */
export function StaffForm({ op, target, title, fields = [], submit, danger }: { op: string; target: string; title: string; fields?: Field[]; submit: string; danger?: boolean }) {
  const [state, run, pending] = useActionState<StaffState, FormData>(staffAction, null);
  const [armed, setArmed] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  return (
    <form ref={form} action={(fd) => { setArmed(false); run(fd); }} className="adm-form" onChange={() => setArmed(false)}>
      <h3>{title}</h3>
      <input type="hidden" name="op" value={op} />
      <input type="hidden" name="target" value={target} />
      {fields.map((f) => (
        <label key={f.name}>
          <span>{f.label}</span>
          {f.type === "select"
            ? <select name={f.name} required>{f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
            : <input name={f.name} type={f.type ?? "text"} required placeholder={f.placeholder} step={f.type === "number" ? 1 : undefined} />}
        </label>
      ))}
      <label><span>Motif (obligatoire)</span><input name="reason" required minLength={5} maxLength={300} placeholder="Pourquoi cette action ?" /></label>
      {!armed
        ? <button type="button" className="ui-button" onClick={() => { if (form.current?.reportValidity()) setArmed(true); }}>{submit}</button>
        : <button type="submit" className={`ui-button${danger ? " adm-danger" : ""}`} disabled={pending}>{pending ? "…" : "Confirmer"}</button>}
      {state && <p className={state.ok ? "adm-up" : "adm-down"} role="status">{state.message}</p>}
    </form>
  );
}
