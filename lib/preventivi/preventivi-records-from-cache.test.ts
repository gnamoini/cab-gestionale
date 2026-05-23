import assert from "node:assert/strict";
import {
  getPreventiviRecordsFromCache,
  mapPreventiviRowsToRecords,
  nextPreventivoId,
  nextPreventivoNumeroFromRecords,
} from "@/lib/preventivi/preventivi-records-from-cache";
import type { PreventivoRecord } from "@/lib/preventivi/types";
import { QueryClient } from "@tanstack/react-query";
import { QK } from "@/src/lib/react-query/query-keys";

const y = new Date().getFullYear();

const sampleRecords: PreventivoRecord[] = [
  { numero: `${y}-003` } as PreventivoRecord,
  { numero: `${y}-001` } as PreventivoRecord,
  { numero: `PV-${y - 1}-099` } as PreventivoRecord,
];

assert.equal(nextPreventivoNumeroFromRecords(sampleRecords), `${y}-004`);
assert.equal(nextPreventivoNumeroFromRecords([]), `${y}-001`);

const uuid = nextPreventivoId();
assert.match(uuid, /^[0-9a-f-]{36}$/i);

const qc = new QueryClient();
assert.deepEqual(getPreventiviRecordsFromCache(qc, []), []);

qc.setQueryData([...QK.preventivi, null], [
  {
    id: "pv-1",
    mezzo_id: "m-1",
    lavorazione_id: null,
    cliente: "Cliente A",
    totale: 100,
    dettagli: { numero: `${y}-010` },
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-02T00:00:00.000Z",
  },
]);

const mapped = mapPreventiviRowsToRecords(qc.getQueryData([...QK.preventivi, null]), [
  { id: "m-1", cliente: "Cliente A" } as never,
]);
assert.equal(mapped.length, 1);
assert.equal(mapped[0]?.numero, `${y}-010`);

console.log("preventivi-records-from-cache.test.ts: ok");
