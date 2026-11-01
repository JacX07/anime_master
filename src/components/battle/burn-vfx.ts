// Repère de la carte : x 15–105, y 14–138. Trois braises, sans voile ni flammes.
export const BURN_EMBERS = [[32, 118], [67, 101], [88, 130]].map(([x, y], i) =>
  `<g opacity=".65"><path class="emb" style="animation-delay:-${i * .53}s" d="M${x} ${y - 2}l1 2-1 2-1-2Z" fill="#ef9b53"/></g>`
).join("");
