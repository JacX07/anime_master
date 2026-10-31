/** Visual style of a character's basic attack; unknown characters use a melee strike. */
export function attackVisual(id: number): "melee" | "slash" | "magic" | "gun" {
  if ([176754, 183965, 68, 498, 507, 127691, 130848, 222594].includes(id)) return "magic";
  if ([2, 458, 8455, 10010, 13580, 138101, 260329].includes(id)) return "gun";
  if ([5, 6, 62, 210, 422, 424, 497, 672, 1086, 5189, 10138, 13020, 13767, 123285, 124440, 126071, 129130, 129131, 129133, 129571, 130050, 130102, 136070, 136071, 136072, 136837].includes(id)) return "slash";
  return "melee";
}
