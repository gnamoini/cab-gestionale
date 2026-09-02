import assert from "node:assert/strict";
import { QueryClient } from "@tanstack/react-query";
import {
  abortPendingStockOperation,
  clearStockOperationRegistryForTest,
  markPendingStockOperation,
} from "@/lib/magazzino/stock-operation-registry";
import { magazzinoListQueryKey } from "@/lib/magazzino/magazzino-list-cache";
import {
  decideGestionaleDirty,
  compareRemoteChangeIncorporation,
} from "@/lib/sync/gestionale-dirty-decision";
import {
  abortRecentLocalGestionaleMutation,
  clearRecentLocalGestionaleMutations,
  markRecentLocalGestionaleMutation,
} from "@/lib/sync/recent-local-mutation";
import {
  markGestionaleDirty,
  resetGestionaleDirtyStateForTests,
} from "@/lib/sync/gestionale-dirty-state";
import { resolveSyncEffects } from "@/lib/sync/gestionale-sync-policy";
import {
  clearGestionaleSyncScopesForTests,
  registerGestionaleSyncScope,
} from "@/lib/sync/gestionale-sync-scope";
import {
  consumeOperationalVersionPoll,
  resetOperationalVersionStateForTests,
  setFetchOperationalTableVersionsForTests,
} from "@/lib/sync/operational-data-version";
import { isForeignBroadcastSource } from "@/lib/sync/cab-realtime-broadcast";
import type { MagazzinoRicambioRow } from "@/src/types/supabase-tables";

const id = "22222222-2222-4222-8222-222222222222";
const opLocal = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

function magRow(stockVersion: number, updatedAt = "2026-01-01T00:00:00.000Z"): MagazzinoRicambioRow {
  return {
    id,
    codice: "COD",
    nome: "Ricambio",
    marca: "M",
    quantita: 10,
    stock_version: stockVersion,
    costo: 1,
    prezzo_vendita: 2,
    consumo_medio_mensile: null,
    meta: {},
    created_at: updatedAt,
    updated_at: updatedAt,
  };
}

function seedList(qc: QueryClient, row: MagazzinoRicambioRow): void {
  qc.setQueryData(magazzinoListQueryKey(), [row]);
}

