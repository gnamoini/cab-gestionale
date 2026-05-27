import assert from "node:assert/strict";
import { QueryClient } from "@tanstack/react-query";
import { magazzinoListQueryKey } from "@/lib/magazzino/magazzino-list-cache";
import {
  applyScortaOptimisticDelta,
  resetScortaSyncQueuesForTest,
} from "@/lib/magazzino/scorta-adjust-sync";
import type { MagazzinoRicambioRow } from "@/src/types/supabase-tables";

function seedRow(id: string, quantita: number): MagazzinoRicambioRow {
  const now = new Date().toISOString();
  return {
    id,
    codice: "COD1",
    nome: "Ricambio test",
    marca: "Marca",
    quantita,
    costo: 10,
    prezzo_vendita: 20,
    consumo_medio_mensile: null,
    meta: {},
    created_at: now,
    updated_at: now,
  };
}

function touchRow(row: { scorta: number; descrizione?: string }) {
  return {
    ...row,
    scorta: row.scorta,
    descrizione: row.descrizione ?? "Ricambio test",
    dataUltimaModifica: new Date().toISOString(),
    autoreUltimaModifica: "Test",
  };
}

resetScortaSyncQueuesForTest();
const qc = new QueryClient();
const id = "11111111-1111-4111-8111-111111111111";
qc.setQueryData(magazzinoListQueryKey(), [seedRow(id, 10)]);

const r1 = applyScortaOptimisticDelta(qc, id, 1, "Test", touchRow as never);
const r2 = applyScortaOptimisticDelta(qc, id, 1, "Test", touchRow as never);
const r3 = applyScortaOptimisticDelta(qc, id, 1, "Test", touchRow as never);
const r4 = applyScortaOptimisticDelta(qc, id, 1, "Test", touchRow as never);

assert.equal(r1.dopo, 11);
assert.equal(r2.dopo, 12);
assert.equal(r3.dopo, 13);
assert.equal(r4.dopo, 14);

const rows = qc.getQueryData<MagazzinoRicambioRow[]>(magazzinoListQueryKey());
assert.equal(rows?.[0]?.quantita, 14);

resetScortaSyncQueuesForTest();
console.log("scorta-adjust-sync.test.ts OK");
