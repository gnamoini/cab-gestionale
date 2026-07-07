import assert from "node:assert/strict";
import { QueryClient } from "@tanstack/react-query";
import { buildLavorazioniListKey } from "@/lib/react-query/build-list-keys";
import { normalizeLavorazioniFilters } from "@/lib/domain/normalize-filters";
import {
  isLavorazioniInfiniteListCacheData,
  lavorazioniInfiniteSeedFromRows,
  repairLavorazioniInfiniteListCacheEntry,
} from "@/lib/lavorazioni/lavorazioni-infinite-cache";
import { applyOptimisticLavorazioneUpdate } from "@/src/lib/react-query/lavorazioni-optimistic-cache";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";

const ID = "33333333-3333-4333-8333-333333333333";
const key = buildLavorazioniListKey(normalizeLavorazioniFilters({ archived: false }), false);

function row(): LavorazioneListRow {
  const now = "2026-07-07T12:00:00.000Z";
  return {
    id: ID,
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
  };
}

const seed = lavorazioniInfiniteSeedFromRows([row()]);
assert.equal(isLavorazioniInfiniteListCacheData(seed), true);
assert.equal(seed.pages[0]?.rows.length, 1);

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

console.log("lavorazioni-infinite-cache.test.ts OK");
