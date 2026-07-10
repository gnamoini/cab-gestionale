/**
 * ponytail: self-check — consecutive green SHA counting
 */
import assert from "node:assert/strict";
import {
  countConsecutiveGreenFromNewest,
  isGreenRecord,
  type ShadowCutoverRecord,
} from "@/lib/control/shadow-correlation";

const green: ShadowCutoverRecord = {
  sha: "a",
  legacyRunId: 1,
  controlRunId: 2,
  pr: 1,
  legacy: "success",
  control: "success",
  legacyJobDurationMs: 100,
  controlJobDurationMs: 90,
  durationDeltaMs: -10,
  mismatch: 0,
  unexpectedNewFailures: 0,
  blockerMismatchRate: 0,
  green: true,
};

const bad: ShadowCutoverRecord = { ...green, sha: "b", control: "failure", green: false };

assert.equal(isGreenRecord(green), true);
assert.equal(isGreenRecord(bad), false);
assert.equal(countConsecutiveGreenFromNewest([green, bad, green]), 1);
assert.equal(countConsecutiveGreenFromNewest([green, green]), 2);

console.log("shadow-correlation self-check OK");
