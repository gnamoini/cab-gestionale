import assert from "node:assert/strict";
import type { QueryClient } from "@tanstack/react-query";
import {
  clearRecentEntityInvalidations,
  markEntityInvalidated,
  shouldSkipEntityRefetch,
} from "@/lib/sync/recent-entity-invalidation";
import {
  enqueueInvalidateGestionaleTables,
  flushAllInvalidateBatches,
  flushInvalidateBatch,
  INVALIDATE_BATCH_WINDOW_MS,
} from "@/src/lib/react-query/invalidate-batch";
import { executeInvalidateGestionaleTables } from "@/src/lib/react-query/invalidate-targets";
import { QK } from "@/src/lib/react-query/query-keys";

type InvalidateCall = { queryKey?: unknown; refetchType?: string; predicate?: unknown };
type MockQueryClient = QueryClient & { _calls: InvalidateCall[] };

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function mockQueryClient(): MockQueryClient {
  const calls: InvalidateCall[] = [];
  const qc = {
    invalidateQueries: (opts: InvalidateCall) => {
      calls.push(opts);
      return Promise.resolve();
    },
    _calls: calls,
  };
  return qc as MockQueryClient;
}

async function runTests(): Promise<void> {
  clearRecentEntityInvalidations();
  markEntityInvalidated("lavorazioni", "lav-1");
  assert.equal(shouldSkipEntityRefetch("lavorazioni", "lav-1"), true);
  assert.equal(shouldSkipEntityRefetch("lavorazioni", "lav-2"), false);
  clearRecentEntityInvalidations();

  const immediateQc = mockQueryClient();
  executeInvalidateGestionaleTables(immediateQc, ["lavorazioni"], {
    entityIdByTable: new Map([["lavorazioni", "lav-entity"]]),
    cabSyncEvents: [{ type: "entity_updated", entity: "lavorazioni", id: "lav-entity", table: "lavorazioni" }],
  });
  assert.ok(immediateQc._calls.length >= 2);
  assert.ok(
    immediateQc._calls.some(
      (c) => c.queryKey && JSON.stringify(c.queryKey).includes("lav-entity"),
    ),
  );
  assert.ok(!immediateQc._calls.some((c) => JSON.stringify(c.queryKey) === JSON.stringify(QK.lavorazioniQueries)));

  const batchedQc = mockQueryClient();
  enqueueInvalidateGestionaleTables(batchedQc, ["magazzino_ricambi"]);
  enqueueInvalidateGestionaleTables(batchedQc, ["magazzino_ricambi"]);
  assert.equal(batchedQc._calls.length, 0);
  await sleep(INVALIDATE_BATCH_WINDOW_MS + 20);
  flushInvalidateBatch(batchedQc);
  const magCalls = batchedQc._calls.filter((c) => JSON.stringify(c.queryKey) === JSON.stringify(QK.magazzino));
  assert.equal(magCalls.length, 1);

  const dedupeQc = mockQueryClient();
  markEntityInvalidated("lavorazioni", "lav-dedupe");
  enqueueInvalidateGestionaleTables(dedupeQc, ["lavorazioni"], {
    entityIdByTable: new Map([["lavorazioni", "lav-dedupe"]]),
  });
  await sleep(INVALIDATE_BATCH_WINDOW_MS + 20);
  flushAllInvalidateBatches(dedupeQc);
  assert.equal(dedupeQc._calls.length, 0);

  const syncImmediateQc = mockQueryClient();
  enqueueInvalidateGestionaleTables(syncImmediateQc, ["lavorazioni"], {
    immediate: true,
    cabSyncEvents: [{ type: "entity_created", entity: "lavorazioni", id: "new-lav", table: "lavorazioni" }],
  });
  assert.ok(syncImmediateQc._calls.length > 0);

  console.log("invalidate-batch.test.ts: ok");
}

void runTests();
