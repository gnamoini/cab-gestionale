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

/** Valori allineati ai target default officina media — nessuna penalità rischio. */
const allTargetsSnapshot: InputSnapshot = {
  closed: 20,
  closedPrev: 20,
  opened: 10,
  openedPrev: 10,
  backlog: 30,
  backlogAvgAgeDays: 14,
  avgCloseDays: 7,
  avgCloseDaysPrev: 7,
  urgentFulfillmentDays: 3,
  urgentFulfillmentDaysPrev: 3,
  urgentSampleSize: 2,
  slaLatePct: 15,
  stockCritical: 0,
  stockCriticalMaxDays: 0,
  magMovements: 50,
  magMovementsPrev: 50,
  magEntrate: 25,
  magEntratePrev: 25,
  magConsumi: 25,
  magConsumiPrev: 25,
  hoursWorked: 400,
  hoursWorkedPrev: 400,
  overtimePct: 10,
  overtimePctPrev: 10,
  absenceHours: 8,
  absenceHoursPrev: 8,
  dipendentiAttivi: 6,
  timesheetCoveragePct: 95,
  preventiviEmessi: 5,
  preventiviEmessiPrev: 5,
  fatturato: 50_000,
  fatturatoPrev: 50_000,
  incassato: 40_000,
  incassatoPrev: 40_000,
  inactiveLavorazioniCount: 0,
  inactiveWeightedExcessDays: 0,
  lateIngressCount: 0,
  openCount: 30,
  mezziCount: 15,
  dataQualityFlags: [],
  lateIngressLavorazioneIds: [],
  inactiveLavorazioneIds: [],
  stockCriticalRicambioIds: [],
};

resetHealthScoreRegistry();
ensureHealthScoreRegistry();

const result = computeHealthScoreFromSnapshot({
  snapshot: allTargetsSnapshot,
  config: HEALTH_SCORE_V2_DEFAULTS,
  anchor,
  range,
  prevRange,
  computedAt: anchor.toISOString(),
});

assert.ok(result.scoreRaw >= 80, `expected >=80 when all targets met, got ${result.scoreRaw}`);
assert.ok(result.score >= 80, `expected smoothed >=80, got ${result.score}`);

console.log("health-score-target-achievement.test.ts OK", { scoreRaw: result.scoreRaw, score: result.score });
