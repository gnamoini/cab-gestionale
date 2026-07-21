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

assert.equal(stagnationPenalty(1), 1, "1 macchina ferma → −1 pt");
assert.equal(stagnationPenalty(10), 10, "10 macchine ferme → −10 pt totali, non −10 ciascuna");
assert.equal(stagnationPenalty(20), 15, "cap a 15 pt");

console.log("risk-modifiers.test.ts OK");
