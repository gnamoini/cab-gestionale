import assert from "node:assert/strict";
import { resolveSchedeLavorazioneIds } from "@/lib/report/schede-report-scope";
import { isoInRange, type DateRange } from "@/lib/report/date-ranges";
import type { LavorazioneArchiviata } from "@/lib/lavorazioni/types";

const range: DateRange = {
  start: new Date("2026-06-01T00:00:00"),
  end: new Date("2026-06-30T23:59:59.999"),
};

const completate: LavorazioneArchiviata[] = [
  { id: "a", dataCompletamento: "2026-06-15", mezzoId: "m1" } as LavorazioneArchiviata,
  { id: "b", dataCompletamento: "2026-05-01", mezzoId: "m2" } as LavorazioneArchiviata,
  { id: "c", dataCompletamento: "2026-06-20", mezzoId: "m3" } as LavorazioneArchiviata,
];

const lavListRows = [
  { id: "a", actual_labor_hours: 4 },
  { id: "b", actual_labor_hours: 8 },
  { id: "c", actual_labor_hours: 0 },
];

const laborIds = resolveSchedeLavorazioneIds(
  { completate, lavListRows, range },
  { needsLaborCost: "completed_in_period" },
);
assert.deepEqual(laborIds.sort(), ["a", "c"]);

const hourIds = resolveSchedeLavorazioneIds(
  { completate, lavListRows, range },
  { needsActualHours: "hours_in_period" },
);
assert.deepEqual(hourIds, ["a"]);

const union = resolveSchedeLavorazioneIds(
  { completate, lavListRows, range },
  { needsLaborCost: "completed_in_period", needsActualHours: "hours_in_period" },
);
assert.deepEqual(union.sort(), ["a", "c"]);

assert.ok(
  completate.filter((c) => c.dataCompletamento && isoInRange(c.dataCompletamento, range)).length === 2,
);

console.log("schede-report-scope.test.ts OK");
