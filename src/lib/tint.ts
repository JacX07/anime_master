/** Teinte (0-359) propre à un nom : un monde de l'album, un partenaire d'échange… stable d'une visite à l'autre */
export function hueOf(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}

/** Couleur d'accent d'un nom, à poser dans `--w` */
export const tintOf = (name: string) => `hsl(${hueOf(name)} 85% 62%)`;
