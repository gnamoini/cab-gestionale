import assert from "node:assert/strict";
import { classifyWorkshopSize } from "@/lib/health-score/workshop-size/classify-workshop-size";
import { resolveTarget } from "@/lib/health-score/targets/target-provider";
import { HEALTH_SCORE_V2_DEFAULTS } from "@/lib/health-score/config/defaults";
import type { InputSnapshot } from "@/lib/health-score/types";

const microSnap: InputSnapshot = {
  closed: 5,
  closedPrev: 4,
  opened: 3,
  openedPrev: 2,
  backlog: 2,
  backlogAvgAgeDays: 5,
  avgCloseDays: 10,
  avgCloseDaysPrev: 11,
  urgentFulfillmentDays: 0,
  urgentFulfillmentDaysPrev: null,
  urgentSampleSize: 0,
  slaLatePct: 0,
  stockCritical: 0,
  stockCriticalMaxDays: 0,
  magMovements: 10,
  magMovementsPrev: 8,
  magEntrate: 5,
  magEntratePrev: 4,
  magConsumi: 3,
  magConsumiPrev: 2,
  hoursWorked: 80,
  hoursWorkedPrev: 70,
  overtimePct: 5,
  overtimePctPrev: 4,
  absenceHours: 2,
  absenceHoursPrev: 1,
  dipendentiAttivi: 2,
  timesheetCoveragePct: 90,
  preventiviEmessi: 1,
  preventiviEmessiPrev: 0,
  fatturato: 5000,
  fatturatoPrev: 4000,
  incassato: 3000,
  incassatoPrev: 2500,
  inactiveLavorazioniCount: 0,
  inactiveWeightedExcessDays: 0,
  lateIngressCount: 0,
  openCount: 2,
  mezziCount: 2,
  dataQualityFlags: [],
  lateIngressLavorazioneIds: [],
  inactiveLavorazioneIds: [],
  stockCriticalRicambioIds: [],
};

const size = classifyWorkshopSize(microSnap);
assert.equal(size, "micro");

const target = resolveTarget("close_time_days", { workshopSize: size, config: HEALTH_SCORE_V2_DEFAULTS });
assert.ok(target > HEALTH_SCORE_V2_DEFAULTS.targets.close_time_days!, "micro gets relaxed close-time target");

console.log("workshop-size-target.test.ts OK", { size, target });
