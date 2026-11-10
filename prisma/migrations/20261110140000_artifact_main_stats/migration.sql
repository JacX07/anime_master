-- Stat principale des artefacts (v0.3.0) : même formule pour toutes les raretés, base + gain par niveau
-- (36 % à +16 pour les %, 60 % critique, 80 % dégâts critiques, 40 vitesse, ×5 en valeur fixe). Les sous-stats ne changent pas.
UPDATE "Artifact" SET "mainValue" = CASE "mainStat"
  WHEN 'attack' THEN 0.04 + 0.02 * "level"
  WHEN 'defense' THEN 0.04 + 0.02 * "level"
  WHEN 'hp' THEN 0.04 + 0.02 * "level"
  WHEN 'magicSkill' THEN 0.04 + 0.02 * "level"
  WHEN 'crit' THEN 0.04 + 0.035 * "level"
  WHEN 'critDamage' THEN 0.08 + 0.045 * "level"
  WHEN 'speed' THEN 8 + 2 * "level"
  WHEN 'flatAttack' THEN 57 + 14.25 * "level"
  WHEN 'flatDefense' THEN 45 + 11.25 * "level"
  WHEN 'flatHp' THEN 285 + 71.25 * "level"
  ELSE "mainValue"
END;
