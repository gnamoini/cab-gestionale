/**
 * FASE 6 — numbering engine gates (static audit).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const FASE6 = path.join(ROOT, "supabase/migrations/20270210120000_fase6_document_numbering_engine.sql");
const MANIFEST = path.join(ROOT, "docs/security/rpc-access-manifest.json");

assert.ok(fs.existsSync(FASE6), "FASE 6 migration missing");

const sql = fs.readFileSync(FASE6, "utf8");
assert.match(sql, /create table if not exists public\.document_number_sequences/);
assert.match(sql, /allocate_document_number/);
assert.match(sql, /revoke all on function public\.allocate_document_number/i);
assert.doesNotMatch(sql, /grant execute on function public\.allocate_document_number/i);
assert.match(sql, /drop function if exists public\.allocate_invoice_number/i);
assert.match(sql, /drop function if exists public\.assign_ddt_numero/i);
assert.match(sql, /drop table if exists public\.invoice_number_sequences/i);
assert.match(sql, /drop table if exists public\.ddt_numero_counters/i);
assert.doesNotMatch(sql, /coalesce\(max\(numero\)/i);

const manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8")) as {
  entries: Record<string, { classification: string; grants: string[] }>;
};

assert.ok(
  manifest.entries["allocate_document_number(p_document_type text, p_fiscal_year integer, p_series text, p_company_id uuid)"],
  "manifest entry for allocate_document_number",
);
assert.equal(
  manifest.entries["allocate_document_number(p_document_type text, p_fiscal_year integer, p_series text, p_company_id uuid)"]
    .classification,
  "INTERNAL_ONLY",
);
assert.deepEqual(
  manifest.entries["allocate_document_number(p_document_type text, p_fiscal_year integer, p_series text, p_company_id uuid)"]
    .grants,
  [],
);
assert.equal(manifest.entries["allocate_invoice_number(p_document_type text, p_series text, p_year integer)"], undefined);
assert.equal(manifest.entries["assign_ddt_numero(p_anno integer, p_serie text)"], undefined);

const formatTs = fs.readFileSync(
  path.join(ROOT, "lib/document-numbering/format-document-number.ts"),
  "utf8",
);
assert.match(formatTs, /formatDocumentNumber/);
assert.match(formatTs, /DDT \$\{seriesNorm\}/);

console.log("document-numbering-gate.test.ts OK");
