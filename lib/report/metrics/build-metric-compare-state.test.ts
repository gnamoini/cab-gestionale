import assert from "node:assert/strict";
import { compareForApplicability } from "@/lib/report/metrics/build-metric-compare-state";

const built = {
  status: "available" as const,
  previousValue: 10,
  deltaAbs: 2,
  deltaPercent: 20,
};

assert.deepEqual(
  compareForApplicability("snapshot", "prev_period", built),
  built,
  "legacy compare rows preserved when built",
);

assert.deepEqual(compareForApplicability("snapshot", "prev_period", null), {
  status: "unavailable",
  reason: "snapshot",
});

assert.equal(compareForApplicability("period", "none", built), null);

console.log("build-metric-compare-state.test.ts OK");
