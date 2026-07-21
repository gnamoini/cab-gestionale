import assert from "node:assert/strict";
import { resetHealthScoreRegistry, ensureHealthScoreRegistry } from "@/lib/health-score/bootstrap";
import { HEALTH_SCORE_V2_DEFAULTS } from "@/lib/health-score/config/defaults";
import { computeHealthScoreFromSnapshot } from "@/lib/health-score/engine/pipeline";
import { filterBreakdownForViewer } from "@/lib/health-score/explain/filter-breakdown-for-viewer";
import type { InputSnapshot } from "@/lib/health-score/types";
import {
  getControlTowerLast30DaysRange,
  getControlTowerPrevious30DaysRange,
} from "@/lib/dashboard/control-tower-time-ranges";

const anchor = new Date("2026-06-15T12:00:00.000Z");
const range = getControlTowerLast30DaysRange(anchor);
const prevRange = getControlTowerPrevious30DaysRange(anchor);

const snapshot: InputSnapshot = {
  closed: 50,
  closedPrev: 40,
  opened: 20,
  openedPrev: 22,
  backlog: 18,
  backlogAvgAgeDays: 6,
  avgCloseDays: 5,
  avgCloseDaysPrev: 6,
  urgentFulfillmentDays: 4,
  urgentFulfillmentDaysPrev: 5,
  urgentSampleSize: 2,
  slaLatePct: 8,
  stockCritical: 1,
  stockCriticalMaxDays: 3,
  magMovements: 60,
  magMovementsPrev: 55,
  magEntrate: 30,
  magEntratePrev: 28,
  magConsumi: 25,
  magConsumiPrev: 24,
  hoursWorked: 500,
  hoursWorkedPrev: 480,
  overtimePct: 6,
  overtimePctPrev: 7,
  absenceHours: 15,
  absenceHoursPrev: 12,
  dipendentiAttivi: 5,
  timesheetCoveragePct: 90,
  preventiviEmessi: 10,
  preventiviEmessiPrev: 8,
  fatturato: 200000,
  fatturatoPrev: 180000,
  incassato: 150000,
  incassatoPrev: 140000,
  inactiveLavorazioniCount: 0,
  inactiveWeightedExcessDays: 0,
  lateIngressCount: 1,
  openCount: 18,
  mezziCount: 12,
  dataQualityFlags: [],
  lateIngressLavorazioneIds: [],
  inactiveLavorazioneIds: [],
  stockCriticalRicambioIds: [],
};

resetHealthScoreRegistry();
ensureHealthScoreRegistry();

const full = computeHealthScoreFromSnapshot({
  snapshot,
  config: HEALTH_SCORE_V2_DEFAULTS,
  anchor,
  range,
  prevRange,
  computedAt: anchor.toISOString(),
});

const adminBreakdown = filterBreakdownForViewer(full.breakdown, {
  lavorazioni: { canRead: true, canWrite: false },
  magazzino: { canRead: true, canWrite: false },
  dipendenti: { canRead: true, canWrite: false },
  preventivi: { canRead: true, canWrite: false },
  fatturazione: { canRead: true, canWrite: false },
});

const operatoreBreakdown = filterBreakdownForViewer(full.breakdown, {
  lavorazioni: { canRead: true, canWrite: false },
  magazzino: { canRead: true, canWrite: false },
  dipendenti: { canRead: false, canWrite: false },
  preventivi: { canRead: false, canWrite: false },
  fatturazione: { canRead: false, canWrite: false },
});

assert.equal(full.score, full.score, "score baseline");
assert.ok(
  operatoreBreakdown.sections.some((s) => s.id === "personale" && s.redacted),
  "personale redacted without dipendenti read",
);
assert.ok(
  operatoreBreakdown.sections.some((s) => s.id === "economico" && s.redacted),
  "economico redacted without admin modules",
);
assert.ok(operatoreBreakdown.redactedSummary?.includes("Altri fattori"), "redacted summary present");

console.log("health-score-breakdown-filter.test.ts OK");
