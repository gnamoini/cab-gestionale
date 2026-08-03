/**
 * Audit statico: entity-scoped invalidation copre superfici portale + query key shape.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  lavorazioniListCountQueryKey,
  lavorazioniListQueryKey,
} from "@/lib/lavorazioni/lavorazioni-list-query-keys";
import {
  CLIENT_PORTAL_ARCHIVIO_COUNT_FILTERS,
  CLIENT_PORTAL_INCORSO_FILTERS,
} from "@/lib/lavorazioni/client-portal-prefetch-filters";

const ROOT = resolve(import.meta.dirname ?? __dirname, "..", "..");
const invalidateTargetsSrc = readFileSync(resolve(ROOT, "src/lib/react-query/invalidate-targets.ts"), "utf8");

assert.match(invalidateTargetsSrc, /isLavorazioniListCountQueryKey/, "count keys invalidated on entity-scoped lavorazioni");
assert.match(invalidateTargetsSrc, /QK\.schede/, "schede invalidated on entity-scoped lavorazioni");
assert.match(invalidateTargetsSrc, /QK\.log/, "log invalidated on entity-scoped lavorazioni");
assert.match(invalidateTargetsSrc, /clientLavorazioneDocuments/, "documents invalidated on entity-scoped lavorazioni");
assert.match(invalidateTargetsSrc, /clientLavorazionePhotos/, "photos invalidated on entity-scoped lavorazioni");
assert.match(
  invalidateTargetsSrc,
  /CLIENT_PORTAL_QUERY_KEYS/,
  "portal query keys collected on portal sync tables",
);

const portalInCorsoKey = lavorazioniListQueryKey(CLIENT_PORTAL_INCORSO_FILTERS, true);
const portalCountKey = lavorazioniListCountQueryKey(CLIENT_PORTAL_ARCHIVIO_COUNT_FILTERS, true);

assert.ok(portalInCorsoKey.at(-1) === "portal", "inCorso list key uses portal suffix");
assert.ok(portalCountKey.at(-1) === "count", "archivio count key shape");
assert.notEqual(
  JSON.stringify(portalInCorsoKey),
  JSON.stringify(lavorazioniListQueryKey(CLIENT_PORTAL_INCORSO_FILTERS, false)),
  "portal vs ops list keys differ",
);

assert.ok(invalidateTargetsSrc.includes("QK.clientLavorazioniDetail"), "detail key invalidated");
assert.ok(invalidateTargetsSrc.includes("QK.clientLavorazioneDocuments"), "documents key invalidated");
assert.ok(invalidateTargetsSrc.includes("QK.clientLavorazionePhotos"), "photos key invalidated");
assert.ok(invalidateTargetsSrc.includes("QK.lavorazioniQueries"), "lavorazioni list prefix invalidated");
assert.ok(invalidateTargetsSrc.includes("QK.schede"), "schede invalidated");
assert.ok(invalidateTargetsSrc.includes("QK.log"), "log invalidated");

console.log("client-portal-invalidation-coverage.test.ts OK");
