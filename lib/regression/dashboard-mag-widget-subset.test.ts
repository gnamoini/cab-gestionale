import assert from "node:assert/strict";
import { buildDashboardMagWidgetFromReportRows } from "@/lib/magazzino/dashboard-mag-widget-server";
import type { MagazzinoRicambioRow } from "@/src/types/supabase-tables";

function ricRow(id: string, qty: number, scortaMin: number, prezzo: number): MagazzinoRicambioRow {
  return {
    id,
    codice: id,
    nome: id,
    marca: "M",
    quantita: qty,
    costo: prezzo,
    prezzo_vendita: prezzo * 1.2,
    consumo_medio_mensile: 0,
    meta: {
      scortaMinima: scortaMin,
      prezzoFornitoreOriginale: prezzo,
      scontoFornitoreOriginale: 0,
      descrizione: id,
    },
    entity_key: id,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  } as MagazzinoRicambioRow;
}

const all = [
  ricRow("ok", 10, 5, 10),
  ricRow("low", 1, 5, 20),
  ricRow("unused", 100, 0, 5),
];

const { kpi, subsetRows } = buildDashboardMagWidgetFromReportRows(all, [
  {
    rows: [{ entita: "magazzino_ricambi", entita_id: "ok" } as never],
  },
]);

assert.equal(kpi.sottoScorta, 1);
assert.ok(kpi.capitale > 0);
assert.deepEqual(subsetRows.map((r) => r.id).sort(), ["low", "ok"]);

console.log("dashboard-mag-widget-subset.test.ts OK");
