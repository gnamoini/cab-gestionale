import assert from "node:assert/strict";
import {
  employeeDisplayNameForPdf,
  employeeHasMonthActivity,
  selectTimesheetEmployeesForPdfExport,
} from "@/lib/dipendenti/dipendenti-employee-display";
import type { DipendenteTimesheetEmployeeRow, DipendenteTimesheetEntryRow } from "@/lib/dipendenti/types";

function emp(
  partial: Partial<DipendenteTimesheetEmployeeRow> & Pick<DipendenteTimesheetEmployeeRow, "id" | "display_name">,
): DipendenteTimesheetEmployeeRow {
  return {
    source_addetto_name: null,
    source_addetto_id: null,
    in_settings: true,
    employee_type: "ADDETTO",
    attivo: true,
    created_at: "",
    updated_at: "",
    ...partial,
  };
}

function entry(partial: Partial<DipendenteTimesheetEntryRow> & Pick<DipendenteTimesheetEntryRow, "dipendente_id">): DipendenteTimesheetEntryRow {
  return {
    id: "e1",
    work_date: "2026-06-02",
    ore_ordinarie: 8,
    ore_straordinarie: 0,
    assenza: false,
    motivo_assenza: null,
    ore_assenza: 0,
    note: null,
    tipo_assenza_id: null,
    tipo_assenza_label: null,
    employee_display_name_snapshot: "Luca Bianchi",
    employee_source_addetto_id_snapshot: null,
    updated_by: null,
    created_at: "",
    updated_at: "",
    ...partial,
  };
}

const currentAddetti = new Set(["add-1"]);

{
  const active = emp({ id: "a1", display_name: "Mario Rossi", source_addetto_id: "add-1" });
  const storico = emp({ id: "s1", display_name: "Luca Bianchi", source_addetto_id: "removed", in_settings: false });
  const entries = [entry({ dipendente_id: "a1" }), entry({ dipendente_id: "s1" })];
  const pdfRows = selectTimesheetEmployeesForPdfExport([active, storico], entries, currentAddetti);
  assert.equal(pdfRows.length, 2);
  assert.ok(pdfRows.some((e) => e.id === "a1"));
  assert.ok(pdfRows.some((e) => e.id === "s1"), "storico con ore nel mese incluso nel PDF");
}

{
  const activeEmpty = emp({ id: "a2", display_name: "Vuoto", source_addetto_id: "add-1" });
  const pdfRows = selectTimesheetEmployeesForPdfExport([activeEmpty], [], currentAddetti);
  assert.equal(pdfRows.length, 1, "attivo in roster incluso anche senza ore");
  assert.equal(pdfRows[0]?.id, "a2");
}

{
  const storicoNoActivity = emp({
    id: "s2",
    display_name: "Storico Vuoto",
    source_addetto_id: "removed-2",
    in_settings: false,
  });
  const pdfRows = selectTimesheetEmployeesForPdfExport([storicoNoActivity], [], currentAddetti);
  assert.equal(pdfRows.length, 0, "storico senza ore e non in roster escluso");
}

{
  const active = emp({ id: "a1", display_name: "Legacy Name", source_addetto_id: "add-1" });
  const name = employeeDisplayNameForPdf(active, [{ id: "add-1", nome: "Gaetano", cognome: "Pedone" }]);
  assert.equal(name, "Gaetano Pedone");
}

assert.equal(employeeHasMonthActivity("x", [entry({ dipendente_id: "x", ore_ordinarie: 0, ore_assenza: 0 })]), false);
assert.equal(employeeHasMonthActivity("x", [entry({ dipendente_id: "x", ore_assenza: 4 })]), true);

console.log("dipendenti-pdf-export-filter.test.ts OK");
