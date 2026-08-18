import assert from "node:assert/strict";
import {
  buildCopyDayToAllUpserts,
  buildEmptyDay8hUpsert,
  buildEmptyDay8hUpserts,
  buildEmptyDayFerieUpsert,
  buildEmptyDayFerieUpserts,
  countEmptyDay8hUpserts,
  resolveFerieTipoAssenza,
  TIMESHEET_DEFAULT_DAY_HOURS,
} from "@/lib/dipendenti/timesheet-bulk-fill-day";
import { defaultTipiAssenza } from "@/lib/dipendenti/tipi-assenza-model";
import { emptyCellValue } from "@/lib/dipendenti/timesheet-totals";
import type { DipendenteTimesheetEmployeeRow, TimesheetCellValue } from "@/lib/dipendenti/types";

function employee(id: string): DipendenteTimesheetEmployeeRow {
  return {
    id,
    display_name: id,
    source_addetto_name: null,
    source_addetto_id: null,
    in_settings: true,
    employee_type: "ADDETTO",
    attivo: true,
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

{
  const tipi = defaultTipiAssenza();
  const ferie = resolveFerieTipoAssenza(tipi)!;
  const upsert = buildEmptyDayFerieUpsert("e1", workDate, ferie);
  assert.equal(upsert.oreAssenza, TIMESHEET_DEFAULT_DAY_HOURS);
  assert.equal(upsert.oreOrdinarie, 0);
  assert.equal(upsert.tipoAssenzaId, ferie.id);
  assert.equal(upsert.tipoAssenzaLabel, "Ferie");
  const upserts = buildEmptyDayFerieUpserts(
    [employee("e1"), employee("e2")],
    workDate,
    (id) => (id === "e1" ? emptyCellValue() : { ...emptyCellValue(), oreOrdinarie: 8 }),
    ferie,
  );
  assert.equal(upserts.length, 1);
  assert.equal(upserts[0]?.dipendenteId, "e1");
}

{
  const sourceValue = {
    ...emptyCellValue(),
    oreOrdinarie: 7,
    oreStraordinarie: 1,
    note: "Turno",
  };
  const upserts = buildCopyDayToAllUpserts(
    [employee("e1"), employee("e2")],
    workDate,
    sourceValue,
    [],
  );
  assert.equal(upserts.length, 2);
  for (const upsert of upserts) {
    assert.equal(upsert.workDate, workDate);
    assert.equal(upsert.oreOrdinarie, 7);
    assert.equal(upsert.oreStraordinarie, 1);
    assert.equal(upsert.note, "Turno");
  }
  assert.deepEqual(upserts.map((u) => u.dipendenteId).sort(), ["e1", "e2"]);
}

console.log("timesheet-bulk-fill-day.test.ts OK");
