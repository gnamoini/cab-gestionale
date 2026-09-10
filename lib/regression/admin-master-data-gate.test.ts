import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

const migrations = [
  "supabase/migrations/20270112120000_admin_fiscal_reference_tables.sql",
  "supabase/migrations/20270112120100_clienti_anagrafiche_fase5.sql",
  "supabase/migrations/20270112120300_fornitori_anagrafiche.sql",
];

for (const rel of migrations) {
  const sql = readFileSync(join(ROOT, rel), "utf8");
  assert.match(sql, /admin_normalize_partita_iva|admin_normalize_iban/, `${rel} missing normalize`);
}

const rpcSql = readFileSync(join(ROOT, "supabase/migrations/20270112120600_admin_master_data_rpc.sql"), "utf8");
assert.match(rpcSql, /admin_create_cliente/);
assert.match(rpcSql, /revoke insert, update, delete on public\.clienti_anagrafiche/);

const clienteSql = readFileSync(join(ROOT, "supabase/migrations/20270112120100_clienti_anagrafiche_fase5.sql"), "utf8");
assert.match(clienteSql, /default_document_series_id/);
assert.match(clienteSql, /default_payment_term_id/);
assert.match(clienteSql, /default_payment_method_id/);
assert.doesNotMatch(clienteSql, /default_journal_id.*sezionale/i);

const doc = readFileSync(join(ROOT, "docs/accounting/CAB_Administrative_Master_Data.md"), "utf8");
assert.match(doc, /document_series/);
assert.match(doc, /accounting_journals/);

console.log("admin-master-data-gate.test.ts OK");
