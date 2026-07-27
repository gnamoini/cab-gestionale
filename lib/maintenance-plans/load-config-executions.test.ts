import assert from "node:assert/strict";
import {
  dedupeExecutionPoints,
  pickLatestMatchingService,
  serviceMatchesConfig,
  valueAtServiceForInterval,
} from "@/lib/maintenance-plans/load-config-executions";

const config = {
  configId: "cfg-1",
  mezzoId: "m-1",
  presetId: "p-1",
  intervalType: "km" as const,
};

assert.equal(
  serviceMatchesConfig({ config_id: "cfg-1", mezzo_id: "m-1", plan_id: "p-1" }, config),
  true,
);
assert.equal(
  serviceMatchesConfig({ config_id: null, mezzo_id: "m-1", plan_id: "p-1" }, config),
  true,
);
assert.equal(
  serviceMatchesConfig({ config_id: null, mezzo_id: "m-2", plan_id: "p-1" }, config),
  false,
);
assert.equal(
  serviceMatchesConfig({ config_id: "other", mezzo_id: "m-1", plan_id: "p-1" }, config),
  false,
);

assert.equal(
  valueAtServiceForInterval("km", { ore_at_service: 100, km_at_service: 75636 }),
  75636,
);
assert.equal(
  valueAtServiceForInterval("km", { ore_at_service: 75000, km_at_service: null }),
  75000,
);

const latest = pickLatestMatchingService(
  [
    {
      config_id: null,
      mezzo_id: "m-1",
      plan_id: "p-1",
      performed_at: "2026-07-21",
      ore_at_service: 75636,
      km_at_service: 75636,
    },
    {
      config_id: "cfg-1",
      mezzo_id: "m-1",
      plan_id: "p-1",
      performed_at: "2026-01-01",
      ore_at_service: 50000,
      km_at_service: 50000,
    },
  ],
  config,
);
assert.equal(latest?.performed_at, "2026-07-21");
assert.equal(latest?.km_at_service, 75636);

const deduped = dedupeExecutionPoints([
  { performedAt: "2026-07-21", valueAtService: 75636 },
  { performedAt: "2026-07-21", valueAtService: 75636 },
]);
assert.equal(deduped.length, 1);

console.log("load-config-executions.test.ts OK");
