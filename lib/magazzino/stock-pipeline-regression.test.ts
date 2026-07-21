import assert from "node:assert/strict";
import { QueryClient } from "@tanstack/react-query";
import { evaluateStockMerge } from "@/lib/magazzino/stock-merge-gate";
import {
  clearStockClientStoreForTest,
  enqueueJournalEntry,
  getStockDisplayState,
  tryConfirmJournalMutation,
} from "@/lib/magazzino/stock-client-store";
import {
  clearStockClientQueueForTest,
  enqueueStockMutation,
  getStockQueueState,
} from "@/lib/magazzino/stock-client-queue";
import {
  clearStockOperationRegistryForTest,
  isKnownStockOperation,
  markCompletedStockOperation,
  markPendingStockOperation,
} from "@/lib/magazzino/stock-operation-registry";
import { mergeStockEntity, clearStockEntityRegistryForTest } from "@/lib/magazzino/stock-entity-cache";
import { magazzinoListQueryKey } from "@/lib/magazzino/magazzino-list-cache";
import type { MagazzinoRicambioRow } from "@/src/types/supabase-tables";

const id = "11111111-1111-4111-8111-111111111111";
const op = (n: number) =>
  `aaaaaaaa-aaaa-4aaa-8aaa-${String(n).padStart(12, "0").slice(0, 12)}`;

function row(quantita: number, stockVersion = 0): MagazzinoRicambioRow {
  const now = new Date().toISOString();
  return {
    id,
    codice: "COD1",
    nome: "Ricambio",
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
clearStockClientStoreForTest();
clearStockClientQueueForTest();
clearStockOperationRegistryForTest();

const qc = new QueryClient();
qc.setQueryData(magazzinoListQueryKey(), [row(100, 10)]);

// T1/T6 — 10 incrementi journal display
for (let i = 1; i <= 10; i++) {
  enqueueJournalEntry({
    operationId: op(i),
    ricambioId: id,
    delta: 1,
    expectedVersion: null,
    status: "queued",
    createdAt: Date.now(),
  });
}
assert.equal(getStockDisplayState(qc, id).displayQuantita, 110);

// confirm sequenziale
for (let i = 1; i <= 10; i++) {
  const v = 10 + i;
  mergeStockEntity(qc, { ricambioId: id, quantita: 100 + i, stockVersion: v, lastOperationId: op(i) }, "mutation");
  tryConfirmJournalMutation(qc, id, op(i), {
    ricambioId: id,
    quantita: 100 + i,
    stockVersion: v,
    movimentoId: `m-${i}`,
    operationId: op(i),
  });
}
assert.equal(getStockDisplayState(qc, id).displayQuantita, 110);
assert.equal(getStockDisplayState(qc, id).certifiedQuantita, 110);

// T2 — merge gate concorrenza versioni
assert.equal(
  evaluateStockMerge(
    { ricambioId: id, quantita: 108, stockVersion: 12, lastOperationId: op(20) },
    { ricambioId: id, quantita: 107, stockVersion: 11, lastOperationId: op(19) },
  ).decision,
  "merge",
);

// T3/T5/T9 — operation registry idempotenza
markPendingStockOperation(op(99), id);
assert.equal(isKnownStockOperation(op(99)), true);
markCompletedStockOperation(op(99), id);
assert.equal(isKnownStockOperation(op(99)), true);

// T4/T8 — realtime stale ignore
assert.equal(
  evaluateStockMerge(
    { ricambioId: id, quantita: 105, stockVersion: 13, lastOperationId: op(30) },
    { ricambioId: id, quantita: 110, stockVersion: 15, lastOperationId: op(31) },
  ).decision,
  "ignore",
);
assert.equal(
  evaluateStockMerge(
    { ricambioId: id, quantita: 112, stockVersion: 16, lastOperationId: op(32) },
    { ricambioId: id, quantita: 110, stockVersion: 15, lastOperationId: op(31) },
  ).decision,
  "merge",
);

// T10 — journal prune dopo confirm
enqueueJournalEntry({
  operationId: op(50),
  ricambioId: id,
  delta: 1,
  expectedVersion: 10,
  status: "confirmed",
  createdAt: Date.now() - 120_000,
  completedAt: Date.now() - 120_000,
  responseVersion: 11,
});
assert.equal(getStockDisplayState(qc, id).pendingCount, 0);

// T11 — pending op riconosciuta (offline retry dedupe)
markPendingStockOperation(op(60), id);
assert.equal(isKnownStockOperation(op(60)), true);

// T6 queue — serializza job
async function runQueueTest(): Promise<void> {
  let chain = 0;
  const results: number[] = [];
  await Promise.all([
    enqueueStockMutation(id, op(40), async () => {
      chain += 1;
      results.push(chain);
    }),
    enqueueStockMutation(id, op(41), async () => {
      chain += 1;
      results.push(chain);
    }),
  ]);
  assert.deepEqual(results, [1, 2]);
  assert.equal(getStockQueueState(id).pending, 0);
}

void runQueueTest().then(() => {
  console.log("stock-pipeline-regression.test.ts OK");
});
