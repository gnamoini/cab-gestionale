import assert from "node:assert/strict";
import { resetHealthScoreRegistry, ensureHealthScoreRegistry } from "@/lib/health-score/bootstrap";
import { HEALTH_SCORE_V2_DEFAULTS } from "@/lib/health-score/config/defaults";
import { computeHealthScoreFromSnapshot } from "@/lib/health-score/engine/pipeline";
import type { InputSnapshot } from "@/lib/health-score/types";
import {
  getControlTowerLast30DaysRange,
  getControlTowerPrevious30DaysRange,
} from "@/lib/dashboard/control-tower-time-ranges";

const anchor = new Date("2026-06-15T12:00:00.000Z");
const range = getControlTowerLast30DaysRange(anchor);
const prevRange = getControlTowerPrevious30DaysRange(anchor);

const baseSnapshot: InputSnapshot = {
  closed: 40,
  closedPrev: 35,
  opened: 30,
  openedPrev: 28,
  backlog: 25,
  backlogAvgAgeDays: 8,
  avgCloseDays: 6,
  avgCloseDaysPrev: 7,
  urgentFulfillmentDays: 4,
  urgentFulfillmentDaysPrev: 5,
  urgentSampleSize: 2,
  slaLatePct: 10,
  stockCritical: 2,
  stockCriticalMaxDays: 5,
  magMovements: 80,
  magMovementsPrev: 70,
  magEntrate: 40,
  magEntratePrev: 35,
  magConsumi: 30,
  magConsumiPrev: 28,
  hoursWorked: 600,
  hoursWorkedPrev: 580,
  overtimePct: 8,
  overtimePctPrev: 9,
  absenceHours: 20,
  absenceHoursPrev: 18,
  dipendentiAttivi: 6,
  timesheetCoveragePct: 85,
  preventiviEmessi: 8,
  preventiviEmessiPrev: 6,
  fatturato: 120000,
  fatturatoPrev: 100000,
  incassato: 90000,
  incassatoPrev: 85000,
  inactiveLavorazioniCount: 1,
  inactiveWeightedExcessDays: 2,
  lateIngressCount: 2,
  openCount: 25,
  mezziCount: 15,
  dataQualityFlags: [],
  lateIngressLavorazioneIds: [],
  inactiveLavorazioneIds: [],
  stockCriticalRicambioIds: [],
};

resetHealthScoreRegistry();
ensureHealthScoreRegistry();

const r1 = computeHealthScoreFromSnapshot({
  snapshot: baseSnapshot,
  config: HEALTH_SCORE_V2_DEFAULTS,
  anchor,
  range,
  prevRange,
  computedAt: anchor.toISOString(),
});

const r2 = computeHealthScoreFromSnapshot({
  snapshot: baseSnapshot,
  config: HEALTH_SCORE_V2_DEFAULTS,
  anchor,
  range,
  prevRange,
  computedAt: anchor.toISOString(),
});

assert.equal(r1.score, r2.score, "deterministic score");
assert.equal(r1.scoreRaw, r2.scoreRaw, "deterministic raw score");
assert.equal(r1.breakdown.sections.length, r2.breakdown.sections.length);

for (let i = 0; i < 20; i++) {
  const ri = computeHealthScoreFromSnapshot({
    snapshot: baseSnapshot,
    config: HEALTH_SCORE_V2_DEFAULTS,
    anchor,
    range,
    prevRange,
    computedAt: anchor.toISOString(),
  });
  assert.equal(ri.score, r1.score, `property run ${i}`);
}

console.log("health-score-determinism.test.ts OK", { score: r1.score });
