import assert from "node:assert/strict";
import { QueryClient } from "@tanstack/react-query";
import {
  applyOptimisticLavorazioneUpdate,
  buildConcludeOptimisticPatch,
  rollbackLavorazioneUpdateQueries,
  snapshotLavorazioneUpdateQueries,
} from "@/src/lib/react-query/lavorazioni-optimistic-cache";
import { QK } from "@/src/lib/react-query/query-keys";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";

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
  const fk = JSON.stringify({
    m: "",
    s: "",
    p: "",
    i: 1,
    si: "",
    q: "",
    di0: "",
    di1: "",
    du0: "",
    du1: "",
    ar: archived ? 1 : 0,
  });
  return [...QK.lavorazioniQueries, "list", fk] as const;
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

void runRollbackTest().then(() => {
  console.log("lavorazioni-optimistic.test.ts OK");
});
