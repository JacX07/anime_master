// Élément visuel des attaques (maquette public/mockups/elements.html). Purement cosmétique : aucun effet sur le combat.
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
