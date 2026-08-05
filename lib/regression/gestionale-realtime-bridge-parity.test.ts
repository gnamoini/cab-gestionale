/**
 * Static gate: ogni tabella sottoscritta dal bridge deve essere in publication (migrations SSOT).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  getBridgeTablesMissingFromPublication,
  getGestionaleRealtimeBridgeTables,
} from "@/lib/production/gestionale-realtime-bridge-tables";
import { parseExpectedRealtimePublicationTables } from "@/lib/production/expected-realtime-publication";

const ROOT = process.cwd();

const missing = getBridgeTablesMissingFromPublication();
assert.equal(
  missing.length,
  0,
  `bridge tables missing from supabase_realtime publication: ${missing.join(", ")}`,
);

const bridgeTables = getGestionaleRealtimeBridgeTables();
assert.ok(bridgeTables.includes("magazzino_ricambi"));
assert.ok(bridgeTables.includes("movimenti_ricambi"));

const migration = fs.readFileSync(
  path.join(ROOT, "supabase/migrations/20260804120000_gestionale_realtime_bridge_gaps.sql"),
  "utf8",
);
for (const table of [
  "ordini_fornitori",
  "inventory_documents",
  "invoices",
  "pdf_artifacts",
]) {
  assert.match(migration, new RegExp(`add table public\\.${table}`));
}

const expected = parseExpectedRealtimePublicationTables();
for (const table of bridgeTables) {
  assert.ok(expected.includes(table), `${table} must be in expected publication after migrations`);
}

console.log(
  `gestionale-realtime-bridge-parity.test.ts OK (${bridgeTables.length} bridge tables, publication aligned)`,
);