async function run(): Promise<void> {
  clearRecentLocalGestionaleMutations();
  clearStockOperationRegistryForTest();
  resetGestionaleDirtyStateForTests();
  clearGestionaleSyncScopesForTests();
  resetOperationalVersionStateForTests();

  const unregister = registerGestionaleSyncScope({
    scopeId: "mag-banner-test",
    domain: "magazzino",
    route: "/magazzino",
    tables: ["magazzino_ricambi", "movimenti_ricambi"],
  });

  const qc = new QueryClient();
  seedList(qc, magRow(5));

  // 1
  markRecentLocalGestionaleMutation(["magazzino_ricambi", "movimenti_ricambi"], id);
  assert.equal(
    decideGestionaleDirty({
      table: "magazzino_ricambi",
      entityId: id,
      source: "realtime",
      queryClient: qc,
      payload: { id, stock_version: 6, operation_id: opLocal },
    }).reason,
    "self_originated",
  );

  // 2
  clearRecentLocalGestionaleMutations();
  const qcEmpty = new QueryClient();
  assert.equal(
    decideGestionaleDirty({
      table: "magazzino_ricambi",
      entityId: id,
      source: "realtime",
      queryClient: qcEmpty,
      payload: { id, stock_version: 3 },
    }).reason,
    "remote_not_incorporated",
  );

  // 3
  clearRecentLocalGestionaleMutations();
  seedList(qc, magRow(5));
  assert.equal(isForeignBroadcastSource("other-tab-id"), true);
  assert.equal(
    decideGestionaleDirty({
      table: "magazzino_ricambi",
      entityId: id,
      source: "broadcast",
      queryClient: qc,
      payload: { id, stock_version: 8 },
    }).action,
    "mark",
  );

  // 4
  markRecentLocalGestionaleMutation(["magazzino_ricambi"], id);
  assert.equal(
    decideGestionaleDirty({
      table: "magazzino_ricambi",
      entityId: id,
      source: "realtime",
      queryClient: qc,
    }).action,
    "skip",
  );

  // 5
  clearRecentLocalGestionaleMutations();
  resetGestionaleDirtyStateForTests();
  assert.equal(
    decideGestionaleDirty({
      table: "magazzino_ricambi",
      entityId: id,
      source: "realtime",
      queryClient: qc,
      payload: { id, stock_version: 9 },
    }).action,
    "mark",
  );
  markGestionaleDirty({
    domain: "magazzino",
    table: "magazzino_ricambi",
    entityId: id,
    type: "update",
    timestamp: Date.now(),
    source: "realtime",
  });

  // 6
  resetOperationalVersionStateForTests({ magazzino_ricambi: 10 });
  setFetchOperationalTableVersionsForTests(async () => ({ magazzino_ricambi: 10 }));
  const drifted = await consumeOperationalVersionPoll();
  assert.deepEqual(drifted, []);

  // 7
  clearRecentLocalGestionaleMutations();
  seedList(qc, magRow(5));
  assert.equal(
    decideGestionaleDirty({
      table: "magazzino_ricambi",
      entityId: id,
      source: "realtime",
      queryClient: qc,
      payload: { id, stock_version: 5 },
    }).reason,
    "already_incorporated",
  );

  // 8
  assert.equal(
    decideGestionaleDirty({
      table: "magazzino_ricambi",
      entityId: id,
      source: "realtime",
      queryClient: qc,
      payload: { id, stock_version: 7 },
    }).reason,
    "remote_not_incorporated",
  );

  // 9
  const resolved = resolveSyncEffects({
    source: "realtime",
    tables: ["magazzino_ricambi"],
    entityIdByTable: new Map([["magazzino_ricambi", id]]),
    cabEvents: [],
    flag: "pilot_heavy",
  });
  assert.equal(resolved.dirtyEntries.length, 1);

  // 10
  markRecentLocalGestionaleMutation(["magazzino_ricambi"], id);
  abortRecentLocalGestionaleMutation(["magazzino_ricambi"], id);
  assert.equal(
    decideGestionaleDirty({
      table: "magazzino_ricambi",
      entityId: id,
      source: "realtime",
      queryClient: qc,
      payload: { id, stock_version: 8 },
    }).reason,
    "remote_not_incorporated",
  );

  // 11
  clearRecentLocalGestionaleMutations();
  assert.equal(
    decideGestionaleDirty({
      table: "magazzino_ricambi",
      entityId: id,
      source: "realtime",
      queryClient: qc,
      payload: { id },
    }).reason,
    "unknown_origin",
  );

  // 12
  clearRecentLocalGestionaleMutations();
  assert.equal(
    decideGestionaleDirty({
      table: "magazzino_ricambi",
      entityId: id,
      source: "broadcast",
      queryClient: qc,
      payload: { id, stock_version: 12 },
    }).reason,
    "remote_not_incorporated",
  );

  // 13
  seedList(qc, magRow(10));
  assert.equal(
    compareRemoteChangeIncorporation(qc, "magazzino_ricambi", id, { stock_version: 8 }),
    "incorporated",
  );

  // 14
  assert.equal(
    compareRemoteChangeIncorporation(qc, "magazzino_ricambi", id, { stock_version: 11 }),
    "not_incorporated",
  );

  clearRecentLocalGestionaleMutations();
  markPendingStockOperation(opLocal, id);
  assert.equal(
    decideGestionaleDirty({
      table: "magazzino_ricambi",
      entityId: id,
      source: "realtime",
      queryClient: qc,
      payload: { id, stock_version: 99, operation_id: opLocal },
    }).reason,
    "self_originated",
  );
  abortPendingStockOperation(opLocal);

  unregister();
  clearGestionaleSyncScopesForTests();
  clearRecentLocalGestionaleMutations();
  clearStockOperationRegistryForTest();
  resetGestionaleDirtyStateForTests();
  resetOperationalVersionStateForTests();
}

void run().then(() => {
  console.log("gestionale-dirty-banner-scenarios.test.ts OK");
});
