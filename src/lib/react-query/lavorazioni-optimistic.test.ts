import assert from "node:assert/strict";
import { QueryClient } from "@tanstack/react-query";
import {
  applyOptimisticLavorazioneUpdate,
  assertNoArchivedInActiveLists,
  buildConcludeOptimisticPatch,
  rollbackLavorazioneUpdateQueries,
  snapshotLavorazioneUpdateQueries,
} from "@/src/lib/react-query/lavorazioni-optimistic-cache";
import { lavorazioniListQueryKey } from "@/lib/lavorazioni/lavorazioni-list-query-keys";
import { QK } from "@/src/lib/react-query/query-keys";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { LavorazioneRow } from "@/src/types/supabase-tables";

const ID = "11111111-1111-4111-8111-111111111111";

function seedRow(overrides: Partial<LavorazioneListRow> = {}): LavorazioneListRow {
  const now = new Date().toISOString();
  return {
    id: ID,
    codice: "26-0001",
    stato: "in_lavorazione",
    priorita: "media",
    mezzo_id: "",
    data_ingresso: now,
    data_uscita: null,
    note: null,
    archived: false,
    archived_at: null,
    created_at: now,
    updated_at: now,
    deleted_at: null,
    created_by: null,
    mezzo: null,
    ...overrides,
  };
}

function listKey(archived: boolean) {
  return lavorazioniListQueryKey({
    archived: archived ? true : false,
    includeMezzo: true,
    fetchMode: "light",
    includeProfiles: false,
  });
}

const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const attiveKey = listKey(false);
const chiuseKey = listKey(true);

qc.setQueryData(attiveKey, [seedRow()]);
qc.setQueryData(chiuseKey, []);

// stato → completata: resta in lista attive (archived=false)
applyOptimisticLavorazioneUpdate(qc, ID, { stato: "completata" });
const attiveAfterStato = qc.getQueryData<LavorazioneListRow[]>(attiveKey);
assert.equal(attiveAfterStato?.length, 1, "completata must stay in attive list");
assert.equal(attiveAfterStato?.[0]?.stato, "completata");
assert.equal(attiveAfterStato?.[0]?.archived, false);

// conclude: sposta attive → chiuse
qc.setQueryData(attiveKey, [seedRow({ stato: "completata" })]);
qc.setQueryData(chiuseKey, []);
const concludePatch = buildConcludeOptimisticPatch(seedRow({ stato: "completata" }));
applyOptimisticLavorazioneUpdate(qc, ID, concludePatch);
const attiveAfterConclude = qc.getQueryData<LavorazioneListRow[]>(attiveKey);
const chiuseAfterConclude = qc.getQueryData<LavorazioneListRow[]>(chiuseKey);
assert.equal(attiveAfterConclude?.length, 0, "conclude removes from attive");
assert.equal(chiuseAfterConclude?.length, 1, "conclude adds to archivio");
assert.equal(chiuseAfterConclude?.[0]?.archived, true);
assert.equal(chiuseAfterConclude?.[0]?.stato, "completata");
assertNoArchivedInActiveLists(qc);

async function runRollbackTest() {
  const q = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const attive = listKey(false);
  const chiuse = listKey(true);
  q.setQueryData(attive, [seedRow()]);
  q.setQueryData(chiuse, []);
  const ctx = await snapshotLavorazioneUpdateQueries(q, ID);
  applyOptimisticLavorazioneUpdate(q, ID, { stato: "completata" });
  rollbackLavorazioneUpdateQueries(q, ctx);
  const attiveAfterRollback = q.getQueryData<LavorazioneListRow[]>(attive);
  assert.equal(attiveAfterRollback?.[0]?.stato, "in_lavorazione");
}

async function runConcludeThenParallelUpdateRollback() {
  const q = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const attive = listKey(false);
  const chiuse = listKey(true);
  const row = seedRow({ stato: "completata", updated_at: "2026-01-01T10:00:00.000Z" });
  q.setQueryData(attive, [row]);
  q.setQueryData(chiuse, []);

  const updateCtx = await snapshotLavorazioneUpdateQueries(q, ID);
  applyOptimisticLavorazioneUpdate(q, ID, { priorita: "alta" });

  const concludeAt = "2026-01-01T10:05:00.000Z";
  const archivedBase = {
    ...row,
    archived: true,
    archived_at: concludeAt,
    updated_at: concludeAt,
  } as LavorazioneRow;
  applyOptimisticLavorazioneUpdate(q, ID, {}, archivedBase);
  q.setQueryData([...QK.lavorazioniQueries, "base", ID], archivedBase);

  rollbackLavorazioneUpdateQueries(q, updateCtx);
  assertNoArchivedInActiveLists(q);
  const attiveRows = q.getQueryData<LavorazioneListRow[]>(attive) ?? [];
  assert.ok(!attiveRows.some((r) => r.id === ID), "T0-T1-T2 race: archived row must not return to attive");
}

// note patch: lista + base query
{
  const q = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const attive = listKey(false);
  const baseKey = [...QK.lavorazioniQueries, "base", ID] as const;
  q.setQueryData(attive, [seedRow({ note: "vecchia" })]);
  q.setQueryData(baseKey, seedRow({ note: "vecchia" }) as LavorazioneRow);
  void snapshotLavorazioneUpdateQueries(q, ID);
  applyOptimisticLavorazioneUpdate(q, ID, { note: "nuova nota" });
  const listRows = q.getQueryData<LavorazioneListRow[]>(attive);
  const baseRow = q.getQueryData<LavorazioneRow>(baseKey);
  assert.equal(listRows?.[0]?.note, "nuova nota");
  assert.equal(baseRow?.note, "nuova nota");
}

void Promise.all([runRollbackTest(), runConcludeThenParallelUpdateRollback()]).then(() => {
  console.log("lavorazioni-optimistic.test.ts OK");
});
