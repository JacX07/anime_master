// Repère de carte x 15–105, y 14–138. Texture transparente partagée entre trois foyers.
const sparks = [[19, 110], [98, 119], [58, 136], [104, 99]].map(([x, y], i) =>
  `<g opacity=".85"><path class="burn-spark" style="--burn-phase:${i * -.37}s" d="M${x} ${y - 1.7}l.7 1.7-.7 1.7-.7-1.7Z" fill="#ffd293"/></g>`
).join("");

export const BURN_AURA = [[19, 103, -18, 38, 60], [99, 125, 15, 35, 55], [63, 140, -65, 28, 44]].map(([x, y, angle, w, h], i) =>
  `<g transform="translate(${x} ${y}) rotate(${angle})"><g class="burn-ribbon" style="--burn-phase:${i * -.43}s"><image href="/vfx/burn-ribbon.webp" x="${-w / 2}" y="${-h}" width="${w}" height="${h}" preserveAspectRatio="none"/></g></g>`
).join("") + sparks;

// L'aura est déjà affichée par le statut : son application ajoute seulement une gerbe brève.
export const BURN_APPLY = `<g class="burn-application">${sparks}</g>`;
