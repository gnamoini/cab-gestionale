import assert from "node:assert/strict";
import {
  defaultDualTriggers,
  formatTriggerSummary,
  primaryIntervalFromTriggers,
  triggersNeedKm,
  triggersNeedOre,
} from "@/lib/maintenance-plans/maintenance-trigger-helpers";

assert.equal(formatTriggerSummary(defaultDualTriggers("ore_mesi")), "500 ore oppure 12 mesi");
assert.deepEqual(primaryIntervalFromTriggers(defaultDualTriggers("km_mesi")), {
  intervalType: "km",
  intervalValue: 15000,
  intervalOre: 15000,
});
assert.equal(triggersNeedKm(defaultDualTriggers("km_mesi")), true);
assert.equal(triggersNeedOre(defaultDualTriggers("km_mesi")), false);
assert.equal(triggersNeedOre(defaultDualTriggers("ore_mesi")), true);

console.log("maintenance-trigger-helpers.test.ts OK");
