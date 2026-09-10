import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const CORE_SQL = fs.readFileSync(
  path.join(ROOT, "supabase/migrations/20270110120000_accounting_engine_core.sql"),
  "utf8",
);
const RPC_SQL = fs.readFileSync(
  path.join(ROOT, "supabase/migrations/20270110120100_accounting_engine_rpc.sql"),
  "utf8",
);
const FASE4_SCHEMA = fs.readFileSync(
  path.join(ROOT, "supabase/migrations/20270111120000_accounting_fiscal_periods_fase4.sql"),
  "utf8",
);
const FASE4_RPC = fs.readFileSync(
  path.join(ROOT, "supabase/migrations/20270111120100_accounting_period_rpc_fase4.sql"),
  "utf8",
);
const PAYMENT_SQL = fs.readFileSync(
  path.join(ROOT, "supabase/migrations/20270110120300_accounting_payment_foundation.sql"),
  "utf8",
);
const VAT_SQL = fs.readFileSync(
  path.join(ROOT, "supabase/migrations/20270110120200_accounting_vat_foundation.sql"),
  "utf8",
);
const RBAC_SQL = fs.readFileSync(
  path.join(ROOT, "supabase/migrations/20270110120600_accounting_rbac_security.sql"),
  "utf8",
);
const FASE4_RBAC = fs.readFileSync(
  path.join(ROOT, "supabase/migrations/20270111120200_accounting_period_rbac_fase4.sql"),
  "utf8",
);

assert.match(CORE_SQL, /accounting_entry_lines_xor_chk/);
assert.match(CORE_SQL, /accounting_guard_closed_period/);
assert.match(FASE4_RPC, /accounting_resolve_period/);
assert.match(FASE4_SCHEMA, /corrects_entry_id/);
assert.match(FASE4_SCHEMA, /entry_kind/);
assert.match(FASE4_SCHEMA, /accounting_guard_posted_entry_immutable/);
assert.match(CORE_SQL, /idx_accounting_entries_number_uniq/);
assert.match(CORE_SQL, /accounting_guard_line_immutable/);
assert.match(FASE4_RPC, /accounting_reverse_entry/);
assert.match(FASE4_RPC, /reverses_entry_id/);
assert.match(FASE4_RPC, /accounting_create_adjustment_entry/);
assert.match(CORE_SQL, /accounting_assert_pending_entries_balanced/);
assert.match(RBAC_SQL, /revoke insert, update, delete on public\.accounting_entries/);
assert.match(FASE4_RBAC, /revoke insert, update, delete on public\.accounting_audit_events/);
assert.match(VAT_SQL, /vat_code_snapshot/);
assert.match(PAYMENT_SQL, /accounting_assert_receivable_quota/);
assert.match(FASE4_RPC, /Only draft entries can be posted/);
assert.match(FASE4_RPC, /Only posted entries can be reversed/);
assert.match(FASE4_RPC, /set_config\('accounting\.write_ssot', 'true', true\)/);

// 12 monthly periods seeded per fiscal year
assert.match(FASE4_SCHEMA, /for v_month in 1\.\.12 loop/);
assert.match(FASE4_RPC, /for v_month in 1\.\.12 loop/);

// NOT NULL on all entries
assert.match(FASE4_SCHEMA, /alter column fiscal_year_id set not null/);
assert.match(FASE4_SCHEMA, /alter column period_id set not null/);

const createInsert = FASE4_RPC.match(
  /insert into public\.accounting_entries \([\s\S]*?\) values/,
)?.[0];
assert.ok(createInsert, "accounting_create_entry INSERT");
assert.doesNotMatch(createInsert!, /entry_number/);
assert.match(FASE4_RPC, /accounting_post_entry[\s\S]*entry_number = v_next_number/);

console.log("accounting-invariants.test.ts OK (static migration gates)");
