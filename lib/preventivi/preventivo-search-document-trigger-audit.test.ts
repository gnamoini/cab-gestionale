import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const toolbarMigration = readFileSync(
  join(ROOT, "supabase/migrations/20261024120100_toolbar_search_v2.sql"),
  "utf8",
);
const globalMigration = readFileSync(
  join(ROOT, "supabase/migrations/20261402120000_preventivo_search_document_global.sql"),
  "utf8",
);

// Preventivi: refresh diretto su insert/update dettagli
assert.match(toolbarMigration, /trg_preventivi_search_document/);
assert.match(toolbarMigration, /update of cliente, dettagli, mezzo_id/);

// Mezzi → lavorazioni (preesistente)
assert.match(toolbarMigration, /trg_mezzi_enqueue_lavorazioni_search/);
assert.match(toolbarMigration, /enqueue_search_rebuild\('lavorazione'/);

// Mezzi → preventivi (nuovo)
assert.match(globalMigration, /trg_mezzi_enqueue_preventivi_search/);
assert.match(globalMigration, /enqueue_search_rebuild\('preventivo'/);

// Lavorazioni → preventivi (nuovo)
assert.match(globalMigration, /trg_lavorazioni_enqueue_preventivi_search/);
assert.match(
  globalMigration,
  /where pr\.lavorazione_id = new\.id/,
  "lavorazione update enqueues linked preventivi",
);

// Queue processor gestisce preventivo
assert.match(toolbarMigration, /rec\.entity_type = 'preventivo'/);
assert.match(toolbarMigration, /refresh_preventivo_search_document/);

console.log("preventivo-search-document-trigger-audit.test.ts OK");
