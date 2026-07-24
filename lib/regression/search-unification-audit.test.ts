import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { listSearchDomains, getSearchConfig } from "@/lib/search/registry";

const ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

const filterFiles = [
  "lib/lavorazioni/lavorazioni-list-ui-filters.ts",
  "lib/preventivi/preventivi-list-ui-filters.ts",
  "lib/magazzino/magazzino-list-ui-filters.ts",
  "lib/fatturazione/fatturazione-list-ui-filters.ts",
  "lib/ordini-fornitori/ordine-fornitore-list-ui-filters.ts",
  "lib/documenti/documenti-list-ui-filters.ts",
];

for (const f of filterFiles) {
  const src = read(f);
  assert.doesNotMatch(src, /query\.trim\(\)\.toLowerCase\(\)/, `${f} must use lib/search match`);
  assert.match(src, /matchSearchString|[A-Za-z]+RowMatchesGlobalSearch/, `${f} must use search engine`);
}

const lavorazioniView = read("components/gestionale/lavorazioni/lavorazioni-view.tsx");
assert.match(lavorazioniView, /useGestionaleListSearch/, "lavorazioni-view uses shared search hook");

const magazzinoView = read("components/gestionale/magazzino/magazzino-view.tsx");
assert.match(magazzinoView, /useGestionaleListSearch/, "magazzino-view uses shared search hook");

const preventiviView = read("components/preventivi/preventivi-view.tsx");
assert.match(preventiviView, /useGestionaleListSearch/, "preventivi-view uses shared search hook");

const documentiView = read("components/gestionale/documenti/documenti-view.tsx");
assert.match(documentiView, /useGestionaleListSearch/, "documenti-view uses shared search hook");

const migration = read("supabase/migrations/20261024120100_toolbar_search_v2.sql");
assert.match(migration, /search_document/, "search migration defines search_document");
assert.match(migration, /generated always as/i, "search_vector is generated from search_document");
assert.match(migration, /search_document_rebuild_queue/, "deferred rebuild queue exists");

for (const domain of listSearchDomains()) {
  const cfg = getSearchConfig(domain);
  assert.ok(cfg.executionMode, `domain ${domain} has executionMode`);
}

console.log("search-unification-audit.test.ts OK");
