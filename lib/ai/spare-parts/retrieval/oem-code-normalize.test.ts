import assert from "node:assert/strict";
import { oemTripleFromRaw, toNormalizedCode, toSearchCode } from "@/lib/ai/spare-parts/retrieval/oem-code-normalize";

assert.equal(toNormalizedCode("  ab-12  "), "AB-12");
assert.equal(toSearchCode("AB-12"), "ABHYPH12");
assert.equal(toSearchCode("AB.12"), "ABDOT12");

const a = oemTripleFromRaw("X-100");
const b = oemTripleFromRaw("X.100");
assert.equal(a.partNumberSearch, "XHYPH100");
assert.equal(b.partNumberSearch, "XDOT100");

console.log("oem-code-normalize.test.ts OK");
