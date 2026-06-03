import assert from "node:assert/strict";
import { computeDipendenteSchedaStats } from "@/lib/dipendenti/timesheet-scheda-stats";
import type { DipendenteTimesheetEntryRow } from "@/lib/dipendenti/types";

const entry = (partial: Partial<DipendenteTimesheetEntryRow>): DipendenteTimesheetEntryRow => ({
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
  employee_display_name_snapshot: "Mario Rossi",
  employee_source_addetto_id_snapshot: "a1",
  updated_by: null,
  created_at: "",
  updated_at: "",
  ...partial,
});

{
  const stats = computeDipendenteSchedaStats([
    entry({ ore_ordinarie: 8 }),
    entry({ id: "2", work_date: "2026-05-02", ore_ordinarie: 8, ore_straordinarie: 2 }),
    entry({
      id: "3",
      work_date: "2026-05-03",
      ore_assenza: 8,
      tipo_assenza_label: "Ferie",
    }),
  ]);
  assert.equal(stats.giorniLavorati, 2);
  assert.equal(stats.giorniAssenza, 1);
  assert.equal(stats.mediaOreGiorno, 9);
  assert.equal(stats.motiviAssenza.length, 1);
  assert.equal(stats.motiviAssenza[0]?.label, "Ferie");
}

console.log("timesheet-scheda-stats.test.ts OK");
