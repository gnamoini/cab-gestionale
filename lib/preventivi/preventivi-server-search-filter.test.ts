import assert from "node:assert/strict";
import { preventivoSearchQueryFromSuggestion } from "@/lib/preventivi/preventivi-list-ui-filters";
import { applyPreventiviServerSearchFilter } from "@/lib/preventivi/preventivi-server-search-filter";

assert.equal(preventivoSearchQueryFromSuggestion("2025-042 · Off · ACME Srl"), "2025-042");
assert.equal(preventivoSearchQueryFromSuggestion("solo-numero"), "solo-numero");

const calls: string[] = [];
const mockQ = {
  or(filter: string) {
    calls.push(filter);
    return this;
  },
};

applyPreventiviServerSearchFilter(mockQ, "2025-042");
assert.equal(calls.length, 1);
assert.match(calls[0]!, /search_document\.ilike\.%2025042%/);
assert.match(calls[0]!, /dettagli->>numero\.ilike\.%2025-042%/);

console.log("preventivi-server-search-filter.test.ts OK");
