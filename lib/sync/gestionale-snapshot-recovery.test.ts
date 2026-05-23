import assert from "node:assert/strict";
import { schedeLogicalKindFromRow } from "@/lib/sync/cab-sync-bus";
import { OPERATIONAL_DOMAINS } from "@/lib/sync/gestionale-snapshot-recovery";
import { collectQueryKeysForGestionaleTables } from "@/src/lib/react-query/invalidate-targets";
import { QK } from "@/src/lib/react-query/query-keys";

assert.equal(schedeLogicalKindFromRow({ tipo: "ingresso" }), "schede_ingresso");
assert.equal(schedeLogicalKindFromRow({ tipo: "intervento" }), "schede_lavorazione");
assert.equal(schedeLogicalKindFromRow({ tipo: "ricambi" }), "schede_ricambi");
assert.equal(schedeLogicalKindFromRow({ tipo: "unknown" }), null);

const crossBatch = collectQueryKeysForGestionaleTables(
  [...OPERATIONAL_DOMAINS.schede, ...OPERATIONAL_DOMAINS.ricambi],
  { includePortal: false },
);
const lavCount = crossBatch.filter((k) => JSON.stringify(k) === JSON.stringify(QK.lavorazioniQueries)).length;
assert.equal(lavCount, 1, "lavorazioniQueries deduped in cross-module batch");

console.log("gestionale-snapshot-recovery.test.ts: ok");
