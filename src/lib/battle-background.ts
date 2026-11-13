/** Décor stable pour l'histoire et le donjon DBZ ; les autres modes gardent leur plateau. */
export function battleBackground(opponent: string): string | undefined {
  const match = /^(story|dungeon):dragon-ball:(\d{1,2})$/.exec(opponent);
  if (!match) return;
  const level = Number(match[2]);
  const story = match[1] === "story";
  if (level < 1 || level > (story ? 15 : 10)) return;
  const index = story ? Math.floor((level - 1) / 5) : level <= 3 ? 0 : level <= 6 ? 1 : 2;
  return `/images/battle/dragon-ball/${["tournoi", "namek", "enfer"][index]}.webp`;
}
