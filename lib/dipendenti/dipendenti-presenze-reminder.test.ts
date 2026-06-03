import assert from "node:assert/strict";
import {
  hasAnyPresenzeRecorded,
  isAtOrAfterReminderTime,
  isWeekendLocal,
  shouldRunDipendentiPresenzeReminderCheck,
} from "@/lib/dipendenti/dipendenti-presenze-reminder";
import type { DipendenteTimesheetEntryRow } from "@/lib/dipendenti/types";

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

assert.equal(isWeekendLocal(new Date(2026, 5, 6)), true);
assert.equal(isWeekendLocal(new Date(2026, 5, 8)), false);

assert.equal(isAtOrAfterReminderTime(new Date(2026, 5, 8, 16, 59)), false);
assert.equal(isAtOrAfterReminderTime(new Date(2026, 5, 8, 17, 0)), true);
assert.equal(isAtOrAfterReminderTime(new Date(2026, 5, 8, 18, 0)), true);

assert.equal(shouldRunDipendentiPresenzeReminderCheck(new Date(2026, 5, 7, 17, 0)), false);
assert.equal(shouldRunDipendentiPresenzeReminderCheck(new Date(2026, 5, 8, 17, 0)), true);

assert.equal(hasAnyPresenzeRecorded([]), false);
assert.equal(hasAnyPresenzeRecorded([entry({ ore_ordinarie: 8 })]), true);
assert.equal(hasAnyPresenzeRecorded([entry({ note: "solo nota" })]), true);

console.log("dipendenti-presenze-reminder.test.ts OK");
