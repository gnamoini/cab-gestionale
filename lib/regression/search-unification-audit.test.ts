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

const listViews = [
  "components/gestionale/lavorazioni/lavorazioni-view.tsx",
  "components/gestionale/magazzino/magazzino-view.tsx",
  "components/preventivi/preventivi-view.tsx",
  "components/gestionale/documenti/documenti-view.tsx",
  "components/gestionale/mezzi/mezzi-view.tsx",
  "components/ordini-fornitori/ordini-fornitori-view.tsx",
];

for (const viewPath of listViews) {
  const src = read(viewPath);
  assert.match(src, /GestionaleListSearchController/, `${viewPath} uses search island controller`);
  assert.doesNotMatch(src, /useGestionaleListSearch\s*\(/, `${viewPath} must not call useGestionaleListSearch in parent`);
  assert.doesNotMatch(src, /\bsearchInput\b/, `${viewPath} must not own searchInput state`);
}

const lavorazioniView = read("components/gestionale/lavorazioni/lavorazioni-view.tsx");
assert.match(lavorazioniView, /serverSearchPart/, "lavorazioni search shared across attive and archivio queries");
assert.match(
  lavorazioniView,
  /hasPageClientFilters[\s\S]*setArchivioSectionOpen\(true\)/,
  "lavorazioni auto-expands archivio when page filters active",
);

const magazzinoView = read("components/gestionale/magazzino/magazzino-view.tsx");
assert.match(magazzinoView, /skipSearchFilter: serverSearchActive/, "magazzino avoids double search gate when server filtered");
assert.match(magazzinoView, /compareSearchRelevance/, "magazzino relevance sort");

const preventiviView = read("components/preventivi/preventivi-view.tsx");
assert.match(preventiviView, /onSearchAppliedChange/, "preventivi lifts searchApplied via island callback");

const settingsSearch = read("lib/settings/settings-list-search.ts");
assert.match(settingsSearch, /scoreSearchDocument/, "settings uses unified search scoring");

const serverFilter = read("lib/search/server-search-filter.ts");
assert.match(serverFilter, /collapseSearchKey|buildServerSearchTokenFilter/, "server filter uses collapse tokens");
assert.match(serverFilter, /applyServerSearchDocumentFilter/, "server filter helper exported");

const fieldToken = read("lib/search/field-token.ts");
assert.match(fieldToken, /formatFieldSearchToken/, "field marker tokens defined");

const controller = read("components/gestionale/gestionale-list-search-controller.tsx");
assert.match(controller, /useGestionaleListSearch/, "controller owns list search hook");

const migration = read("supabase/migrations/20261111120000_search_collapse_field_tokens.sql");
assert.match(migration, /collapse_search_text/, "collapse migration defines collapse_search_text");
assert.match(migration, /format_field_search_token/, "collapse migration defines field tokens");
assert.match(migration, /search_document_matches_tokens/, "collapse migration defines match helper");

const legacyMigration = read("supabase/migrations/20261024120100_toolbar_search_v2.sql");
assert.match(legacyMigration, /search_document/, "search migration defines search_document");
assert.match(legacyMigration, /generated always as/i, "search_vector is generated from search_document");
assert.match(legacyMigration, /search_document_rebuild_queue/, "deferred rebuild queue exists");

const auditScript = read("supabase/scripts/search-collapse-audit.sql");
assert.match(auditScript, /collapse_search_text/, "audit script references collapse");

const explainScript = read("supabase/scripts/search-explain-audit.sql");
assert.match(explainScript, /explain \(analyze/i, "explain audit script present");

for (const domain of listSearchDomains()) {
  const cfg = getSearchConfig(domain);
  assert.ok(cfg.executionMode, `domain ${domain} has executionMode`);
}

console.log("search-unification-audit.test.ts OK");
