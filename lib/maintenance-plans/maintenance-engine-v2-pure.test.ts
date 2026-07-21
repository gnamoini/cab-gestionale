import assert from "node:assert/strict";
import { resolveEffectivePreset, mergePresetParts } from "@/lib/maintenance-plans/resolve-effective-preset";
import { isPartDue } from "@/lib/maintenance-plans/part-replacement-condition";
import { resolveMilestones } from "@/lib/maintenance-plans/forecast/ema-forecast";
import { computeMaintenanceUrgency } from "@/lib/maintenance-plans/compute-maintenance-urgency";
import { groupOverviewByInterval } from "@/lib/maintenance-plans/resolve-mezzo-metering";

const effective = resolveEffectivePreset({
  presetId: "p1",
  presetNome: "Test",
  intervalType: "ore",
  intervalValue: 500,
  baseParts: [{ ricambioId: "r1", codice: "A", descrizione: "Olio", quantita: 1 }],
  vehicleOverrideParts: [{ ricambioId: "r2", codice: "B", descrizione: "Filtro", quantita: 2 }],
});
assert.equal(effective.parts.length, 2);

const merged = mergePresetParts(
  [{ ricambioId: "r1", codice: "A", descrizione: "A", quantita: 1 }],
  [{ ricambioId: "r1", codice: "A", descrizione: "A override", quantita: 3 }],
);
assert.equal(merged[0]!.quantita, 3);

assert.equal(isPartDue({ condition: "sempre", conditionParams: null, executionCount: 1, oreSinceLastReplace: null, kmSinceLastReplace: null }), true);
assert.equal(
  isPartDue({ condition: "ogni_n_tagliandi", conditionParams: { n: 2 }, executionCount: 2, oreSinceLastReplace: null, kmSinceLastReplace: null }),
  true,
);

assert.equal(computeMaintenanceUrgency({ nextDateEstimated: "2099-01-01", remainingValue: 100, today: "2026-01-01" }), "verde");
assert.equal(computeMaintenanceUrgency({ nextDateEstimated: "2026-01-05", remainingValue: 10, today: "2026-01-01" }), "arancione");

const groups = groupOverviewByInterval([
  { intervalType: "ore", intervalValue: 500, configId: "c1" },
  { intervalType: "ore", intervalValue: 1000, configId: "c2" },
  { intervalType: "ore", intervalValue: 500, configId: "c3" },
]);
assert.equal(groups.length, 2);
assert.equal(groups[0]!.rows.length, 2);

const crossed = resolveMilestones({ ultimo: 1000, currentValue: 1700, intervalValue: 500 });
assert.equal(crossed.dueMilestoneValue, 1500);
assert.ok(crossed.isOverdue);

console.log("maintenance-engine-v2-pure.test.ts OK");
