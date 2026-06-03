import assert from "node:assert/strict";
import { extractScortaDelta } from "@/lib/report/magazzino-log-parse";
import {
  movimentoRowToChangeLogEntry,
  movimentiRowsToMagazzinoChangeLog,
} from "@/lib/report/report-movimenti-log";
import type { MovimentoRicambioRow } from "@/src/types/supabase-tables";

function mockMov(over: Partial<MovimentoRicambioRow> = {}): MovimentoRicambioRow {
  return {
    id: "mov-1",
    ricambio_id: "r1",
    lavorazione_id: null,
    tipo: "uscita",
    quantita: 3,
    created_at: "2025-03-10T12:00:00.000Z",
    ...over,
  };
}

const uscita = movimentoRowToChangeLogEntry(mockMov());
assert.equal(uscita.id, "mov-mov-1");
assert.equal(uscita.ricambioId, "r1");
assert.equal(uscita.annullato, false);
const uscitaDelta = extractScortaDelta(uscita);
assert.equal(uscitaDelta, -3);

const entrata = movimentoRowToChangeLogEntry(mockMov({ id: "mov-2", tipo: "entrata", quantita: 5 }));
const entrataDelta = extractScortaDelta(entrata);
assert.equal(entrataDelta, 5);

const sorted = movimentiRowsToMagazzinoChangeLog([
  mockMov({ id: "a", created_at: "2025-01-01T00:00:00.000Z" }),
  mockMov({ id: "b", created_at: "2025-06-01T00:00:00.000Z" }),
]);
assert.equal(sorted[0]?.id, "mov-b");
assert.equal(sorted[1]?.id, "mov-a");

console.log("report-movimenti-log.test.ts OK");
