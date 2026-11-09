// SVG statique « filet biseauté » (DA §4.5) : fins filets, coins coupés, losanges, comme le dos de carte.
// Chaque rareté ajoute un élément : filet intérieur (R), losanges haut et bas (SR), pointillé (SSR), losanges latéraux et filet extérieur (UR).
const C = "var(--rarity)";
const W = 220;
const H = 308;
const LEVEL = { N: 0, R: 1, SR: 2, SSR: 3, UR: 4 } as const;
const cham = (i: number, c: number) => `M${i + c},${i}H${W - i - c}L${W - i},${i + c}V${H - i - c}L${W - i - c},${H - i}H${i + c}L${i},${H - i - c}V${i + c}Z`;
const dia = (x: number, y: number, s: number) => `M${x},${y - s}L${x + s},${y}L${x},${y + s}L${x - s},${y}Z`;

/** Fond sombre du cadre (sous l'illustration), à coins coupés. */
export function CardFill() {
  return (
    <svg className="card-deco-fill" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <path d={cham(3, 20)} fill="var(--frame-dark)" />
    </svg>
  );
}

export function CardDeco({ rarity }: { rarity: keyof typeof LEVEL }) {
  const l = LEVEL[rarity] ?? 0;
  return (
    <svg className="card-deco" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <path d={cham(3, 20)} fill="none" stroke={C} strokeWidth="3" />
      {l >= 1 && <path d={cham(9, 16)} fill="none" stroke={C} strokeWidth="1.2" opacity=".75" />}
      {l >= 2 && <path d={dia(W / 2, 3, 7) + dia(W / 2, H - 3, 7)} fill={C} />}
      {l >= 3 && <path d={cham(15, 12)} fill="none" stroke={C} strokeWidth="1" strokeDasharray="2 4" opacity=".7" />}
      {l >= 4 && <path d={dia(3, H / 2, 7) + dia(W - 3, H / 2, 7)} fill={C} />}
      {l >= 4 && <path d={cham(-6, 26)} fill="none" stroke={C} strokeWidth="1" opacity=".5" />}
    </svg>
  );
}
