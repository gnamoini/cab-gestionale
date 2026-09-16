import assert from "node:assert/strict";
import {
  buildLavorazioneRowByIdMap,
  resolveMezzoIdsFromWorkOrderSelection,
} from "@/lib/lavorazioni/lavorazioni-label-mezzo-ids";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";

function mockRow(id: string, mezzoId: string | null): LavorazioneListRow {
  return {
    id,
    mezzo_id: mezzoId,
    mezzo: null,
  } as LavorazioneListRow;
}

const rows = [
  mockRow("lav-1", "m-25"),
  mockRow("lav-2", "m-25"),
  mockRow("lav-3", "m-31"),
  mockRow("lav-4", null),
  mockRow("lav-5", "m-40"),
];
const byId = buildLavorazioneRowByIdMap(rows);

assert.deepEqual(
  resolveMezzoIdsFromWorkOrderSelection(["lav-1"], byId).mezzoIds,
  ["m-25"],
  "caso A: una lavorazione → un mezzo",
);

assert.deepEqual(
  resolveMezzoIdsFromWorkOrderSelection(["lav-1", "lav-3", "lav-5"], byId).mezzoIds,
  ["m-25", "m-31", "m-40"],
  "caso B: più lavorazioni, mezzi diversi",
);

assert.deepEqual(
  resolveMezzoIdsFromWorkOrderSelection(["lav-1", "lav-2", "lav-3"], byId).mezzoIds,
  ["m-25", "m-31"],
  "caso C: dedup stesso mezzo",
);

const mix = resolveMezzoIdsFromWorkOrderSelection(["lav-1", "lav-4", "lav-3"], byId);
assert.equal(mix.skippedWithoutMezzo, 1, "caso E: conta senza mezzo");
assert.deepEqual(mix.mezzoIds, ["m-25", "m-31"]);

const order = resolveMezzoIdsFromWorkOrderSelection(["lav-3", "lav-1"], byId);
assert.deepEqual(order.mezzoIds, ["m-31", "m-25"], "ordine selezione");

const unknown = resolveMezzoIdsFromWorkOrderSelection(["lav-missing", "lav-1"], byId);
assert.equal(unknown.skippedUnknownWorkOrder, 1);
assert.deepEqual(unknown.mezzoIds, ["m-25"]);

console.log("lavorazioni-label-mezzo-ids.test.ts OK");
