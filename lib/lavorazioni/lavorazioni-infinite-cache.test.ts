import assert from "node:assert/strict";
import { QueryClient } from "@tanstack/react-query";
import { buildLavorazioniListKey } from "@/lib/react-query/build-list-keys";
import { normalizeLavorazioniFilters } from "@/lib/domain/normalize-filters";
import {
  coerceLavorazioniListRowsFromCache,
  isLavorazioniInfiniteListCacheData,
  lavorazioniInfiniteSeedFromRows,
  repairLavorazioniInfiniteListCacheEntry,
} from "@/lib/lavorazioni/lavorazioni-infinite-cache";
import { flattenLavorazioneListPages } from "@/lib/domain/list-flatten";
import {
  applyOptimisticLavorazioneUpdate,
  buildConcludeOptimisticPatch,
  lavorazioniListCacheRows,
} from "@/src/lib/react-query/lavorazioni-optimistic-cache";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";

const ID = "33333333-3333-4333-8333-333333333333";
const key = buildLavorazioniListKey(normalizeLavorazioniFilters({ archived: false }), false);

function row(overrides: Partial<LavorazioneListRow> & { id?: string } = {}): LavorazioneListRow {
  const now = "2026-07-07T12:00:00.000Z";
  const id = overrides.id ?? ID;
  const { ...rest } = overrides;
  return {
    id,
    codice: "26-0100",
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

const seed = lavorazioniInfiniteSeedFromRows([row()]);
assert.equal(isLavorazioniInfiniteListCacheData(seed), true);
assert.equal(seed.pages[0]?.rows.length, 1);
assert.deepEqual(coerceLavorazioniListRowsFromCache(seed), [row()]);
assert.deepEqual(coerceLavorazioniListRowsFromCache([row()]), [row()]);

const qc = new QueryClient();
qc.setQueryData(key, [row()]);
repairLavorazioniInfiniteListCacheEntry(qc, key);
const repaired = qc.getQueryData(key);
assert.ok(isLavorazioniInfiniteListCacheData(repaired));
assert.ok(Array.isArray(repaired.pages));

qc.setQueryData(key, undefined);
applyOptimisticLavorazioneUpdate(qc, ID, { stato: "diagnosi" });
const optimistic = qc.getQueryData(key);
assert.ok(isLavorazioniInfiniteListCacheData(optimistic), "list-v2 optimistic must stay infinite-shaped");

{
  const activeKey = buildLavorazioniListKey(normalizeLavorazioniFilters({ archived: false }), false);
  const closedKey = buildLavorazioniListKey(normalizeLavorazioniFilters({ archived: true }), false);
  const otherId = "44444444-4444-4444-8444-444444444444";
  const completata = row({ stato: "completata" });
  const multiPage = {
    pages: [
      {
        rows: [row({ id: otherId, archived: true, stato: "completata" })],
        pageInfo: {
          hasNextPage: true,
          nextCursor: { created_at: "2026-07-07T12:00:00.000Z", id: otherId },
          totalEstimate: null,
        },
      },
      { rows: [], pageInfo: { hasNextPage: true, nextCursor: null, totalEstimate: null } },
      { rows: [], pageInfo: { hasNextPage: false, nextCursor: null, totalEstimate: null } },
    ],
    pageParams: [null, {}, {}],
  };
  const q = new QueryClient();
  q.setQueryData(activeKey, [completata]);
  q.setQueryData(closedKey, multiPage);
  applyOptimisticLavorazioneUpdate(q, ID, buildConcludeOptimisticPatch(completata));
  const rows = lavorazioniListCacheRows(q.getQueryData(closedKey));
  assert.equal(rows.filter((r) => r.id === ID).length, 1, "multi-page infinite: one insert only");
}

assert.deepEqual(
  flattenLavorazioneListPages([
    { rows: [row({ id: "a" }), row({ id: "b" })], pageInfo: { hasNextPage: true, nextCursor: null, totalEstimate: null } },
    { rows: [row({ id: "a" })], pageInfo: { hasNextPage: false, nextCursor: null, totalEstimate: null } },
  ]),
  [row({ id: "a" }), row({ id: "b" })],
);

console.log("lavorazioni-infinite-cache.test.ts OK");
