"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { answerAction, nextQuestionAction } from "@/app/duel-actions";
import { RarityGem, Stat, TypeIcon } from "@/components/icons";
import type { AnswerResult, ServedQuestion } from "@/lib/duels";
import { TYPE_LABELS } from "@/lib/labels";

const num = new Intl.NumberFormat("fr-FR");

type Phase =
  | { kind: "loading" }
  | { kind: "question"; q: ServedQuestion; deadline: number }
  | { kind: "feedback"; q: ServedQuestion; picked: number | null; answer: AnswerResult }
  | { kind: "error"; message: string };

/**
 * Défense : les questions arrivent une par une depuis le serveur, qui garde la bonne réponse et le chrono.
 * Le compte à rebours affiché n'est qu'indicatif ; à zéro, on envoie « pas de réponse ».
 */
export function DefenseSession({ duelId, started }: { duelId: string; started: boolean }) {
  const router = useRouter();
  const [go, setGo] = useState(started);
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });
  const [left, setLeft] = useState(0);
  const sending = useRef(false);

  const fetchNext = useCallback(
    () =>
      nextQuestionAction(duelId).then((r) => {
        if (!r.ok) return setPhase({ kind: "error", message: r.error });
        if (!r.question) return router.refresh();
        sending.current = false;
        setPhase({ kind: "question", q: r.question, deadline: performance.now() + r.question.remainingMs });
      }),
    [duelId, router],
  );
  const load = useCallback(() => {
    setPhase({ kind: "loading" });
    void fetchNext();
  }, [fetchNext]);

  const answer = useCallback(
    async (q: ServedQuestion, picked: number | null) => {
      if (sending.current) return;
      sending.current = true;
      const r = await answerAction(q.id, picked ?? -1);
      if (!r.ok) return void load();
      setPhase({ kind: "feedback", q, picked, answer: r.answer });
    },
    [load],
  );

  useEffect(() => {
    if (go) void fetchNext();
  }, [go, fetchNext]);

  // Chrono affiché
  useEffect(() => {
    if (phase.kind !== "question") return;
    const tick = () => {
      const ms = Math.max(0, phase.deadline - performance.now());
      setLeft(ms);
      if (ms === 0) void answer(phase.q, null);
    };
    tick();
    const t = setInterval(tick, 100);
    return () => clearInterval(t);
  }, [phase, answer]);

  // Clavier : 1 à 5 pour répondre, Entrée pour continuer
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase.kind === "question") {
        const i = Number(e.key) - 1;
        if (i >= 0 && i < phase.q.choices.length) void answer(phase.q, i);
      } else if (phase.kind === "feedback" && e.key === "Enter") {
        load();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, answer, load]);

  if (!go) {
    return (
      <div className="duel-start">
        <p>
          12 questions, 4 par carte adverse, 15 secondes chacune (10 s et 5 choix pour une carte Mystère). Une fois commencée, la session doit être terminée : une question sans réponse à temps compte comme une erreur.
        </p>
        <button type="button" className="vt-btn" onClick={() => setGo(true)} autoFocus>
          Commencer ma défense
        </button>
      </div>
    );
  }
  if (phase.kind === "loading") return <p className="vt-muted">Chargement…</p>;
  if (phase.kind === "error")
    return (
      <p role="alert" className="trade-error">
        {phase.message}
      </p>
    );

  const q = phase.q;
  const done = (q.slotPosition - 1) * 4 + q.index + (phase.kind === "feedback" ? 1 : 0);
  return (
    <div className="duel-quiz" data-mystery={q.card.type === "MYSTERE"}>
      <aside className="duel-attacker" aria-label="Carte attaquante">
        <span className="vt-muted">Carte {q.slotPosition} / 3</span>
        {phase.kind === "feedback" && phase.answer.reveal ? (
          <img src={phase.answer.reveal.imageUrl} alt="" />
        ) : q.card.imageUrl ? (
          <img src={q.card.imageUrl} alt="" />
        ) : (
          <div className="duel-mystery-img" aria-hidden>
            ?
          </div>
        )}
        {phase.kind === "feedback" && phase.answer.reveal && <b className="duel-reveal">{phase.answer.reveal.name}</b>}
        <span className="duel-stats">
          <RarityGem rarity={q.card.rarity} />
          <TypeIcon type={q.card.type} title={TYPE_LABELS[q.card.type].name} />
          <Stat icon="atk">{num.format(q.card.attack)}</Stat>
          {q.card.defense !== null && <Stat icon="def">{num.format(q.card.defense)}</Stat>}
        </span>
      </aside>
      <section className="duel-question">
        <div className="duel-progress" aria-label={`Question ${done} sur 12`}>
          {Array.from({ length: 12 }, (_, i) => (
            <span key={i} data-done={i < done} />
          ))}
        </div>
        {phase.kind === "question" && (
          <div className="duel-timer" role="timer" aria-label={`${Math.ceil(left / 1000)} secondes`}>
            <span style={{ width: `${(left / (q.seconds * 1000)) * 100}%` }} data-low={left < 4000} />
            <b>{Math.ceil(left / 1000)}</b>
          </div>
        )}
        {q.prompt.imageUrl && !q.card.imageUrl && <img className="duel-prompt-img" src={q.prompt.imageUrl} alt="Personnage à reconnaître" />}
        <h2>{q.prompt.text}</h2>
        <ol className="duel-choices">
          {q.choices.map((c, i) => {
            const state =
              phase.kind !== "feedback" ? undefined : i === phase.answer.correctIndex ? "right" : i === phase.picked ? "wrong" : undefined;
            return (
              <li key={i}>
                <button type="button" data-state={state} disabled={phase.kind !== "question"} onClick={() => phase.kind === "question" && answer(q, i)}>
                  <kbd>{i + 1}</kbd>
                  {c}
                </button>
              </li>
            );
          })}
        </ol>
        {phase.kind === "feedback" && (
          <div className="duel-next">
            <p>{phase.answer.correct ? "Bonne réponse !" : phase.picked === null ? "Temps écoulé." : "Raté."}</p>
            <button type="button" className="vt-btn" onClick={() => load()} autoFocus>
              {done === 12 ? "Terminer" : "Continuer"}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
