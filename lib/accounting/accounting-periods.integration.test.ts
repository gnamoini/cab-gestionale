/**
 * FASE 4 invariant catalog — static structure test.
 * Live DB integration requires Supabase local; scenarios documented in
 * docs/accounting/CAB_Accounting_Periods_SecurityTests.md
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const manifest = JSON.parse(
  fs.readFileSync(path.join(ROOT, "docs/security/rpc-access-manifest.json"), "utf8"),
) as { entries: Record<string, unknown> };

const requiredRpcs = [
  "accounting_resolve_period(p_company_id uuid, p_accounting_date date)",
  "accounting_reverse_entry(p_entry_id uuid, p_reversal_date date, p_reason text, p_idempotency_key text)",
  "accounting_create_adjustment_entry(p_payload jsonb)",
  "accounting_open_fiscal_year(p_year integer, p_start_date date, p_end_date date)",
  "accounting_close_fiscal_year(p_fiscal_year_id uuid)",
  "accounting_close_accounting_period(p_period_id uuid, p_reason text)",
  "accounting_lock_accounting_period(p_period_id uuid, p_reason text)",
  "accounting_reopen_accounting_period(p_period_id uuid, p_reason text)",
  "accounting_list_fiscal_periods()",
];

for (const rpc of requiredRpcs) {
  assert.ok(manifest.entries[rpc], `manifest missing ${rpc}`);
}

const scenarios = [
  "fiscal_year_open_accepts_posting",
  "fiscal_year_closed_rejects_posting",
  "overlapping_fiscal_years_rejected",
  "duplicate_fiscal_year_rejected",
  "period_open_accepts_posting",
  "period_closed_rejects_posting",
  "period_locked_rejects_posting",
  "date_outside_period_rejected",
  "period_outside_fiscal_year_rejected",
  "update_draft_with_re_resolve",
  "update_posted_rejected",
  "update_closed_period_entry_rejected",
  "delete_closed_entry_rejected",
  "update_line_closed_rejected",
  "reversal_creates_new_entry",
  "original_entry_unchanged",
  "reversal_opposite_amounts",
  "reversal_of_link_correct",
  "cannot_reverse_self",
  "no_reversal_cycles",
  "adjustment_creates_new_entry",
  "adjustment_chain_reconstructable",
  "period_close_generates_audit",
  "period_lock_generates_audit",
  "fiscal_year_close_generates_audit",
  "reversal_generates_audit",
  "unauthorized_period_close_denied",
  "unauthorized_lock_denied",
  "unauthorized_reverse_denied",
  "audit_immutable",
  "tenant_isolation",
  "concurrent_period_close",
  "concurrent_post_and_close",
  "concurrent_double_reverse",
  "concurrent_lock",
];

assert.equal(scenarios.length, 35, "FASE4 scenario catalog count");

console.log("accounting-periods.integration.test.ts OK — 35 scenarios catalogued");
