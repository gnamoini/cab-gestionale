import assert from "node:assert/strict";
import { validateBusinessRules } from "@/lib/accounting/einvoice";
import { buildCanonicalFromSnapshot } from "@/lib/fatturazione/einvoice/build-canonical-from-snapshot";
import { baseSnapshot } from "@/lib/accounting/einvoice/__tests__/einvoice-fixture";

const ok = validateBusinessRules(buildCanonicalFromSnapshot("1", "2", baseSnapshot("TD01")));
assert.equal(ok.valid, true);

const bad = validateBusinessRules(buildCanonicalFromSnapshot("1", "2", baseSnapshot("TD17")));
assert.equal(bad.valid, false);
if (!bad.valid) {
  assert.ok(bad.errors.some((e) => e.code === "DOCUMENT_TYPE_NOT_ENABLED_FOR_CAB"));
}

const noDest = buildCanonicalFromSnapshot("1", "2", baseSnapshot("TD01", {
  cliente: { ragione_sociale: "X", indirizzo: "a", cap: "1", comune: "c", provincia: "RM" },
}));
const destFail = validateBusinessRules(noDest);
assert.equal(destFail.valid, false);

console.log("business-rules.test.ts OK");
