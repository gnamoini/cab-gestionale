import assert from "node:assert/strict";
import { resetHealthScoreRegistry, ensureHealthScoreRegistry } from "@/lib/health-score/bootstrap";
import { HEALTH_SCORE_V2_DEFAULTS } from "@/lib/health-score/config/defaults";
import { adaptHealthScoreToOperational } from "@/lib/health-score/explain/adapt-to-operational-health-score";
import { computeHealthScoreFromSnapshot } from "@/lib/health-score/engine/pipeline";
import type { InputSnapshot, ModuleAccessMap } from "@/lib/health-score/types";
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

const adminAccess: ModuleAccessMap = {
  lavorazioni: { canRead: true, canWrite: false },
  magazzino: { canRead: true, canWrite: false },
  dipendenti: { canRead: true, canWrite: false },
  preventivi: { canRead: true, canWrite: false },
  fatturazione: { canRead: true, canWrite: false },
};

const operatoreAccess: ModuleAccessMap = {
  lavorazioni: { canRead: true, canWrite: false },
  magazzino: { canRead: true, canWrite: false },
  dipendenti: { canRead: false, canWrite: false },
  preventivi: { canRead: false, canWrite: false },
  fatturazione: { canRead: false, canWrite: false },
};

resetHealthScoreRegistry();
ensureHealthScoreRegistry();

const engineResult = computeHealthScoreFromSnapshot({
  snapshot,
  config: HEALTH_SCORE_V2_DEFAULTS,
  anchor,
  range,
  prevRange,
  computedAt: anchor.toISOString(),
});

const adminView = adaptHealthScoreToOperational(engineResult, adminAccess);
const operatoreView = adaptHealthScoreToOperational(engineResult, operatoreAccess);

assert.equal(adminView.score, operatoreView.score, "score globale identico");
assert.equal(adminView.label, operatoreView.label, "label identica");
assert.equal(adminView.tone, operatoreView.tone, "tone identico");
assert.equal(adminView.metricCount, operatoreView.metricCount, "metricCount globale");

assert.ok(adminView.calculation && operatoreView.calculation, "calculation presente");
assert.equal(
  adminView.calculation!.baseScore,
  operatoreView.calculation!.baseScore,
  "baseScore identico",
);
assert.equal(
  adminView.calculation!.smoothedScore,
  operatoreView.calculation!.smoothedScore,
  "smoothedScore identico",
);
assert.deepEqual(
  adminView.calculation!.sections,
  operatoreView.calculation!.sections,
  "sezioni identiche",
);

assert.ok(
  adminView.factors.length > operatoreView.factors.length,
  "admin vede più fattori dell'operatore",
);
assert.ok(
  operatoreView.factors.some((f) => f.detail?.includes("permessi")),
  "operatore vede nota redazione sui fattori",
);

console.log("health-score-viewer-parity.test.ts OK", {
  score: adminView.score,
  adminFactors: adminView.factors.length,
  operatoreFactors: operatoreView.factors.length,
});
