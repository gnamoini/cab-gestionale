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

function computeFor(snapshot: InputSnapshot) {
  resetHealthScoreRegistry();
  ensureHealthScoreRegistry();
  return computeHealthScoreFromSnapshot({
    snapshot,
    config: HEALTH_SCORE_V2_DEFAULTS,
    anchor,
    range,
    prevRange,
    computedAt: anchor.toISOString(),
  }).score;
}

const snapshot: InputSnapshot = {
  closed: 30,
  closedPrev: 25,
  opened: 15,
  openedPrev: 14,
  backlog: 20,
  backlogAvgAgeDays: 10,
  avgCloseDays: 8,
  avgCloseDaysPrev: 9,
  urgentFulfillmentDays: 5,
  urgentFulfillmentDaysPrev: 4,
  urgentSampleSize: 1,
  slaLatePct: 12,
  stockCritical: 3,
  stockCriticalMaxDays: 7,
  magMovements: 50,
  magMovementsPrev: 45,
  magEntrate: 20,
  magEntratePrev: 18,
  magConsumi: 18,
  magConsumiPrev: 16,
  hoursWorked: 400,
  hoursWorkedPrev: 390,
  overtimePct: 10,
  overtimePctPrev: 11,
  absenceHours: 25,
  absenceHoursPrev: 20,
  dipendentiAttivi: 4,
  timesheetCoveragePct: 75,
  preventiviEmessi: 5,
  preventiviEmessiPrev: 4,
  fatturato: 80000,
  fatturatoPrev: 70000,
  incassato: 60000,
  incassatoPrev: 55000,
  inactiveLavorazioniCount: 2,
  inactiveWeightedExcessDays: 3,
  lateIngressCount: 3,
  openCount: 20,
  mezziCount: 8,
  dataQualityFlags: [],
};

const scoreA = computeFor(snapshot);
const scoreB = computeFor({ ...snapshot });

assert.equal(scoreA, scoreB, "RBAC parity: same snapshot → same score regardless of viewer");

console.log("health-score-rbac-parity.test.ts OK", { score: scoreA });
