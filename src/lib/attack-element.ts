// Élément des attaques (maquette public/mockups/elements.html) : animation, bruitage, et effet ajouté au sort secondaire (★)
// des personnages concernés (docs/specs/combat.md, « Éléments »).
export type AttackElement = "feu" | "eau" | "foudre" | "air" | "terre";

const BY_ELEMENT: Record<AttackElement, number[]> = {
  // Mustang, Ace, Itachi, Bakugou, Todoroki, Megumin, Benimaru, Nezuko, Sukuna, Reze, Rengoku
  feu: [68, 2072, 14, 88892, 89220, 89361, 130848, 127518, 133701, 148740, 129133],
  // Rukia, Esdeath, Roxy, Emilia, Rem, Aqua, Tanjirou, Giyuu
  eau: [6, 65239, 88350, 88572, 88575, 89362, 126071, 130050],
  // Sasuke, Killua, Kakashi, Nami, Yoruichi, Zenitsu
  foudre: [13, 27, 85, 723, 908, 129131],
  // Naruto, Howl, Tatsumaki, Kazuma, Tanya
  air: [17, 507, 81929, 89364, 121052],
  // Edward, Alphonse, Gaara, Reiner, Kirishima, Phosphophyllite
  terre: [11, 12, 1662, 46484, 89243, 123385],
};

const ELEMENTS = new Map<number, AttackElement>(
  (Object.entries(BY_ELEMENT) as [AttackElement, number[]][]).flatMap(([element, ids]) => ids.map((id) => [id, element] as const)),
);

export function attackElement(id: number): AttackElement | null {
  return ELEMENTS.get(id) ?? null;
}

/** Persos dont le sort ★ ne frappe aucun ennemi (Itachi, Nezuko, Rengoku, Alphonse, Gaara, Reiner, Kirishima) : visuel et son seulement, aucun effet de jeu. */
const VISUAL_ONLY = new Set([14, 127518, 129133, 12, 1662, 46484, 89243]);

/** Élément porteur d'un effet de jeu sur le sort secondaire (null pour les persos purement visuels). */
export function effectElement(id: number): AttackElement | null {
  return VISUAL_ONLY.has(id) ? null : attackElement(id);
}

/** Valeurs de l'effet d'élément porté par le sort secondaire (validées le 2026-11-01, à recalibrer après simulation). */
export const ELEMENT_RIDER = {
  /** Eau : soigne un allié vivant au hasard (un autre que le lanceur s'il y en a) de 10 % de ses PV max, et trempe les cibles touchées. */
  healPct: 0.1,
  wetTurns: 2,
  /** Foudre : étourdit une cible trempée (son prochain tour) et la sèche. */
  stunTurns: 1,
  /** Terre : vitesse −25 % des cibles touchées. */
  slow: -0.25,
  slowTurns: 2,
  /** Feu : brûlure de 5 % des PV max à la fin de chaque action de la cible. */
  burnPct: 0.05,
  burnTurns: 2,
  /** Une zone qui touche plusieurs ennemis brûle chaque cible deux fois moins fort. */
  burnZoneScale: 0.5,
  /** Air : esquive +20 points pour le lanceur. */
  dodge: 0.2,
  dodgeTurns: 2,
} as const;

const pct = (x: number) => `${Math.round(Math.abs(x) * 100)} %`;
export const ELEMENT_LABEL: Record<AttackElement, string> = { feu: "Feu", eau: "Eau", foudre: "Foudre", air: "Air", terre: "Terre" };

/** Texte de l'effet d'élément, ajouté à la description du sort secondaire. */
export function describeElement(element: AttackElement): string {
  const r = ELEMENT_RIDER;
  switch (element) {
    case "eau": return `Eau : soigne un allié au hasard de ${pct(r.healPct)} de ses PV max ; les cibles touchées sont trempées (${r.wetTurns} actions).`;
    case "foudre": return "Foudre : étourdit une cible trempée (son prochain tour).";
    case "terre": return `Terre : vitesse −${pct(r.slow)} pour les cibles touchées, ${r.slowTurns} actions.`;
    case "feu": return `Feu : brûlure de ${pct(r.burnPct)} des PV max par action pour la cible touchée (moitié en zone), ${r.burnTurns} actions.`;
    case "air": return `Air : esquive +${Math.round(r.dodge * 100)} points pour le lanceur, ${r.dodgeTurns} actions.`;
  }
}
