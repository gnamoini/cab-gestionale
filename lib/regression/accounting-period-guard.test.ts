import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const FASE4_SCHEMA = fs.readFileSync(
  path.join(ROOT, "supabase/migrations/20270111120000_accounting_fiscal_periods_fase4.sql"),
  "utf8",
);
const FASE4_RPC = fs.readFileSync(
  path.join(ROOT, "supabase/migrations/20270111120100_accounting_period_rpc_fase4.sql"),
  "utf8",
);
const FASE4_RBAC = fs.readFileSync(
  path.join(ROOT, "supabase/migrations/20270111120200_accounting_period_rbac_fase4.sql"),
  "utf8",
);
const CORE = fs.readFileSync(
  path.join(ROOT, "supabase/migrations/20270110120000_accounting_engine_core.sql"),
  "utf8",
);
const RPC = fs.readFileSync(
  path.join(ROOT, "supabase/migrations/20270110120100_accounting_engine_rpc.sql"),
  "utf8",
);

assert.match(FASE4_SCHEMA, /accounting_fiscal_years/);
assert.match(FASE4_SCHEMA, /accounting_periods_no_overlap/);
assert.match(FASE4_SCHEMA, /accounting_guard_period_within_fiscal_year/);
assert.match(FASE4_SCHEMA, /accounting_audit_events/);
assert.match(FASE4_SCHEMA, /fiscal_year_id set not null/i);
assert.match(FASE4_SCHEMA, /period_id set not null/i);

assert.match(FASE4_RPC, /accounting_resolve_period/);
assert.match(FASE4_RPC, /accounting_assert_period_open_for_posting/);
assert.match(FASE4_RPC, /p_reversal_date/);
assert.match(FASE4_RPC, /accounting_create_adjustment_entry/);
assert.match(FASE4_RPC, /accounting_close_fiscal_year/);
assert.match(FASE4_RPC, /period\(s\) still OPEN/);

assert.match(FASE4_RBAC, /revoke insert, update, delete on public\.accounting_fiscal_years/);
assert.match(FASE4_RBAC, /revoke insert, update, delete on public\.accounting_periods/);
assert.doesNotMatch(FASE4_RBAC, /if v_role = 'admin' then\s+return true/i);

assert.match(CORE, /accounting_guard_closed_period/);
assert.match(RPC, /set_config\('accounting\.write_ssot', 'true', true\)/);

console.log("accounting-period-guard.test.ts OK");
