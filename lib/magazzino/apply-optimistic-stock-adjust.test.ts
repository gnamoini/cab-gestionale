import assert from "node:assert/strict";
import { QueryClient } from "@tanstack/react-query";
import { applyOptimisticStockAdjust } from "@/lib/magazzino/apply-optimistic-stock-adjust";
import { clearStockEntityRegistryForTest, getStockEntity } from "@/lib/magazzino/stock-entity-cache";
import { magazzinoListQueryKey } from "@/lib/magazzino/magazzino-list-cache";
import type { MagazzinoRicambioRow } from "@/src/types/supabase-tables";

const id = "11111111-1111-4111-8111-111111111111";
const op = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

clearStockEntityRegistryForTest();
const qc = new QueryClient();
const now = new Date().toISOString();
qc.setQueryData<MagazzinoRicambioRow[]>(magazzinoListQueryKey(), [
  {
    id,
    codice: "COD1",
    nome: "Ricambio",
    marca: "Marca",
    quantita: 2,
    stock_version: 1,
    costo: 10,
    prezzo_vendita: 20,
    consumo_medio_mensile: null,
    meta: {},
    created_at: now,
    updated_at: now,
  },
]);

applyOptimisticStockAdjust(qc, {
  ricambioId: id,
  delta: 1,
  operationId: op,
  optimisticQuantita: 3,
});

assert.equal(getStockEntity(qc, id)?.quantita, 3);
const rows = qc.getQueryData<MagazzinoRicambioRow[]>(magazzinoListQueryKey());
assert.equal(rows?.find((r) => r.id === id)?.quantita, 3);

console.log("apply-optimistic-stock-adjust.test.ts OK");
