import assert from "node:assert/strict";
import {
  buildAbsenceLegendLine,
  computeComplessivoRiepilogo,
  computeEmployeeSummaryRows,
} from "@/lib/dipendenti/pdf/dipendenti-pdf-stats";
import { registryLabel } from "@/lib/dipendenti/pdf/dipendenti-pdf-context";
import { defaultTipiAssenza } from "@/lib/dipendenti/tipi-assenza-model";
import type { DipendenteTimesheetEmployeeRow, DipendenteTimesheetEntryRow } from "@/lib/dipendenti/types";

const empA: DipendenteTimesheetEmployeeRow = {
  id: "e1",
  display_name: "Mario Rossi",
  source_addetto_name: null,
  source_addetto_id: null,
  in_settings: true,
  created_at: "",
  updated_at: "",
};

const empB: DipendenteTimesheetEmployeeRow = {
  id: "e2",
  display_name: "Luigi Verdi",
  source_addetto_name: null,
  source_addetto_id: null,
  in_settings: false,
  created_at: "",
  updated_at: "",
};

const entries: DipendenteTimesheetEntryRow[] = [
  {
    id: "x1",
    dipendente_id: "e1",
    work_date: "2026-06-02",
    ore_ordinarie: 8,
    ore_straordinarie: 0,
    assenza: false,
    motivo_assenza: null,
    ore_assenza: 0,
    note: null,
    tipo_assenza_id: null,
    tipo_assenza_label: null,
    employee_display_name_snapshot: "Mario Rossi",
    employee_source_addetto_id_snapshot: null,
    updated_by: null,
    created_at: "",
    updated_at: "",
  },
  {
    id: "x2",
    dipendente_id: "e2",
    work_date: "2026-06-03",
    ore_ordinarie: 0,
    ore_straordinarie: 0,
    assenza: false,
    motivo_assenza: null,
    ore_assenza: 8,
    note: null,
    tipo_assenza_id: "f",
    tipo_assenza_label: "Ferie",
    employee_display_name_snapshot: "Luigi Verdi",
    employee_source_addetto_id_snapshot: null,
    updated_by: null,
    created_at: "",
    updated_at: "",
  },
];

const riepilogo = computeComplessivoRiepilogo([empA, empB], entries);
assert.equal(riepilogo.dipendentiCount, 2);
assert.equal(riepilogo.attiviInAddetti, 1);
assert.equal(riepilogo.storici, 1);
assert.equal(riepilogo.globalTotals.totaleLavorato, 8);
assert.equal(riepilogo.globalTotals.oreAssenza, 8);

const rows = computeEmployeeSummaryRows(
  [empA, empB],
  entries,
  (e) => e.display_name,
  (e) => registryLabel(e.in_settings),
);
assert.equal(rows.length, 2);
assert.equal(rows[0]!.totals.totaleLavorato, 8);
assert.equal(rows[1]!.registry, "Storico — non in addetti");
assert.equal(rows[1]!.totals.oreAssenza, 8);

const legend = buildAbsenceLegendLine(defaultTipiAssenza());
assert.ok(legend.includes("8h ordinarie"));
assert.ok(legend.includes("F=Ferie"));

console.log("dipendenti-pdf-stats.test.ts OK");
