import assert from "node:assert/strict";
import { buildMergePlan } from "@/lib/settings/rename-engine/merge-plan";

let threw = false;
try {
  buildMergePlan({ kind: "cliente", canonicalLabel: "CAT", absorbedLabel: "Caterpillar" });
} catch {
  threw = true;
}
assert.equal(threw, true);

console.log("settings-merge-engine-stub.test.ts OK");
