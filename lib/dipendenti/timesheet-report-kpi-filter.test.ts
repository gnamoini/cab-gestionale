import assert from "node:assert/strict";
import { computeMonthTotals } from "@/lib/dipendenti/timesheet-totals";
import {
  filterEntriesForReportTimesheetKpi,
  isFestivitaAbsenceLabel,
  isWeekendWorkDate,
  shouldExcludeAbsenceFromReportKpi,
} from "@/lib/dipendenti/timesheet-report-kpi-filter";
import type { DipendenteTimesheetEntryRow } from "@/lib/dipendenti/types";

function entry(partial: Partial<DipendenteTimesheetEntryRow>): DipendenteTimesheetEntryRow {
  return {
    id: "1",
    dipendente_id: "d1",
    work_date: "2026-06-02",
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

assert.equal(isWeekendWorkDate("2026-06-06"), true);
assert.equal(isWeekendWorkDate("2026-06-07"), true);
assert.equal(isWeekendWorkDate("2026-06-08"), false);

assert.equal(isFestivitaAbsenceLabel("Festività"), true);
assert.equal(isFestivitaAbsenceLabel("Festivita"), true);
assert.equal(isFestivitaAbsenceLabel("FESTIVITÀ NAZIONALE"), true);
assert.equal(isFestivitaAbsenceLabel("Ferie"), false);

assert.equal(
  shouldExcludeAbsenceFromReportKpi(
    entry({ work_date: "2026-06-06", ore_assenza: 8, tipo_assenza_label: "Festività" }),
  ),
  true,
);

assert.equal(
  shouldExcludeAbsenceFromReportKpi(
    entry({ work_date: "2026-06-08", ore_assenza: 8, tipo_assenza_label: "Festività" }),
  ),
  true,
);

assert.equal(
  shouldExcludeAbsenceFromReportKpi(
    entry({ work_date: "2026-06-08", ore_assenza: 8, tipo_assenza_label: "Ferie" }),
  ),
  false,
);

{
  const filtered = filterEntriesForReportTimesheetKpi([
    entry({ work_date: "2026-06-06", ore_assenza: 8, tipo_assenza_label: "Festività" }),
  ]);
  const totals = computeMonthTotals(filtered);
  assert.equal(totals.oreAssenza, 0);
  assert.equal(totals.giorniAssenza, 0);
}

{
  const filtered = filterEntriesForReportTimesheetKpi([
    entry({ work_date: "2026-06-08", ore_assenza: 8, tipo_assenza_label: "Festività" }),
  ]);
  const totals = computeMonthTotals(filtered);
  assert.equal(totals.oreAssenza, 0);
  assert.equal(totals.giorniAssenza, 0);
}

{
  const filtered = filterEntriesForReportTimesheetKpi([
    entry({ work_date: "2026-06-08", ore_assenza: 8, tipo_assenza_label: "Ferie" }),
  ]);
  const totals = computeMonthTotals(filtered);
  assert.equal(totals.oreAssenza, 8);
  assert.equal(totals.giorniAssenza, 1);
}

{
  const filtered = filterEntriesForReportTimesheetKpi([
    entry({
      work_date: "2026-06-06",
      ore_ordinarie: 4,
      ore_assenza: 8,
      tipo_assenza_label: "Festività",
    }),
  ]);
  const totals = computeMonthTotals(filtered);
  assert.equal(totals.oreOrdinarie, 4);
  assert.equal(totals.oreAssenza, 0);
  assert.equal(totals.totaleLavorato, 4);
}

console.log("timesheet-report-kpi-filter.test.ts OK");
