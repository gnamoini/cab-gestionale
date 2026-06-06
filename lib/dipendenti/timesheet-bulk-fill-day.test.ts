import assert from "node:assert/strict";
import {
  buildEmptyDay8hUpsert,
  buildEmptyDay8hUpserts,
  countEmptyDay8hUpserts,
  TIMESHEET_DEFAULT_DAY_HOURS,
} from "@/lib/dipendenti/timesheet-bulk-fill-day";
import { emptyCellValue } from "@/lib/dipendenti/timesheet-totals";
import type { DipendenteTimesheetEmployeeRow, TimesheetCellValue } from "@/lib/dipendenti/types";

function employee(id: string): DipendenteTimesheetEmployeeRow {
  return {
    id,
    display_name: id,
    source_addetto_name: null,
    source_addetto_id: null,
    in_settings: true,
    created_at: "",
    updated_at: "",
  };
}

const workDate = "2026-06-05";

{
  const upsert = buildEmptyDay8hUpsert("e1", workDate);
  assert.equal(upsert.oreOrdinarie, TIMESHEET_DEFAULT_DAY_HOURS);
  assert.equal(upsert.oreStraordinarie, 0);
  assert.equal(upsert.oreAssenza, 0);
  assert.equal(upsert.dipendenteId, "e1");
  assert.equal(upsert.workDate, workDate);
}

{
  const values = new Map<string, TimesheetCellValue>([
    ["e1", emptyCellValue()],
    ["e2", { ...emptyCellValue(), oreOrdinarie: 8 }],
    ["e3", emptyCellValue()],
  ]);
  const getCellValue = (id: string) => values.get(id) ?? emptyCellValue();
  const upserts = buildEmptyDay8hUpserts(
    [employee("e1"), employee("e2"), employee("e3")],
    workDate,
    getCellValue,
  );
  assert.equal(upserts.length, 2);
  assert.deepEqual(
    upserts.map((u) => u.dipendenteId).sort(),
    ["e1", "e3"],
  );
  assert.equal(
    countEmptyDay8hUpserts(
      [employee("e1"), employee("e2"), employee("e3")],
      workDate,
      getCellValue,
    ),
    2,
  );
}

{
  function getCellValueFilled(id: string): TimesheetCellValue {
    return { ...emptyCellValue(), oreOrdinarie: id === "e1" ? 4 : 8 };
  }
  assert.equal(
    buildEmptyDay8hUpserts([employee("e1"), employee("e2")], workDate, getCellValueFilled).length,
    0,
  );
}

{
  assert.equal(buildEmptyDay8hUpserts([], workDate, () => emptyCellValue()).length, 0);
}

console.log("timesheet-bulk-fill-day.test.ts OK");
