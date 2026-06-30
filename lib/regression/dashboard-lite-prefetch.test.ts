import assert from "node:assert/strict";
import {
  computeDashboardLavWidgetRows,
  pickDashboardPriorityLavorazioneIds,
} from "@/lib/view/dashboard-widgets-selectors";
import { mergeMezzoIntoLavorazioneRows } from "@/lib/lavorazioni/lavorazioni-list-fetch";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";

function lavRow(id: string, priorita: string, updatedAt: string): LavorazioneListRow {
  return {
    id,
    codice: id,
    stato: "in_corso",
    priorita,
    note: null,
    mezzo_id: null,
    archived: false,
    created_at: updatedAt,
    updated_at: updatedAt,
    data_ingresso: updatedAt,
    data_uscita: null,
    mezzo: null,
  } as unknown as LavorazioneListRow;
}

const rows = [
  lavRow("a", "bassa", "2026-01-01T10:00:00Z"),
  lavRow("b", "urgente", "2026-01-02T10:00:00Z"),
  lavRow("c", "alta", "2026-01-03T10:00:00Z"),
];

assert.deepEqual(pickDashboardPriorityLavorazioneIds(rows, 2), ["b", "c"]);

const enriched = mergeMezzoIntoLavorazioneRows(rows, [
  {
    ...rows[1],
    mezzo: { id: "m1", marca: "Ferrari", modello: "488", cliente: "Cliente X" } as LavorazioneListRow["mezzo"],
  },
]);
assert.equal(enriched[1]?.mezzo?.marca, "Ferrari");

const widgetRows = computeDashboardLavWidgetRows(enriched, 1);
assert.equal(widgetRows.length, 1);
assert.equal(widgetRows[0]?.id, "b");

console.log("dashboard-lite-prefetch.test.ts OK");
