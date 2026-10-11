// Génération des questions de duel (SPEC étape 4, §2) à partir des données de l'étape 1, sans LLM.
// Appelée quand le défenseur commence sa session ; les questions sont ensuite servies une par une.

import { randomInt } from "node:crypto";
import type { CardType } from "../generated/prisma/enums";
import { prisma } from "./db";
import { quizFormat } from "./duel-rules";

export type QuestionKind = "WHO" | "SERIES" | "BIRTHDAY" | "SAME_SERIES" | "STUDIO" | "YEAR";

export interface QuestionPrompt {
  text: string;
  /** Image du personnage (question « Qui est-ce ? ») */
  imageUrl?: string;
}

export interface GeneratedQuestion {
  kind: QuestionKind;
  prompt: QuestionPrompt;
  choices: string[];
  correctIndex: number;
}

const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const dateLabel = (m: number, d: number) => `${d === 1 ? "1er" : d} ${MONTHS[m - 1]}`;

const pick = <T,>(list: readonly T[]) => list[randomInt(list.length)];
function shuffle<T>(list: T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface MediaRow {
  id: number;
  title: string;
  year: number | null;
  studio: string | null;
  genres: string[];
}

// Toutes les séries (quelques milliers de lignes légères), gardées en mémoire pour choisir les fausses réponses
let mediaCache: Promise<MediaRow[]> | null = null;
function allMedia() {
  mediaCache ??= prisma.media
    .findMany({ select: { id: true, titleRomaji: true, titleEnglish: true, year: true, studio: true, genres: true } })
    .then((rows) => rows.map((m) => ({ id: m.id, title: m.titleEnglish ?? m.titleRomaji, year: m.year, studio: m.studio, genres: Array.isArray(m.genres) ? (m.genres as string[]) : [] })));
  return mediaCache;
}

/** Séries les plus proches : genres en commun (Jaccard), puis année. */
async function similarMedia(of: MediaRow, take = 40): Promise<MediaRow[]> {
  const g = new Set(of.genres);
  const score = (m: MediaRow) => {
    const common = m.genres.filter((x) => g.has(x)).length;
    const union = new Set([...m.genres, ...of.genres]).size || 1;
    return common / union - (of.year && m.year ? Math.abs(of.year - m.year) / 200 : 0.1);
  };
  return (await allMedia())
    .filter((m) => m.id !== of.id)
    .map((m) => [m, score(m)] as const)
    .sort((a, b) => b[1] - a[1])
    .slice(0, take)
    .map(([m]) => m);
}

/** Bonne réponse + fausses réponses distinctes, mélangées ; null si pas assez de fausses réponses. */
function build(kind: QuestionKind, prompt: QuestionPrompt, correct: string, pool: string[], n: number): GeneratedQuestion | null {
  const wrong: string[] = [];
  for (const w of shuffle(pool)) {
    if (w !== correct && !wrong.includes(w)) wrong.push(w);
    if (wrong.length === n - 1) break;
  }
  if (wrong.length < n - 1) return null;
  const choices = shuffle([correct, ...wrong]);
  return { kind, prompt, choices, correctIndex: choices.indexOf(correct) };
}

interface Subject {
  id: number;
  name: string;
  imageUrl: string;
  birthMonth: number | null;
  birthDay: number | null;
  media: MediaRow | null;
  /** Autres personnages de la série principale */
  mates: { id: number; name: string }[];
}

async function loadSubject(characterId: number): Promise<Subject> {
  const c = await prisma.character.findUniqueOrThrow({ where: { id: characterId }, select: { id: true, name: true, imageUrl: true, birthMonth: true, birthDay: true, mainMediaId: true } });
  const media = c.mainMediaId ? ((await allMedia()).find((m) => m.id === c.mainMediaId) ?? null) : null;
  const mates = c.mainMediaId
    ? (await prisma.characterMedia.findMany({ where: { mediaId: c.mainMediaId, characterId: { not: c.id }, character: { disabled: false } }, select: { character: { select: { id: true, name: true } } } })).map((r) => r.character)
    : [];
  return { ...c, media, mates };
}

/** Noms de personnages dont la série principale fait partie de `mediaIds`, hors `exclude`. */
async function namesFrom(mediaIds: number[], exclude: Set<number>, take = 60) {
  const rows = await prisma.character.findMany({ where: { mainMediaId: { in: mediaIds }, disabled: false, id: { notIn: [...exclude] } }, select: { name: true }, take });
  return rows.map((r) => r.name);
}

async function makeQuestion(kind: QuestionKind, s: Subject, n: number): Promise<GeneratedQuestion | null> {
  const similar = s.media ? await similarMedia(s.media) : [];
  switch (kind) {
    case "WHO": {
      let pool = s.mates.map((m) => m.name);
      if (pool.length < n - 1) pool = [...pool, ...(await namesFrom(similar.map((m) => m.id), new Set([s.id])))];
      return build(kind, { text: "Qui est-ce ?", imageUrl: s.imageUrl }, s.name, pool, n);
    }
    case "SERIES":
      if (!s.media) return null;
      return build(kind, { text: "De quel anime vient ce personnage ?" }, s.media.title, similar.map((m) => m.title), n);
    case "BIRTHDAY": {
      if (!s.birthMonth || !s.birthDay) return null;
      const pool = Array.from({ length: 30 }, () => {
        const m = randomInt(1, 13);
        return dateLabel(m, randomInt(1, DAYS_IN_MONTH[m - 1] + 1));
      });
      return build(kind, { text: "Quand est son anniversaire ?" }, dateLabel(s.birthMonth, s.birthDay), pool, n);
    }
    case "SAME_SERIES": {
      if (!s.media || s.mates.length === 0) return null;
      const exclude = new Set([s.id, ...s.mates.map((m) => m.id)]);
      const mateNames = new Set(s.mates.map((m) => m.name));
      const pool = (await namesFrom(similar.map((m) => m.id), exclude)).filter((x) => !mateNames.has(x));
      return build(kind, { text: "Lequel de ces personnages est dans la même série ?" }, pick(s.mates).name, pool, n);
    }
    case "STUDIO": {
      if (!s.media?.studio) return null;
      let pool = similar.map((m) => m.studio).filter((x): x is string => !!x);
      if (new Set(pool).size < n) pool = [...pool, ...(await allMedia()).map((m) => m.studio).filter((x): x is string => !!x)];
      return build(kind, { text: `Quel studio a produit ${s.media.title} ?` }, s.media.studio, pool, n);
    }
    case "YEAR": {
      if (!s.media?.year) return null;
      const y = s.media.year;
      const max = new Date().getFullYear() + 1;
      const pool = [-6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6].map((d) => y + d).filter((v) => v >= 1950 && v <= max).map(String);
      return build(kind, { text: `En quelle année ${s.media.title} a-t-il commencé ?` }, String(y), pool, n);
    }
  }
}

const ALL_KINDS: QuestionKind[] = ["WHO", "SERIES", "BIRTHDAY", "SAME_SERIES", "STUDIO", "YEAR"];

/**
 * Les 4 questions sur une carte : qui est-ce, quelle série, une question au hasard (anniversaire ou même série),
 * puis studio ou année. Une question impossible faute de données est remplacée par une autre possible.
 */
export async function generateQuestions(characterId: number, type: CardType): Promise<GeneratedQuestion[]> {
  const { choices: n } = quizFormat(type);
  const s = await loadSubject(characterId);
  const plan: QuestionKind[] = ["WHO", "SERIES", pick(["BIRTHDAY", "SAME_SERIES"] as const), pick(["STUDIO", "YEAR"] as const)];
  const used = new Set<QuestionKind>();
  const out: GeneratedQuestion[] = [];
  for (const wanted of plan) {
    for (const kind of [wanted, ...shuffle(ALL_KINDS.filter((k) => k !== wanted))]) {
      if (used.has(kind)) continue;
      const q = await makeQuestion(kind, s, n);
      if (!q) continue;
      used.add(kind);
      out.push(q);
      break;
    }
  }
  if (out.length < 4) throw new Error(`Pas assez de questions possibles pour le personnage ${characterId}`);
  return out;
}
