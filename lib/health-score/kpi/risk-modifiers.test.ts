import assert from "node:assert/strict";
import { resetHealthScoreRegistry, ensureHealthScoreRegistry } from "@/lib/health-score/bootstrap";
import { getAllRiskModifiers } from "@/lib/health-score/registry/risk-modifier-registry";
import type { KpiContext } from "@/lib/health-score/types";

function stagnationPenalty(count: number, weightedExcessDays = 5) {
  resetHealthScoreRegistry();
  ensureHealthScoreRegistry();
  const mod = getAllRiskModifiers().find((m) => m.id === "stagnation");
  assert.ok(mod);
  const ctx = {
    snapshot: {
      inactiveLavorazioniCount: count,
      inactiveWeightedExcessDays: weightedExcessDays,
    },
  } as KpiContext;
  return mod!.compute(ctx).penalty;
}

assert.equal(stagnationPenalty(1, 5), 1, "1 macchina ferma con excess pieno → −1 pt");
assert.equal(stagnationPenalty(10, 15), 10, "10 macchine ferme excess pieno → −10 pt totali, non −10 ciascuna");
assert.equal(stagnationPenalty(20, 25), 15, "cap a 15 pt");
assert.equal(
  stagnationPenalty(10, 3),
  6,
  "attesa ricambi soft (excess basso) → penalità sotto il puro count",
);
assert.ok(
  stagnationPenalty(5, 1.5) < 5,
  "5 mezzi in attesa ricambi lunghe non devono costare −5 pieni",
);

console.log("risk-modifiers.test.ts OK");
