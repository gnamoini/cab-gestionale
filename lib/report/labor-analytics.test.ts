import assert from "node:assert/strict";
import { endOfLocalDay, startOfLocalDay } from "@/lib/report/date-ranges";
import {
  computeGapSchedeTimesheetPct,
  computeLaborComposition,
  computeTeamSaturation,
  forecastOreNextMonth,
} from "@/lib/report/labor-analytics";
import type { DipendenteTimesheetEntryRow } from "@/lib/dipendenti/types";

const range = {
  start: startOfLocalDay(new Date("2026-03-01T00:00:00.000Z")),
  end: endOfLocalDay(new Date("2026-03-31T23:59:59.999Z")),
};

function entry(partial: Partial<DipendenteTimesheetEntryRow>): DipendenteTimesheetEntryRow {
  return {
    id: partial.id ?? "e1",
    dipendente_id: partial.dipendente_id ?? "d1",
    work_date: partial.work_date ?? "2026-03-10",
    ore_ordinarie: partial.ore_ordinarie ?? 8,
    ore_straordinarie: partial.ore_straordinarie ?? 0,
    ore_assenza: partial.ore_assenza ?? 0,
    assenza: partial.assenza ?? false,
    motivo_assenza: partial.motivo_assenza ?? null,
    tipo_assenza_id: partial.tipo_assenza_id ?? null,
    tipo_assenza_label: partial.tipo_assenza_label ?? null,
    note: partial.note ?? null,
    employee_display_name_snapshot: partial.employee_display_name_snapshot ?? "",
    employee_source_addetto_id_snapshot: partial.employee_source_addetto_id_snapshot ?? null,
    updated_by: partial.updated_by ?? null,
    created_at: partial.created_at ?? "",
    updated_at: partial.updated_at ?? "",
  };
}

const comp = computeLaborComposition([
  entry({ ore_ordinarie: 8, ore_straordinarie: 2 }),
  entry({ id: "e2", ore_ordinarie: 6, ore_assenza: 2, tipo_assenza_label: "Malattia" }),
]);
assert.equal(comp.totaleLavorato, 16);
assert.equal(comp.oreAssenza, 2);
assert.equal(comp.overtimePct, 11.1);

assert.equal(computeGapSchedeTimesheetPct(100, 115), 15);
assert.equal(computeTeamSaturation(80, 2, range), 25);

assert.equal(forecastOreNextMonth([{ label: "01", value: 100 }, { label: "02", value: 120 }]), 110);

console.log("labor-analytics.test.ts OK");
