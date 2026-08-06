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
assert.match(lavorazioniView, /serverSearchPart/, "lavorazioni search shared across attive and archivio queries");
assert.match(lavorazioniView, /\.\.\.serverSearchPart[\s\S]*archived: true/, "archivio query receives server search");
assert.match(
  lavorazioniView,
  /hasPageClientFilters[\s\S]*setArchivioSectionOpen\(true\)/,
  "lavorazioni auto-expands archivio when page filters active",
);

const magazzinoView = read("components/gestionale/magazzino/magazzino-view.tsx");
assert.match(magazzinoView, /useGestionaleListSearch/, "magazzino-view uses shared search hook");
assert.match(magazzinoView, /skipSearchFilter: serverSearchActive/, "magazzino avoids double search gate when server filtered");
assert.match(magazzinoView, /compareSearchRelevance/, "magazzino relevance sort");

const preventiviView = read("components/preventivi/preventivi-view.tsx");
assert.match(preventiviView, /useGestionaleListSearch/, "preventivi-view uses shared search hook");

const documentiView = read("components/gestionale/documenti/documenti-view.tsx");
assert.match(documentiView, /useGestionaleListSearch/, "documenti-view uses shared search hook");

const mezziView = read("components/gestionale/mezzi/mezzi-view.tsx");
assert.match(mezziView, /useGestionaleListSearch/, "mezzi-view uses shared search hook");

const settingsSearch = read("lib/settings/settings-list-search.ts");
assert.match(settingsSearch, /scoreSearchDocument/, "settings uses unified search scoring");

const serverFilter = read("lib/search/server-search-filter.ts");
assert.match(serverFilter, /collapseSearchKey|buildServerSearchTokenFilter/, "server filter uses collapse tokens");
assert.match(serverFilter, /applyServerSearchDocumentFilter/, "server filter helper exported");

const fieldToken = read("lib/search/field-token.ts");
assert.match(fieldToken, /formatFieldSearchToken/, "field marker tokens defined");

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

for (const domain of listSearchDomains()) {
  const cfg = getSearchConfig(domain);
  assert.ok(cfg.executionMode, `domain ${domain} has executionMode`);
}

console.log("search-unification-audit.test.ts OK");
