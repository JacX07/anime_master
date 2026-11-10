import assert from "node:assert/strict";
import { overBudget, teamCost, TEAM_BUDGET } from "../src/lib/team-budget";

const check = (name: string, ok: boolean) => { assert(ok, name); console.log("OK", name); };
check("Budget de 24", TEAM_BUDGET === 24);
check("Coûts UR 8, SSR 5, SR 3, R 2, N 1", teamCost(["UR", "SSR", "SR", "R", "N"]) === 19);
check("4 UR (32) refusés", overBudget(["UR", "UR", "UR", "UR"]));
check("3 UR + N (25) refusés", overBudget(["UR", "UR", "UR", "N"]));
check("2 UR + SSR + SR (24) acceptés", !overBudget(["UR", "UR", "SSR", "SR"]));
check("4 SSR (20) acceptés", !overBudget(["SSR", "SSR", "SSR", "SSR"]));
check("Duo d'histoire jamais limité", !overBudget(["UR", "UR"]));
