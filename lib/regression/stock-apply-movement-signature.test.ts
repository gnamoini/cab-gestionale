import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const deliveryMigration = fs.readFileSync(
  path.join(ROOT, "supabase/migrations/20261219120000_ordini_fornitori_in_consegna_delivery.sql"),
  "utf8",
);

const singleSignatureMigration = fs.readFileSync(
  path.join(ROOT, "supabase/migrations/20261224120000_stock_apply_movement_single_signature.sql"),
  "utf8",
);

const stockEngine = fs.readFileSync(path.join(ROOT, "lib/magazzino/stock-engine.server.ts"), "utf8");

const debouncedHook = fs.readFileSync(
  path.join(ROOT, "src/hooks/gestionale/use-debounced-inventory-quantity.ts"),
  "utf8",
);

const editModal = fs.readFileSync(
  path.join(ROOT, "components/gestionale/magazzino/ricambio-edit-modal.tsx"),
  "utf8",
);

const errorMessages = fs.readFileSync(
  path.join(ROOT, "src/utils/gestionale-error-messages.ts"),
  "utf8",
);

const adjustRoute = fs.readFileSync(
  path.join(ROOT, "app/api/magazzino/stock/adjust/route.ts"),
  "utf8",
);

// Migration fix: drop legacy 9-arg overload
assert.match(
  singleSignatureMigration,
  /drop function if exists public\.stock_apply_movement\(\s*uuid, numeric, bigint, uuid, text, text, boolean, uuid, jsonb\s*\)/i,
  "single-signature migration must drop 9-arg overload",
);

assert.match(
  singleSignatureMigration,
  /grant execute on function public\.stock_apply_movement\(\s*uuid, numeric, bigint, uuid, text, text, boolean, uuid, jsonb, uuid, uuid, text\s*\)/i,
  "GRANT must target 12-arg canonical signature",
);

// Delivery migration added 12-arg body (historical)
assert.match(deliveryMigration, /p_ordine_fornitore_id uuid default null/);

// mapRpcError: no blanket 23505 → version conflict
assert.doesNotMatch(stockEngine, /stock_version_conflict.*\|\| error\.code === "23505"/);
assert.match(stockEngine, /msg\.includes\("stock_version_conflict"\)/);

// resolveServerQuantity trusts entity even at zero
assert.match(debouncedHook, /if \(entity\) return entity\.quantita/);
assert.doesNotMatch(debouncedHook, /entity\.quantita > 0 \|\| entity\.stockVersion > 0/);

// Edit modal uses pipeline with 409 retry
assert.match(editModal, /runStockAdjustPipeline/);
assert.doesNotMatch(editModal, /stockAdjustFetch/);

// Stock-specific humanized messages
assert.match(errorMessages, /STOCK_VERSION_CONFLICT_PATTERN/);
assert.match(errorMessages, /STOCK_ADJUST_FAILED_PATTERN/);

// API guard
assert.match(adjustRoute, /verifyServerPageWrite\("magazzino"\)/);

console.log("stock-apply-movement-signature.test.ts OK");
