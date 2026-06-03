import assert from "node:assert/strict";
import { computeMonthTotals, normalizeCellValue } from "@/lib/dipendenti/timesheet-totals";
import type { DipendenteTimesheetEntryRow } from "@/lib/dipendenti/types";

function entry(partial: Partial<DipendenteTimesheetEntryRow>): DipendenteTimesheetEntryRow {
  return {
    id: "1",
    dipendente_id: "d1",
    work_date: "2026-05-01",
    ore_ordinarie: 0,
    ore_straordinarie: 0,
    assenza: false,
    motivo_assenza: null,
    ore_assenza: 0,
    note: null,
    tipo_assenza_id: null,
    tipo_assenza_label: null,
    employee_display_name_snapshot: "Test",
    employee_source_addetto_id_snapshot: null,
    updated_by: null,
    created_at: "",
    updated_at: "",
    ...partial,
  };
}

{
  const totals = computeMonthTotals([
    entry({ ore_ordinarie: 8, ore_straordinarie: 2 }),
    entry({ work_date: "2026-05-02", ore_assenza: 8, tipo_assenza_label: "Ferie" }),
  ]);
  assert.equal(totals.oreOrdinarie, 8);
  assert.equal(totals.oreStraordinarie, 2);
  assert.equal(totals.oreAssenza, 8);
  assert.equal(totals.totaleLavorato, 10);
  assert.equal(totals.giorniAssenza, 1);
}

{
  const v = normalizeCellValue({
    oreAssenza: 8,
    tipoAssenzaId: "t1",
    tipoAssenzaLabel: "Ferie",
    oreOrdinarie: 5,
  });
  assert.equal(v.oreOrdinarie, 5);
  assert.equal(v.oreAssenza, 8);
}

console.log("timesheet-totals.test.ts OK");
