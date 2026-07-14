import assert from "node:assert/strict";
import { computeAssenzaRateContext } from "@/lib/dashboard/operational-health-context";
import {
  computeInactiveLavorazioniCriticality,
  isStagnationSensitiveStato,
} from "@/lib/dashboard/operational-health-criticality";
import { computeOperationalHealthScore } from "@/lib/dashboard/operational-health-score";
import type { DipendenteTimesheetEntryRow } from "@/src/types/supabase-tables";
import type { LavorazioneListRow } from "@/lib/lavorazioni/types";

const range = { start: new Date("2026-07-01"), end: new Date("2026-07-13T23:59:59") };
const prevRange = { start: new Date("2026-06-01"), end: new Date("2026-06-30T23:59:59") };

assert.equal(isStagnationSensitiveStato("accettazione"), true);
assert.equal(isStagnationSensitiveStato("in_lavorazione"), false);

function lav(partial: Partial<LavorazioneListRow> & Pick<LavorazioneListRow, "id" | "stato">): LavorazioneListRow {
  return {
    id: partial.id,
    stato: partial.stato,
    created_at: partial.created_at ?? "2026-07-01T10:00:00.000Z",
    updated_at: partial.updated_at ?? partial.created_at ?? "2026-07-01T10:00:00.000Z",
    deleted_at: null,
    cliente: "C",
    macchina: "M",
    priorita: "media",
  } as LavorazioneListRow;
}

const inactive = computeInactiveLavorazioniCriticality(
  [
    lav({ id: "a", stato: "attesa_ricambi", updated_at: "2026-06-01T10:00:00.000Z" }),
    lav({ id: "b", stato: "attesa_ricambi", updated_at: "2026-07-12T10:00:00.000Z" }),
    lav({ id: "c", stato: "in_lavorazione", updated_at: "2026-05-01T10:00:00.000Z" }),
  ],
  new Date("2026-07-13T12:00:00.000Z"),
  [{ id: "attesa_ricambi", label: "Attesa ricambi" }, { id: "in_lavorazione", label: "In lavorazione" }],
);

assert.equal(inactive.count, 1, "only attesa_ricambi beyond median, not in_lavorazione");
assert.ok(inactive.statoLabels.includes("Attesa ricambi"));

function ts(
  partial: Pick<DipendenteTimesheetEntryRow, "dipendente_id" | "work_date" | "ore_assenza"> &
    Partial<DipendenteTimesheetEntryRow>,
): DipendenteTimesheetEntryRow {
  return {
    id: partial.id ?? `t-${partial.dipendente_id}-${partial.work_date}`,
    dipendente_id: partial.dipendente_id,
    work_date: partial.work_date,
    ore_ordinarie: partial.ore_ordinarie ?? 8,
    ore_straordinarie: partial.ore_straordinarie ?? 0,
    ore_assenza: partial.ore_assenza,
    assenza: partial.ore_assenza > 0,
    motivo_assenza: null,
    note: null,
    tipo_assenza_id: null,
    tipo_assenza_label: null,
    employee_display_name_snapshot: "X",
    employee_source_addetto_id_snapshot: null,
    updated_by: null,
    created_at: partial.work_date,
    updated_at: partial.work_date,
  };
}

const assenzaCtx = computeAssenzaRateContext(
  [
    ts({ dipendente_id: "d1", work_date: "2026-07-02", ore_assenza: 8 }),
    ts({ dipendente_id: "d2", work_date: "2026-07-03", ore_assenza: 0 }),
    ts({ dipendente_id: "d3", work_date: "2026-07-04", ore_assenza: 0 }),
    ts({ dipendente_id: "d4", work_date: "2026-07-05", ore_assenza: 0 }),
    ts({ dipendente_id: "d5", work_date: "2026-07-06", ore_assenza: 0 }),
    ts({ dipendente_id: "d1", work_date: "2026-06-02", ore_assenza: 8 }),
  ],
  range,
  prevRange,
);

assert.equal(assenzaCtx.dipendentiAttivi, 5);
assert.ok(Math.abs(assenzaCtx.ratePerDipendente - 1.6) < 0.01);
assert.ok((assenzaCtx.deltaPct ?? 0) < 10, "more staff should not spike assenza rate");

const alertScore = computeOperationalHealthScore({
  headerKpi: { windowLabel: "t", range, clusters: [] },
  alerts: {
    items: [
      { id: "lav-late", severity: "warning", title: "2 lavorazioni in ritardo", detail: "Oltre 14 giorni dall'ingresso." },
      { id: "lav-unassigned", severity: "warning", title: "1 lavorazione senza addetto", detail: "Assegna un tecnico." },
    ],
  },
  criticality: { inactiveLavorazioni: inactive },
});

assert.ok(
  alertScore.factors.some((f) => f.label.includes("lavorazioni in ritardo")),
  "warnings are listed explicitly",
);
assert.ok(
  !alertScore.factors.some((f) => f.label.includes("avvisi operativi")),
  "no generic warning bucket",
);

console.log("operational-health-context.test.ts OK");
