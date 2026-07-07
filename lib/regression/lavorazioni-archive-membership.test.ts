/**
 * Invariante archivio lavorazioni — membership cache liste attive/archivio.
 * ∀ query key "attive" → nessuna row con archived === true.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { QueryClient } from "@tanstack/react-query";
import { buildLavorazioniListKey } from "@/lib/react-query/build-list-keys";
import { normalizeLavorazioniFilters } from "@/lib/domain/normalize-filters";
import {
  lavorazioniListCountQueryKey,
  lavorazioniListQueryKey,
} from "@/lib/lavorazioni/lavorazioni-list-query-keys";
import {
  applyOptimisticLavorazioneUpdate,
  assertNoArchivedInActiveLists,
  buildConcludeOptimisticPatch,
  buildRestoreOptimisticPatch,
  isLavorazioniListCacheQueryKey,
  rollbackLavorazioneUpdateQueries,
  snapshotLavorazioneUpdateQueries,
} from "@/src/lib/react-query/lavorazioni-optimistic-cache";
import { QK } from "@/src/lib/react-query/query-keys";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { LavorazioneRow } from "@/src/types/supabase-tables";

const ID = "22222222-2222-4222-8222-222222222222";

function seedRow(overrides: Partial<LavorazioneListRow> & { id?: string } = {}): LavorazioneListRow {
  const now = "2026-07-07T12:00:00.000Z";
  const id = overrides.id ?? ID;
  const { id: _id, ...rest } = overrides;
  return {
    id,
    codice: "26-0099",
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
    ...rest,
  };
}

function listKeyLegacy(archived: boolean) {
  const fk = JSON.stringify({
    m: "",
    s: "",
    p: "",
    i: 1,
    fm: "light",
    ip: 0,
    si: "",
    q: "",
    di0: "",
    di1: "",
    du0: "",
    du1: "",
    ar: archived ? 1 : 0,
  });
  return [...QK.lavorazioniQueries, "list", fk, "ops"] as const;
}

function listKeyV2(mode: "active" | "closed") {
  return buildLavorazioniListKey(
    normalizeLavorazioniFilters({ archived: mode === "closed" }),
    false,
  );
}

// policy: isLavorazioniListCacheQueryKey
assert.equal(isLavorazioniListCacheQueryKey(listKeyLegacy(false)), true);
assert.equal(isLavorazioniListCacheQueryKey(listKeyV2("active")), true);
assert.equal(isLavorazioniListCacheQueryKey([...QK.lavorazioniQueries, "base", ID]), false);

const filtersAttive = { archived: false as const, includeMezzo: true, fetchMode: "light" as const, includeProfiles: false };
const countKey = lavorazioniListCountQueryKey(filtersAttive);
const listFactoryKey = lavorazioniListQueryKey(filtersAttive);
const listPortalKey = lavorazioniListQueryKey(filtersAttive, true);

assert.equal(isLavorazioniListCacheQueryKey(countKey), false, "count key excluded");
assert.equal(
  isLavorazioniListCacheQueryKey([...QK.lavorazioniQueries, "list", "filters", "custom-subquery"]),
  false,
  "custom subquery excluded",
);
assert.equal(isLavorazioniListCacheQueryKey(listFactoryKey), true, "staff ops list");
assert.equal(isLavorazioniListCacheQueryKey(listPortalKey), true, "portal list");
assert.equal(isLavorazioniListCacheQueryKey(listKeyV2("active")), true, "list-v2 active");

// stato optimistic con count cache presente (bug produzione)
{
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const attive = listFactoryKey;
  qc.setQueryData(countKey, 5);
  qc.setQueryData(attive, [seedRow()]);
  applyOptimisticLavorazioneUpdate(qc, ID, { stato: "diagnosi" });
  assert.equal(qc.getQueryData<number>(countKey), 5, "count unchanged");
  assert.equal(qc.getQueryData<LavorazioneListRow[]>(attive)?.[0]?.stato, "diagnosi");
}

// fail-safe: numero su key lista valida
{
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const attive = listFactoryKey;
  qc.setQueryData(attive, 123 as unknown as LavorazioneListRow[]);
  applyOptimisticLavorazioneUpdate(qc, ID, { stato: "diagnosi" });
  assert.equal(qc.getQueryData(attive), 123, "scalar list cache skipped");
}

// snapshot/rollback: count non nel context, count invariato dopo rollback
async function rollbackPreservesCountCache() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const attive = listFactoryKey;
  const row = seedRow();
  qc.setQueryData(countKey, 15);
  qc.setQueryData(attive, [row]);

  const ctx = await snapshotLavorazioneUpdateQueries(qc, ID);
  assert.ok(
    !ctx.lists.some((s) => s.queryKey[s.queryKey.length - 1] === "count"),
    "snapshot must not include count",
  );

  applyOptimisticLavorazioneUpdate(qc, ID, { stato: "diagnosi" });
  rollbackLavorazioneUpdateQueries(qc, ctx);

  assert.equal(qc.getQueryData<number>(countKey), 15);
  assert.equal(qc.getQueryData<LavorazioneListRow[]>(attive)?.[0]?.stato, "in_lavorazione");
}

// conclude su list legacy
{
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const attive = listKeyLegacy(false);
  const chiuse = listKeyLegacy(true);
  qc.setQueryData(attive, [seedRow({ stato: "completata" })]);
  qc.setQueryData(chiuse, []);
  applyOptimisticLavorazioneUpdate(qc, ID, buildConcludeOptimisticPatch(seedRow({ stato: "completata" })));
  assertNoArchivedInActiveLists(qc);
  assert.equal(qc.getQueryData<LavorazioneListRow[]>(attive)?.length, 0);
  assert.equal(qc.getQueryData<LavorazioneListRow[]>(chiuse)?.length, 1);
}

// conclude su list-v2 infinite
{
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const attive = listKeyV2("active");
  const chiuse = listKeyV2("closed");
  const row = seedRow({ stato: "completata" });
  qc.setQueryData(attive, {
    pages: [{ rows: [row], pageInfo: { hasNextPage: false, nextCursor: null, totalEstimate: 1 } }],
    pageParams: [null],
  });
  qc.setQueryData(chiuse, {
    pages: [{ rows: [], pageInfo: { hasNextPage: false, nextCursor: null, totalEstimate: 0 } }],
    pageParams: [null],
  });
  applyOptimisticLavorazioneUpdate(qc, ID, buildConcludeOptimisticPatch(row));
  assertNoArchivedInActiveLists(qc);
}

// rollback race: conclude poi rollback update parallelo — attive restano pulite
async function rollbackAfterConcludeRace() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const attive = listKeyLegacy(false);
  const chiuse = listKeyLegacy(true);
  const row = seedRow({ stato: "completata", updated_at: "2026-07-07T12:00:00.000Z" });
  qc.setQueryData(attive, [row]);
  qc.setQueryData(chiuse, []);

  const updateCtx = await snapshotLavorazioneUpdateQueries(qc, ID);
  applyOptimisticLavorazioneUpdate(qc, ID, { priorita: "alta" });

  const concludeAt = "2026-07-07T12:05:00.000Z";
  const archivedRow = {
    ...row,
    archived: true,
    archived_at: concludeAt,
    updated_at: concludeAt,
  } as LavorazioneRow;
  applyOptimisticLavorazioneUpdate(qc, ID, {}, archivedRow);
  qc.setQueryData([...QK.lavorazioniQueries, "base", ID], archivedRow);

  rollbackLavorazioneUpdateQueries(qc, updateCtx);

  assertNoArchivedInActiveLists(qc);
  const attiveAfter = qc.getQueryData<LavorazioneListRow[]>(attive) ?? [];
  assert.ok(!attiveAfter.some((r) => r.id === ID), "archived row must not reappear in attive after rollback");
}

// restore sposta da archivio ad attive
{
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const attive = listKeyLegacy(false);
  const chiuse = listKeyLegacy(true);
  const archived = seedRow({ stato: "completata", archived: true, archived_at: "2026-07-07T13:00:00.000Z" });
  qc.setQueryData(attive, []);
  qc.setQueryData(chiuse, [archived]);
  applyOptimisticLavorazioneUpdate(qc, ID, buildRestoreOptimisticPatch("in_lavorazione"));
  assert.equal(qc.getQueryData<LavorazioneListRow[]>(attive)?.length, 1);
  assert.equal(qc.getQueryData<LavorazioneListRow[]>(chiuse)?.length, 0);
  assertNoArchivedInActiveLists(qc);
}

// policy: write payload non può impostare archived
{
  const src = readFileSync(
    resolve(process.cwd(), "lib/validation/services/lavorazioni-payload.ts"),
    "utf8",
  );
  assert.ok(!src.includes('"archived"'), "archived not in LAVORAZIONE_WRITABLE_KEYS");
}

// policy: fetch attive filtra archived=false
{
  const src = readFileSync(
    resolve(process.cwd(), "lib/lavorazioni/lavorazioni-list-fetch.ts"),
    "utf8",
  );
  assert.match(src, /filters\.archived === false.*\.eq\("archived", false\)/s);
}

// policy: invalidate-targets entity-aware include list-v2 via shared predicate
{
  const src = readFileSync(
    resolve(process.cwd(), "src/lib/react-query/invalidate-targets.ts"),
    "utf8",
  );
  assert.match(src, /isLavorazioniListCacheQueryKey\(q\.queryKey\)/);
}

void Promise.all([rollbackAfterConcludeRace(), rollbackPreservesCountCache()]).then(() => {
  console.log("lavorazioni-archive-membership.test.ts OK");
});
