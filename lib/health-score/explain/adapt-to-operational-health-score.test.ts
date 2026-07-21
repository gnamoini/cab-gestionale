import assert from "node:assert/strict";
import { resetHealthScoreRegistry, ensureHealthScoreRegistry } from "@/lib/health-score/bootstrap";
import { HEALTH_SCORE_V2_DEFAULTS } from "@/lib/health-score/config/defaults";
import { adaptHealthScoreToOperational } from "@/lib/health-score/explain/adapt-to-operational-health-score";
import { computeHealthScoreFromSnapshot } from "@/lib/health-score/engine/pipeline";
import type { InputSnapshot } from "@/lib/health-score/types";
import {
  getControlTowerLast30DaysRange,
  getControlTowerPrevious30DaysRange,
} from "@/lib/dashboard/control-tower-time-ranges";

const anchor = new Date("2026-06-15T12:00:00.000Z");
const range = getControlTowerLast30DaysRange(anchor);
const prevRange = getControlTowerPrevious30DaysRange(anchor);

const snapshot: InputSnapshot = {
  closed: 44,
  closedPrev: 24,
  opened: 20,
  openedPrev: 18,
  backlog: 15,
  backlogAvgAgeDays: 24.2,
  avgCloseDays: 8,
  avgCloseDaysPrev: 9,
  urgentFulfillmentDays: 0,
  urgentFulfillmentDaysPrev: 0,
  urgentSampleSize: 0,
  slaLatePct: 26.7,
  stockCritical: 0,
  stockCriticalMaxDays: 0,
  magMovements: 40,
  magMovementsPrev: 38,
  magEntrate: 20,
  magEntratePrev: 18,
  magConsumi: 15,
  magConsumiPrev: 14,
  hoursWorked: 400,
  hoursWorkedPrev: 390,
  overtimePct: 4,
  overtimePctPrev: 5,
  absenceHours: 72,
  absenceHoursPrev: 60,
  dipendentiAttivi: 5,
  timesheetCoveragePct: 92,
  preventiviEmessi: 6,
  preventiviEmessiPrev: 5,
  fatturato: 120000,
  fatturatoPrev: 110000,
  incassato: 90000,
  incassatoPrev: 85000,
  inactiveLavorazioniCount: 0,
  inactiveWeightedExcessDays: 0,
  lateIngressCount: 4,
  openCount: 15,
  mezziCount: 10,
  dataQualityFlags: [],
  lateIngressLavorazioneIds: ["lav-late-1"],
  inactiveLavorazioneIds: [],
  stockCriticalRicambioIds: [],
};

resetHealthScoreRegistry();
ensureHealthScoreRegistry();

const result = computeHealthScoreFromSnapshot({
  snapshot,
  config: HEALTH_SCORE_V2_DEFAULTS,
  anchor,
  range,
  prevRange,
  computedAt: anchor.toISOString(),
});

const operational = adaptHealthScoreToOperational(result);
const labels = operational.factors.map((f) => f.label);

assert.ok(
  labels.some((l) => l.includes("Ritardo oltre 14 giorni dall'ingresso")),
  "late-ingress risk con titolo breve",
);
assert.ok(
  labels.some((l) => l.includes("Anzianità media lavori aperti")),
  "backlog-age distinto dalla quota in ritardo",
);
assert.ok(
  !labels.some((l) => l.includes("% dei lavori aperti supera")),
  "sla-late-pct nascosto se late-ingress è già in elenco",
);

assert.ok(operational.calculation, "riepilogo calcolo presente");
assert.ok(operational.calculation!.baseScore >= 0 && operational.calculation!.baseScore <= 100);
assert.ok(
  operational.calculation!.sections.every((s) => s.prevScore != null || s.deltaPoints == null),
  "sezione senza prev non ha delta",
);
assert.ok(
  operational.calculation!.sections.some((s) => s.prevScore != null),
  "almeno una sezione con confronto periodo precedente",
);
assert.ok(
  operational.calculation!.baseScorePrev != null,
  "media aree con confronto periodo precedente",
);
assert.ok(
  operational.calculation!.scoreRawPrev != null,
  "totale grezzo precedente disponibile",
);
assert.ok(operational.factors.some((f) => f.detail && f.detail.includes("valutazione")), "meta KPI con valutazione");
assert.ok(
  operational.factors.some((f) => f.impact < 0 && f.detail?.includes("penalità")),
  "meta penalità risk",
);
assert.ok(
  operational.factors.some((f) => f.href === "/lavorazioni?focusLav=lav-late-1"),
  "late-ingress link alla lavorazione più in ritardo",
);

console.log("adapt-to-operational-health-score.test.ts OK");
