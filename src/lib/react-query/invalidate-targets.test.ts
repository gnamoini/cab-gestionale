import assert from "node:assert/strict";
import type { QueryClient } from "@tanstack/react-query";
import {
  collectQueryKeysForGestionaleTables,
  executeInvalidateGestionaleTables,
  GESTIONALE_TABLE_QUERY_KEYS,
} from "@/src/lib/react-query/invalidate-targets";
import { QK } from "@/src/lib/react-query/query-keys";
import {
  lavorazioniDomainQueryKeys,
  stableLavorazioniFiltersKey,
} from "@/src/services/domain/lavorazioni-domain.queries";
import {
  clearRecentLocalGestionaleMutations,
  filterTablesForRemoteCacheInvalidation,
  markRecentLocalGestionaleMutation,
  markRecentLocalGestionaleFromEntityIdByTable,
  markRecentLocalTableBurst,
  shouldSuppressRemoteCacheInvalidation,
} from "@/lib/sync/recent-local-mutation";

const lavKeys = collectQueryKeysForGestionaleTables(["lavorazioni", "pdf_artifacts"], {
  includePortal: false,
});
assert.equal(lavKeys.length, 2);
assert.ok(lavKeys.some((k) => JSON.stringify(k) === JSON.stringify(QK.lavorazioniQueries)));
assert.ok(lavKeys.some((k) => JSON.stringify(k) === JSON.stringify(QK.mezzoQueries)));

const mezziBatch = collectQueryKeysForGestionaleTables(["mezzi", "lavorazioni"]);
const mezziFps = mezziBatch.map((k) => JSON.stringify(k));
assert.equal(new Set(mezziFps).size, mezziFps.length);
assert.ok(mezziFps.includes(JSON.stringify(QK.lavorazioniQueries)));

const portalBatch = collectQueryKeysForGestionaleTables(["lavorazioni"], { includePortal: true });
assert.ok(portalBatch.some((k) => JSON.stringify(k) === JSON.stringify(QK.clientLavorazioniDetail)));

const expectedPortalKeys = [
  QK.lavorazioniQueries,
  QK.clientLavorazioniDetail,
  QK.clientLavorazioneDocuments,
  QK.clientLavorazionePhotos,
  QK.schede,
  QK.log,
] as const;
for (const key of expectedPortalKeys) {
  assert.ok(
    portalBatch.some((k) => JSON.stringify(k) === JSON.stringify(key)),
    `portal batch missing ${JSON.stringify(key)}`,
  );
}
assert.ok(portalBatch.some((k) => JSON.stringify(k) === JSON.stringify(QK.mezzoQueries)));
assert.equal(portalBatch.length, expectedPortalKeys.length + 1);

const portalInCorsoKey = lavorazioniDomainQueryKeys.list(
  stableLavorazioniFiltersKey({ archived: false, includeMezzo: true }),
  true,
);
const portalArchivioKey = lavorazioniDomainQueryKeys.list(
  stableLavorazioniFiltersKey({ archived: true, includeMezzo: true }),
  true,
);
assert.ok(portalInCorsoKey[0] === QK.lavorazioniQueries[0]);
assert.ok(portalArchivioKey[0] === QK.lavorazioniQueries[0]);
assert.notEqual(JSON.stringify(portalInCorsoKey), JSON.stringify(portalArchivioKey));

const noPortal = collectQueryKeysForGestionaleTables(["lavorazioni"], { includePortal: false });
assert.equal(noPortal.length, 2);

assert.ok(GESTIONALE_TABLE_QUERY_KEYS.scheda_lavorazione?.includes(QK.schede));

const settingsKeys = collectQueryKeysForGestionaleTables(["app_settings"], { includePortal: false });
assert.equal(settingsKeys.length, 1);
assert.ok(settingsKeys.some((k) => JSON.stringify(k) === JSON.stringify(QK.settings)));

const crossModule = collectQueryKeysForGestionaleTables(["scheda_lavorazione", "movimenti_ricambi"], {
  includePortal: false,
});
const lavKeysInCross = crossModule.filter((k) => JSON.stringify(k) === JSON.stringify(QK.lavorazioniQueries));
assert.equal(lavKeysInCross.length, 1);

clearRecentLocalGestionaleMutations();
markRecentLocalGestionaleMutation(["lavorazioni"], "lav-1");
assert.equal(shouldSuppressRemoteCacheInvalidation("lavorazioni", "lav-1"), true);
assert.equal(shouldSuppressRemoteCacheInvalidation("lavorazioni", "lav-2"), false);

clearRecentLocalGestionaleMutations();
markRecentLocalGestionaleFromEntityIdByTable(
  new Map([
    ["lavorazioni", "lav-map"],
    ["scheda_lavorazione", "sch-map"],
  ]),
);
assert.equal(shouldSuppressRemoteCacheInvalidation("lavorazioni", "lav-map"), true);
assert.equal(shouldSuppressRemoteCacheInvalidation("scheda_lavorazione", "sch-map"), true);

clearRecentLocalGestionaleMutations();
markRecentLocalTableBurst(["scheda_lavorazione"]);
assert.equal(shouldSuppressRemoteCacheInvalidation("scheda_lavorazione"), true);
assert.equal(filterTablesForRemoteCacheInvalidation(["scheda_lavorazione", "lavorazioni"]).length, 1);

type EntityInvalidateCall = { queryKey?: unknown; predicate?: unknown };
type EntityMockQueryClient = QueryClient & { _calls: EntityInvalidateCall[] };

function mockQueryClientForEntity(): EntityMockQueryClient {
  const calls: EntityInvalidateCall[] = [];
  return {
    invalidateQueries: (opts: EntityInvalidateCall) => {
      calls.push(opts);
      return Promise.resolve();
    },
    _calls: calls,
  } as EntityMockQueryClient;
}

const entityQc = mockQueryClientForEntity();
executeInvalidateGestionaleTables(entityQc, ["lavorazioni"], {
  entityIdByTable: new Map([["lavorazioni", "lav-entity-aware"]]),
  cabSyncEvents: [{ type: "entity_updated", entity: "lavorazioni", id: "lav-entity-aware", table: "lavorazioni" }],
});
assert.ok(entityQc._calls.some((c) => c.predicate != null));
assert.ok(
  entityQc._calls.some(
    (c) => c.queryKey && JSON.stringify(c.queryKey).includes("lav-entity-aware"),
  ),
);
assert.ok(!entityQc._calls.some((c) => JSON.stringify(c.queryKey) === JSON.stringify(QK.lavorazioniQueries)));

console.log("invalidate-targets.test.ts: ok");
