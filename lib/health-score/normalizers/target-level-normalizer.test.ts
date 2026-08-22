import assert from "node:assert/strict";
import {
  HEALTH_SCORE_TARGET_ACHIEVED,
  targetLevelNormalizer,
} from "@/lib/health-score/normalizers/target-level-normalizer";
import { HEALTH_SCORE_V2_DEFAULTS } from "@/lib/health-score/config/defaults";
import type { KpiContext } from "@/lib/health-score/types";
import {
  getControlTowerLast30DaysRange,
  getControlTowerPrevious30DaysRange,
} from "@/lib/dashboard/control-tower-time-ranges";

const anchor = new Date("2026-06-15T12:00:00.000Z");
const ctx: KpiContext = {
  snapshot: {} as KpiContext["snapshot"],
  workshopSize: "media",
  config: HEALTH_SCORE_V2_DEFAULTS,
  anchor,
  range: getControlTowerLast30DaysRange(anchor),
  prevRange: getControlTowerPrevious30DaysRange(anchor),
  kpiResults: new Map(),
};

const raw = (current: number) => ({ current, previous: null, sampleSize: 10 });

assert.equal(targetLevelNormalizer(raw(20), 20, ctx, false).score, HEALTH_SCORE_TARGET_ACHIEVED);
assert.equal(targetLevelNormalizer(raw(40), 20, ctx, false).score, HEALTH_SCORE_TARGET_ACHIEVED, "no bonus above min target");
assert.equal(targetLevelNormalizer(raw(10), 20, ctx, false).score, 45);

assert.equal(targetLevelNormalizer(raw(7), 7, ctx, true).score, HEALTH_SCORE_TARGET_ACHIEVED);
assert.equal(targetLevelNormalizer(raw(3), 7, ctx, true).score, HEALTH_SCORE_TARGET_ACHIEVED, "no bonus below max target");
assert.equal(targetLevelNormalizer(raw(14), 7, ctx, true).score, 45);

assert.equal(targetLevelNormalizer(raw(0), 0, ctx, true).score, HEALTH_SCORE_TARGET_ACHIEVED);
assert.ok(targetLevelNormalizer(raw(3), 0, ctx, true).score < HEALTH_SCORE_TARGET_ACHIEVED);

console.log("target-level-normalizer.test.ts OK");
