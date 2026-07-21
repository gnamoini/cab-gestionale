import assert from "node:assert/strict";
import { QueryClient } from "@tanstack/react-query";
import { evaluateStockMerge } from "@/lib/magazzino/stock-merge-gate";
import {
  clearStockEntityRegistryForTest,
  getStockEntity,
  mergeStockEntity,
  stockEntityFromRow,
} from "@/lib/magazzino/stock-entity-cache";
import { magazzinoListQueryKey } from "@/lib/magazzino/magazzino-list-cache";
import {
  clearStockMergeTelemetryForTest,
  getStockTelemetryCounters,
  recordStockMergeTelemetry,
} from "@/lib/magazzino/stock-merge-telemetry";
import type { MagazzinoRicambioRow } from "@/src/types/supabase-tables";

const id = "11111111-1111-4111-8111-111111111111";
const opA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const opB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function row(quantita: number, stockVersion = 0): MagazzinoRicambioRow {
  const now = new Date().toISOString();
  return {
    id,
    codice: "COD1",
    nome: "Ricambio test",
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

// --- merge gate ---
assert.equal(evaluateStockMerge(
  { ricambioId: id, quantita: 11, stockVersion: 2, lastOperationId: opA },
  { ricambioId: id, quantita: 10, stockVersion: 1, lastOperationId: null },
).decision, "merge");

assert.equal(evaluateStockMerge(
  { ricambioId: id, quantita: 9, stockVersion: 1, lastOperationId: opA },
  { ricambioId: id, quantita: 10, stockVersion: 2, lastOperationId: null },
).decision, "ignore");

assert.equal(evaluateStockMerge(
  { ricambioId: id, quantita: 10, stockVersion: 3, lastOperationId: opA },
  { ricambioId: id, quantita: 10, stockVersion: 3, lastOperationId: opA },
).decision, "ignore");

assert.equal(evaluateStockMerge(
  { ricambioId: id, quantita: 10, stockVersion: 3, lastOperationId: opB },
  { ricambioId: id, quantita: 10, stockVersion: 3, lastOperationId: opA },
).decision, "warn_conflict");

// --- entity cache ---
clearStockEntityRegistryForTest();
const qc = new QueryClient();
qc.setQueryData(magazzinoListQueryKey(), [row(10, 1)]);

mergeStockEntity(
  qc,
  { ricambioId: id, quantita: 12, stockVersion: 2, lastOperationId: opA },
  "mutation",
);
assert.equal(getStockEntity(qc, id)?.quantita, 12);
assert.equal(getStockEntity(qc, id)?.stockVersion, 2);

mergeStockEntity(
  qc,
  { ricambioId: id, quantita: 5, stockVersion: 1, lastOperationId: opB },
  "refetch",
);
assert.equal(getStockEntity(qc, id)?.quantita, 12, "stale refetch must not rollback");

// burst target
mergeStockEntity(qc, { ricambioId: id, quantita: 25, stockVersion: 3, lastOperationId: opB }, "optimistic");
assert.equal(qc.getQueryData<MagazzinoRicambioRow[]>(magazzinoListQueryKey())?.[0]?.quantita, 25);

// --- telemetry ---
clearStockMergeTelemetryForTest();
recordStockMergeTelemetry({ mergeSource: "rejected", ricambioId: id });
const counters = getStockTelemetryCounters();
assert.ok(counters.rollback_count >= 1);

// --- stock entity from row ---
const entity = stockEntityFromRow(row(7, 4), opA);
assert.equal(entity.quantita, 7);
assert.equal(entity.stockVersion, 4);
assert.equal(entity.lastOperationId, opA);

console.log("stock-reliability.test.ts OK");
