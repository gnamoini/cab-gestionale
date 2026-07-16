import assert from "node:assert/strict";
import { mergeAuditDiffPayload, shouldBatchModificaLogUpdate } from "@/src/services/internal/log-modifiche-batcher";

assert.equal(shouldBatchModificaLogUpdate("UPDATE", "magazzino_ricambi"), true);
assert.equal(shouldBatchModificaLogUpdate("UPDATE", "movimenti_ricambi"), true);
assert.equal(shouldBatchModificaLogUpdate("UPDATE", "lavorazioni"), false);
assert.equal(shouldBatchModificaLogUpdate("UPDATE", "scheda_lavorazione"), false);
assert.equal(shouldBatchModificaLogUpdate("CREATE", "magazzino_ricambi"), false);

const merged = mergeAuditDiffPayload(
  { before: { scorta: 1 }, after: { scorta: 2 } },
  { before: { scorta: 2 }, after: { scorta: 5 } },
);
assert.deepEqual(merged, { before: { scorta: 1 }, after: { scorta: 5 } });

console.log("log-modifiche-batcher.test.ts OK");
