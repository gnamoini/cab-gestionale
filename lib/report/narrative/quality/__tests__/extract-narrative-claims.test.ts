import assert from "node:assert/strict";
import { extractNarrativeClaims } from "@/lib/report/narrative/quality/extract-narrative-claims";

function hasClaim(text: string, normalized: number): boolean {
  return extractNarrativeClaims(text).some((c) => c.normalized === normalized);
}

function hasNoClaims(text: string): boolean {
  return extractNarrativeClaims(text).length === 0;
}

assert.ok(hasNoClaims("entro il 2026"), "year is not a claim");
assert.ok(hasNoClaims("mezzo 1234"), "mezzo id is not a claim");
assert.ok(hasClaim("circa 5 giorni", 5), "circa 5 is a claim");
assert.ok(hasClaim("-12%", -12), "-12% is a claim");
assert.ok(hasClaim("€ 1.250,50", 1250.5), "currency is a claim");
assert.ok(hasClaim("10.98 euro da incassare", 10.98), "dot-decimal absolute is a claim");

console.log("extract-narrative-claims.test.ts OK");
