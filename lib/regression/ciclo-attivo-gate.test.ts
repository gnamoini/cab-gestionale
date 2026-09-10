import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function walk(dir: string, acc: string[] = []): string[] {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, acc);
    else if (/\.(ts|tsx|sql)$/.test(ent.name)) acc.push(p);
  }
  return acc;
}

const scanDirs = [
  "lib/fatturazione",
  "components/fatturazione",
  "src/services/invoices.service.ts",
  "supabase/migrations/20270212120000_fase8_fatturazione_ciclo_attivo_schema.sql",
  "supabase/migrations/20270212120100_fase8_fatturazione_ciclo_attivo_rpc.sql",
];

const files: string[] = [];
for (const rel of scanDirs) {
  const abs = path.join(ROOT, rel);
  if (fs.statSync(abs).isDirectory()) files.push(...walk(abs));
  else files.push(abs);
}

for (const file of files) {
  const src = fs.readFileSync(file, "utf8");
  const rel = path.relative(ROOT, file).replace(/\\/g, "/");
  assert.doesNotMatch(src, /unoerp/i, `${rel} must not mention UnoERP`);
  if (rel.includes("20270212")) {
    assert.doesNotMatch(src, /coalesce\s*\(\s*max\s*\(\s*numero/i, `${rel} no MAX(numero)+1`);
  }
}

assert.doesNotMatch(
  fs.readFileSync(path.join(ROOT, "lib/fatturazione/ciclo-attivo/create-invoice-from-sources.server.ts"), "utf8"),
  /\?\?\s*22/,
);
assert.doesNotMatch(
  fs.readFileSync(path.join(ROOT, "supabase/migrations/20270212120100_fase8_fatturazione_ciclo_attivo_rpc.sql"), "utf8"),
  /\.from\(\s*['"]accounting_entries['"]\s*\)/,
);
assert.match(
  fs.readFileSync(path.join(ROOT, "supabase/migrations/20270212120100_fase8_fatturazione_ciclo_attivo_rpc.sql"), "utf8"),
  /accounting_reverse_entry/,
);
assert.match(
  fs.readFileSync(path.join(ROOT, "supabase/migrations/20270212120100_fase8_fatturazione_ciclo_attivo_rpc.sql"), "utf8"),
  /handle_sdi_rejected/,
);
assert.doesNotMatch(
  fs.readFileSync(path.join(ROOT, "supabase/migrations/20270212120100_fase8_fatturazione_ciclo_attivo_rpc.sql"), "utf8"),
  /create_credit_note_from_invoice\(p_invoice_id\)[\s\S]{0,200}SDI_REJECTED/,
);

const emitSql = fs.readFileSync(
  path.join(ROOT, "supabase/migrations/20270212120100_fase8_fatturazione_ciclo_attivo_rpc.sql"),
  "utf8",
);
assert.match(emitSql, /COMPANY_FISCAL_PROFILE_MISSING/);
assert.match(emitSql, /ACCOUNTING_PERIOD_CLOSED/);
assert.match(emitSql, /allocate_document_number/);
assert.match(emitSql, /invoice_snapshot/);
assert.match(emitSql, /invoice-emit:/);
assert.match(emitSql, /invoice-emit-reverse:/);
assert.match(emitSql, /invoice_create_payment_schedule/);
assert.match(emitSql, /FISCAL_DOCUMENT_NOT_VALIDLY_ISSUED/);
assert.match(emitSql, /accounting_reversed/);
assert.match(emitSql, /open_items_neutralized/);
assert.match(emitSql, /fatturazione\.sdi_rejected/);
assert.match(emitSql, /fatturazione\.sdi_delivered/);
assert.match(emitSql, /fatturazione\.sdi_delivery_failed/);
assert.match(emitSql, /request\.jwt\.claim\.role/);
assert.match(emitSql, /create_debit_note_from_invoice/);
assert.doesNotMatch(emitSql, /create_credit_note_from_invoice\(p_invoice_id\)[\s\S]{0,80}handle_sdi_rejected/);

const schemaSql = fs.readFileSync(
  path.join(ROOT, "supabase/migrations/20270212120000_fase8_fatturazione_ciclo_attivo_schema.sql"),
  "utf8",
);
assert.match(schemaSql, /company_fiscal_profile/);
assert.match(schemaSql, /fiscal_validity/);
assert.match(schemaSql, /invoice_guard_emission_snapshot_immutable/);
assert.match(schemaSql, /nota_debito/);
assert.match(schemaSql, /LEGACY_IMPORTED/);
assert.match(schemaSql, /invoice_sdi_webhook_receipts/);
assert.match(schemaSql, /fatturapa_snapshot_immutable/);
assert.match(emitSql, /v_ciclo_attivo_da_fatturare/);

console.log("ciclo-attivo-gate.test.ts OK");
