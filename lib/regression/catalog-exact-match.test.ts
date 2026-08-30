import assert from "node:assert/strict";
import { toSearchCode } from "@/lib/ai/spare-parts/retrieval/oem-code-normalize";
import { buildCatalogSearchQuery, catalogPartMatches } from "@/lib/ai/spare-parts/retrieval/catalog-text-match";

const code = "ABC-12345";
const searchCode = toSearchCode(code);
assert.equal(searchCode, "ABCHYPH12345");

const { searchTokens } = buildCatalogSearchQuery({
  normalizedDescription: "filtro olio",
  visibleCodes: [code],
});
assert.ok(searchTokens.includes("abc-12345") || searchTokens.includes("abc12345"));

const haystack = `Filtro olio motore ${code}`;
const score = 1;
assert.equal(catalogPartMatches(score, haystack, searchTokens), true);

console.log("catalog-exact-match.test.ts OK");
