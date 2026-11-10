"use server";

import { refresh } from "next/cache";
import type { Rarity } from "@/generated/prisma/enums";
import {
  DevToolError, addCrystals, keepAdventureLevel, addMaterials, addRyo, devToolsEnabled, giveCharacter, giveRandom, searchCharacters,
  setAdventureLevel, setDungeon, setStars, setStory, setTower, giveArtifacts, unlockAll,
} from "@/lib/dev-tools";
import { getSessionUser } from "@/lib/session";

export type DevState = { ok: boolean; message: string } | null;
export type FoundCharacter = { id: number; name: string; rarity: Rarity; imageUrl: string };

const RARITIES = ["N", "R", "SR", "SSR", "UR"] as const;
const text = (fd: FormData, k: string) => String(fd.get(k) ?? "");
const num = (fd: FormData, k: string) => Number(text(fd, k));
const rarity = (v: string) => { if (!(RARITIES as readonly string[]).includes(v)) throw new DevToolError("Rareté inconnue."); return v as Rarity; };

async function userId() {
  if (!devToolsEnabled()) throw new DevToolError("Indisponible en production.");
  const user = await getSessionUser();
  if (!user) throw new DevToolError("Connecte-toi d'abord.");
  return user.id;
}

/** Une action d'outil de test sur son propre compte ; tout le site est revalidé pour voir le résultat partout. */
export async function devAction(_prev: DevState, fd: FormData): Promise<DevState> {
  try {
    const id = await userId();
    let message: string;
    switch (text(fd, "op")) {
      case "give": {
        const n = await giveCharacter(id, num(fd, "character"), num(fd, "copies"), num(fd, "stars"));
        message = `${n} carte${n > 1 ? "s" : ""} ajoutée${n > 1 ? "s" : ""} : ${text(fd, "label")}.`;
        break;
      }
      case "random": {
        const n = await giveRandom(id, rarity(text(fd, "rarity")), num(fd, "count"), num(fd, "stars"));
        message = `${n} carte${n > 1 ? "s" : ""} ${text(fd, "rarity")} au hasard ajoutée${n > 1 ? "s" : ""}.`;
        break;
      }
      case "stars": {
        const r = text(fd, "rarity");
        const n = await setStars(id, num(fd, "stars"), r === "ALL" ? "ALL" : rarity(r));
        message = `${n} carte${n > 1 ? "s" : ""} à ${num(fd, "stars")} étoile${num(fd, "stars") > 1 ? "s" : ""} d'éveil.`;
        break;
      }
      case "level": {
        const r = await setAdventureLevel(id, num(fd, "level"));
        message = r.floorFromQuests
          ? `Tes objectifs déjà remplis dépassent le niveau ${r.target} : impossible de descendre plus bas.`
          : `Niveau d'Arpenteur fixé à ${r.target}. Les récompenses de niveau arrivent au prochain affichage.`;
        break;
      }
      case "story": {
        await setStory(id, text(fd, "universe"), num(fd, "level"));
        message = "Histoire mise à jour (univers précédents terminés à 3 étoiles).";
        break;
      }
      case "tower": message = `Tour : étage ${await setTower(id, num(fd, "floor"))} atteint.`; break;
      case "dungeon": message = `Donjon : difficulté ${await setDungeon(id, text(fd, "dungeon"), num(fd, "level"))} vaincue.`; break;
      case "ryo": message = `${await addRyo(id, num(fd, "amount"))} Ryō ajoutés.`; break;
      case "crystals": message = `Cristaux : ${await addCrystals(id, num(fd, "amount"))} en stock.`; break;
      case "materials": {
        const n = await addMaterials(id, text(fd, "key"), num(fd, "amount"));
        message = `${num(fd, "amount")} ajouté${n > 1 ? `s à ${n} matériaux` : ""}.`;
        break;
      }
      case "artifacts": {
        const n = await giveArtifacts(id, text(fd, "set"), rarity(text(fd, "rarity")), num(fd, "level"), num(fd, "count"));
        message = `${n} artefact${n > 1 ? "s" : ""} ${text(fd, "rarity")} +${num(fd, "level")} ajouté${n > 1 ? "s" : ""}.`;
        break;
      }
      case "unlock": {
        await unlockAll(id);
        message = "Tout est débloqué : histoire, Tour, donjons, raids et niveau d'Arpenteur maximum.";
        break;
      }
      default: throw new DevToolError("Action inconnue.");
    }
    if (text(fd, "op") !== "level" && text(fd, "op") !== "unlock") await keepAdventureLevel(id);
    refresh();
    return { ok: true, message };
  } catch (err) {
    if (err instanceof DevToolError) return { ok: false, message: err.message };
    console.error("Outil de test en échec :", err);
    return { ok: false, message: "L'opération a échoué. Recharge la page pour vérifier l'état de ton compte avant de réessayer." };
  }
}

export async function searchAction(q: string): Promise<FoundCharacter[]> {
  await userId();
  if (q.trim().length < 2) return [];
  return (await searchCharacters(q)) as FoundCharacter[];
}
