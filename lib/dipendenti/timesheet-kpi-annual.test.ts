import assert from "node:assert/strict";
import { computeAnnualMonthlyBreakdown } from "@/lib/dipendenti/timesheet-annual";
import { computePanoramaKpi } from "@/lib/dipendenti/timesheet-kpi";
import type { DipendenteTimesheetEmployeeRow, DipendenteTimesheetEntryRow } from "@/lib/dipendenti/types";

const emp = (id: string, name: string): DipendenteTimesheetEmployeeRow => ({
  id,
  display_name: name,
  source_addetto_name: name,
  source_addetto_id: id,
  in_settings: true,
  employee_type: "ADDETTO",
  attivo: true,
  created_at: "",
  updated_at: "",
});

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
  employee_display_name_snapshot: "Test",
  employee_source_addetto_id_snapshot: null,
  updated_by: null,
  created_at: "",
  updated_at: "",
  ...partial,
});

{
  const kpi = computePanoramaKpi(
    [emp("d1", "Mario"), emp("d2", "Luigi")],
    [
      entry({ dipendente_id: "d1", ore_ordinarie: 8, ore_straordinarie: 2 }),
      entry({ id: "2", work_date: "2026-05-02", dipendente_id: "d2", ore_ordinarie: 4 }),
    ],
  );
  assert.equal(kpi.dipendentiAttivi, 2);
  assert.equal(kpi.totaleLavorato, 14);
  assert.equal(kpi.mediaOrePerDipendente, 7);
  assert.equal(kpi.topOreDipendente?.displayName, "Mario");
}

{
  const months = computeAnnualMonthlyBreakdown(
    [entry({ work_date: "2026-03-10", ore_ordinarie: 8 }), entry({ work_date: "2026-05-01", ore_ordinarie: 4 })],
    "d1",
    2026,
  );
  assert.equal(months.length, 12);
  assert.equal(months[2]?.oreOrdinarie, 8);
  assert.equal(months[4]?.oreOrdinarie, 4);
}

console.log("timesheet-kpi-annual.test.ts OK");
