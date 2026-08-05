/**
 * Static gate: SSOT publication attesa da migrations + script verify.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  DEPRECATED_REALTIME_TABLES,
  parseExpectedRealtimePublicationTables,
} from "@/lib/production/expected-realtime-publication";
import { getBridgeTablesMissingFromPublication } from "@/lib/production/gestionale-realtime-bridge-tables";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const expected = parseExpectedRealtimePublicationTables();
assert.ok(expected.length >= 15, `expected publication tables: ${expected.length}`);
assert.ok(expected.includes("lavorazioni"));
assert.ok(expected.includes("magazzino_ricambi"));
assert.ok(expected.includes("user_permissions"));

for (const dep of DEPRECATED_REALTIME_TABLES) {
  assert.ok(!expected.includes(dep), `deprecated ${dep} must not be in expected set`);
}

const verifyScript = read("scripts/verify-supabase-publication.ts");
assert.match(verifyScript, /fetchRealtimePublicationTables/);
assert.match(verifyScript, /--mode=sanity/);

const workflow = read(".github/workflows/release-gate.yml");
assert.match(workflow, /ci:supabase:publication/);

const fetchSrc = read("lib/production/fetch-realtime-publication-tables.ts");
assert.match(fetchSrc, /pg_publication_tables/);
assert.match(fetchSrc, /SUPABASE_ACCESS_TOKEN/);
assert.match(fetchSrc, /api\.supabase\.com/);

assert.equal(
  getBridgeTablesMissingFromPublication().length,
  0,
  "GestionaleRealtimeBridge tables must be covered by supabase_realtime publication",
);

console.log(`supabase-publication-gate.test.ts OK (${expected.length} expected tables)`);
