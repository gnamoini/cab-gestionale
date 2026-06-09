import assert from "node:assert/strict";
import {
  buildTimesheetYearSelectOptions,
  monthKeysFromEntryWorkDates,
  yearsFromMonthKeys,
} from "@/lib/dipendenti/timesheet-available-periods";

assert.deepEqual(
  monthKeysFromEntryWorkDates(["2026-06-09", "2026-06-15", "2025-12-01", "invalid"]),
  ["2026-06", "2025-12"],
);

assert.deepEqual(yearsFromMonthKeys(["2026-06", "2025-12", "2025-03"]), [2026, 2025]);

assert.deepEqual(
  buildTimesheetYearSelectOptions(["2026-06"], 2024).map((o) => o.value),
  [2026, 2024],
);

assert.deepEqual(
  buildTimesheetYearSelectOptions([], 2026).map((o) => o.value),
  [2026],
);

console.log("timesheet-available-periods.test.ts OK");
