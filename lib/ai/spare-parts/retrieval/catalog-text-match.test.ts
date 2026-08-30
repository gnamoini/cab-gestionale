import assert from "node:assert/strict";
import {
  catalogPartMatches,
  catalogSearchTokens,
  scoreCatalogPartMatch,
} from "@/lib/ai/spare-parts/retrieval/catalog-text-match";

assert.deepEqual(catalogSearchTokens("filtro olio motore", "pompa"), ["filtro", "olio", "motore", "pompa"]);
assert.equal(
  scoreCatalogPartMatch("filtro olio motore 12345", ["filtro", "olio"], [], "filtro olio"),
  0.95,
);
assert.ok(catalogPartMatches(scoreCatalogPartMatch("cuscinetto asse", ["filtro"], [], "filtro olio"), "cuscinetto asse", ["filtro"]) === false);
assert.ok(catalogPartMatches(scoreCatalogPartMatch("filtro aria cabina", ["filtro"], [], "filtro"), "filtro aria cabina", ["filtro"]));
assert.ok(
  catalogPartMatches(scoreCatalogPartMatch("vetro cabina lato dx", ["vetro", "laterale", "cabina"], [], "vetro laterale cabina"), "vetro cabina lato dx", ["vetro", "laterale", "cabina"]),
);

console.log("ai/spare-parts/retrieval/catalog-text-match.test.ts OK");
