import assert from "node:assert/strict";
import { tanhTrendNormalizer, tanhLevelNormalizer } from "@/lib/health-score/normalizers/tanh-normalizer";
import { HEALTH_SCORE_V2_DEFAULTS } from "@/lib/health-score/config/defaults";
import type { KpiContext, KpiRawValue } from "@/lib/health-score/types";
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

const improving: KpiRawValue = { current: 120, previous: 100, sampleSize: 10 };
const trendUp = tanhTrendNormalizer(improving, 0, ctx, false);
assert.ok(trendUp.score > 50, "positive trend above neutral");

const levelGood = tanhLevelNormalizer({ current: 5, previous: null, sampleSize: 10 }, 7, ctx, true);
assert.ok(levelGood.score > 50, "below target for invert metric is good");

console.log("tanh-normalizer.test.ts OK");
