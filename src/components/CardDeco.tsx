// Un seul SVG statique : le fer forgé reprend la couleur de rareté, sans filtre ni animation.
const C = "var(--frame-c)";
const LIGHT = "var(--frame-light)";
const LOW = "var(--frame-low)";
const DARK = "var(--frame-dark)";

/** Même cadre riveté pour toutes les raretés, y compris N. */
export function CardDeco() {
  return (
    <svg className="card-deco" viewBox="0 0 220 308" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <rect x="3" y="3" width="214" height="302" rx="3" fill="none" stroke={DARK} strokeWidth="9" />
      <rect x="3" y="3" width="214" height="302" rx="3" fill="none" stroke={C} strokeWidth="3.5" />
      <rect x="7" y="7" width="206" height="294" rx="1" fill="none" stroke={LOW} strokeWidth="1.5" />
      {[[3, 3, 0], [217, 3, 90], [217, 305, 180], [3, 305, 270]].map(([x, y, angle]) => (
        <g key={angle} transform={`translate(${x} ${y}) rotate(${angle})`}>
          <path d="M-5 38V-5H38L30 4H4V30Z" fill={LOW} stroke={C} strokeWidth="1.6" />
          <path d="M-2 31V-2H31" fill="none" stroke={LIGHT} strokeWidth="1" />
          <path d="M5 10 10 5" stroke={DARK} strokeWidth="2" />
          <circle cx="10" cy="10" r="3.6" fill={DARK} stroke={LIGHT} strokeWidth="1.2" />
          <circle cx="9.4" cy="9.4" r="1.3" fill={C} />
          <circle cx="29" cy="0" r="2" fill={LIGHT} />
          <circle cx="0" cy="29" r="2" fill={LIGHT} />
        </g>
      ))}
      <path d="M65 3H155M65 305H155" stroke={C} strokeWidth="3" />
      <path d="M3 100V208M217 100V208" stroke={C} strokeWidth="2.5" />
    </svg>
  );
}
