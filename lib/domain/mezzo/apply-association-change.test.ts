import assert from "node:assert/strict";
import {
  ASSOCIATION_FIELDS_REQUIRE_DEDICATED_PATH,
  mezzoUpdateTouchesAssociationFields,
} from "@/lib/domain/mezzo/mezzo-association";

// Simula guard mezziService.update: patch con cliente → rifiutata
function simulateMezzoUpdateGuard(patch: Record<string, unknown>): string | null {
  if (mezzoUpdateTouchesAssociationFields(patch)) {
    return ASSOCIATION_FIELDS_REQUIRE_DEDICATED_PATH;
  }
  return null;
}

const rejected = simulateMezzoUpdateGuard({ cliente: "Nuovo Cliente" });
assert.equal(rejected, ASSOCIATION_FIELDS_REQUIRE_DEDICATED_PATH);

const allowed = simulateMezzoUpdateGuard({ targa: "AA000BB" });
assert.equal(allowed, null);

const rejectedMeta = simulateMezzoUpdateGuard({ meta: { cantiere: "Sud" } });
assert.equal(rejectedMeta, ASSOCIATION_FIELDS_REQUIRE_DEDICATED_PATH);

console.log("apply-association-change.test.ts: OK");
