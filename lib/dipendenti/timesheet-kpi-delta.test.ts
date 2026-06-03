/**
 * Timesheet KPI delta — unit tests.
 */
import assert from "node:assert/strict";
import { computePanoramaKpiWithDelta } from "@/lib/dipendenti/timesheet-kpi";
import type { DipendenteTimesheetEmployeeRow, DipendenteTimesheetEntryRow } from "@/lib/dipendenti/types";

const emp: DipendenteTimesheetEmployeeRow = {
  id: "e1",
  display_name: "Mario Rossi",
  source_addetto_name: "Mario",
  source_addetto_id: "a1",
  in_settings: true,
  created_at: "",
  updated_at: "",
};

const currentEntries: DipendenteTimesheetEntryRow[] = [
  {
    id: "1",
    dipendente_id: "e1",
    work_date: "2026-05-10",
    ore_ordinarie: 8,
    ore_straordinarie: 2,
    ore_assenza: 0,
    assenza: false,
    motivo_assenza: null,
    note: null,
    tipo_assenza_id: null,
    tipo_assenza_label: null,
    employee_display_name_snapshot: "Mario Rossi",
    employee_source_addetto_id_snapshot: "a1",
    created_at: "",
    updated_at: "",
    updated_by: null,
  },
];

const prevEntries: DipendenteTimesheetEntryRow[] = [
  {
    ...currentEntries[0]!,
    id: "2",
    work_date: "2026-04-10",
    ore_ordinarie: 8,
    ore_straordinarie: 0,
  },
];

const kpi = computePanoramaKpiWithDelta([emp], currentEntries, prevEntries);
assert.equal(kpi.totaleLavorato, 10);
assert.equal(kpi.prevMonth.totaleLavorato, 8);
assert.equal(kpi.delta.overtimeDelta, 2);

console.log("timesheet-kpi-delta.test.ts OK");
