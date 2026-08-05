import assert from "node:assert/strict";
import { QueryClient } from "@tanstack/react-query";
import { evaluateStockMerge } from "@/lib/magazzino/stock-merge-gate";
import { clearStockEntityRegistryForTest } from "@/lib/magazzino/stock-entity-cache";
import { magazzinoListQueryKey } from "@/lib/magazzino/magazzino-list-cache";
import {
  clearStockOperationRegistryForTest,
  markCompletedStockOperation,
} from "@/lib/magazzino/stock-operation-registry";
import {
  isSelfOriginatedStockRealtimeEvent,
  tryMergeStockFromRealtime,
} from "@/lib/magazzino/stock-realtime-merge";
import {
  clearRecentLocalGestionaleMutations,
  markRecentLocalGestionaleMutation,
} from "@/lib/sync/recent-local-mutation";
import type { MagazzinoRicambioRow } from "@/src/types/supabase-tables";

const id = "22222222-2222-4222-8222-222222222222";
const opLocal = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

function row(quantita: number, stockVersion = 0): MagazzinoRicambioRow {
  const now = new Date().toISOString();
  return {
    id,
    codice: "COD2",
    nome: "Ricambio remoto",
    marca: "Marca",
    quantita,
    stock_version: stockVersion,
    costo: 10,
    prezzo_vendita: 20,
    consumo_medio_mensile: null,
    meta: {},
    created_at: now,
    updated_at: now,
  };
}

clearStockEntityRegistryForTest();
clearStockOperationRegistryForTest();
clearRecentLocalGestionaleMutations();

const qc = new QueryClient();

assert.equal(
  evaluateStockMerge(
    { ricambioId: id, quantita: 5, stockVersion: 1, lastOperationId: null },
    null,
  ).decision,
  "cannot_merge",
);

assert.equal(
  tryMergeStockFromRealtime(qc, "magazzino_ricambi", {
    id,
    quantita: 5,
    stock_version: 1,
  }),
  false,
);

markCompletedStockOperation(opLocal, id);
assert.equal(
  isSelfOriginatedStockRealtimeEvent("magazzino_ricambi", {
    id,
    quantita: 10,
    stock_version: 2,
    operation_id: opLocal,
  }),
  true,
);

clearRecentLocalGestionaleMutations();
markRecentLocalGestionaleMutation(["magazzino_ricambi"], id);
assert.equal(
  isSelfOriginatedStockRealtimeEvent("magazzino_ricambi", {
    id,
    quantita: 11,
    stock_version: 3,
  }),
  true,
);

clearRecentLocalGestionaleMutations();
clearStockOperationRegistryForTest();
qc.setQueryData(magazzinoListQueryKey(), [row(10, 5)]);
assert.equal(
  tryMergeStockFromRealtime(qc, "magazzino_ricambi", {
    id,
    quantita: 12,
    stock_version: 6,
    operation_id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
  }),
  true,
);

console.log("stock-realtime-dirty-gate.test.ts OK");
