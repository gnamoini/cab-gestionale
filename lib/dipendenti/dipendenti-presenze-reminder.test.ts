import assert from "node:assert/strict";
import {
  buildDipendentiPresenzeReminderPayload,
  countDipendentiSenzaPresenzeOggi,
  entryHasPresenzaRecorded,
  formatDipendentiPresenzeReminderTitle,
  hasAnyPresenzeRecorded,
  isAtOrAfterReminderTime,
  isWeekendLocal,
  shouldRunDipendentiPresenzeReminderCheck,
} from "@/lib/dipendenti/dipendenti-presenze-reminder";
import type {
  DipendenteTimesheetEmployeeRow,
  DipendenteTimesheetEntryRow,
} from "@/lib/dipendenti/types";

function entry(partial: Partial<DipendenteTimesheetEntryRow>): DipendenteTimesheetEntryRow {
  return {
    id: "e1",
    dipendente_id: "d1",
    work_date: "2026-06-02",
    ore_ordinarie: 0,
    ore_straordinarie: 0,
    ore_assenza: 0,
    assenza: false,
    motivo_assenza: null,
    tipo_assenza_id: null,
    tipo_assenza_label: null,
    note: null,
    employee_display_name_snapshot: "",
    employee_source_addetto_id_snapshot: null,
    updated_by: null,
    created_at: "",
    updated_at: "",
    ...partial,
  };
}

function employee(partial: Partial<DipendenteTimesheetEmployeeRow>): DipendenteTimesheetEmployeeRow {
  return {
    id: "d1",
    display_name: "Mario",
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

assert.equal(isWeekendLocal(new Date(2026, 5, 6)), true);
assert.equal(isWeekendLocal(new Date(2026, 5, 8)), false);

assert.equal(isAtOrAfterReminderTime(new Date(2026, 5, 8, 16, 59)), false);
assert.equal(isAtOrAfterReminderTime(new Date(2026, 5, 8, 17, 0)), true);
assert.equal(isAtOrAfterReminderTime(new Date(2026, 5, 8, 18, 0)), true);

assert.equal(shouldRunDipendentiPresenzeReminderCheck(new Date(2026, 5, 7, 17, 0)), false);
assert.equal(shouldRunDipendentiPresenzeReminderCheck(new Date(2026, 5, 8, 17, 0)), true);

assert.equal(hasAnyPresenzeRecorded([]), false);
assert.equal(hasAnyPresenzeRecorded([entry({ ore_ordinarie: 8 })]), true);
assert.equal(entryHasPresenzaRecorded(entry({ ore_assenza: 4, tipo_assenza_id: "ferie" })), true);

const employees = [
  employee({ id: "d1", in_settings: true }),
  employee({ id: "d2", display_name: "Luigi", in_settings: true }),
  employee({ id: "d3", display_name: "Storico", in_settings: false }),
];

assert.equal(
  countDipendentiSenzaPresenzeOggi(employees, [], "2026-06-02"),
  2,
  "solo attivi in settings",
);

assert.equal(
  countDipendentiSenzaPresenzeOggi(
    employees,
    [entry({ dipendente_id: "d1", work_date: "2026-06-02", ore_ordinarie: 8 })],
    "2026-06-02",
  ),
  1,
);

const payload = buildDipendentiPresenzeReminderPayload(employees, [], "2026-06-02");
assert.ok(payload);
assert.equal(payload.count, 2);

assert.equal(formatDipendentiPresenzeReminderTitle(1), "1 dipendente senza presenze");
assert.equal(formatDipendentiPresenzeReminderTitle(3), "3 dipendenti senza presenze");

console.log("dipendenti-presenze-reminder.test.ts OK");
