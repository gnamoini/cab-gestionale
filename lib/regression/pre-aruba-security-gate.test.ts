import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const MIGRATION = path.join(ROOT, "supabase/migrations/20270312120000_pre_aruba_security_remediation.sql");
const MANIFEST = path.join(ROOT, "docs/security/rpc-access-manifest.json");

const sql = fs.readFileSync(MIGRATION, "utf8");
const manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8")) as {
  entries: Record<string, { classification: string; grants: string[] }>;
};

assert.match(sql, /fiscal_validity is distinct from old\.fiscal_validity/);
assert.match(sql, /accounting_status is distinct from old\.accounting_status/);
assert.match(sql, /before update of document_status, payment_status, sdi_status, fiscal_validity, accounting_status/);
assert.match(sql, /invoice_guard_emitted_totals_update/);
assert.match(sql, /revoke all on function public\.apply_sdi_event\(jsonb\) from public, anon, authenticated/);
assert.match(sql, /grant execute on function public\.apply_sdi_event\(jsonb\) to service_role/);
assert.match(sql, /v_actor := public\.rbac_auth_uid\(\)/);

const applySdi = manifest.entries["apply_sdi_event(p_payload jsonb)"];
assert.equal(applySdi?.classification, "SERVER_ONLY");
assert.deepEqual(applySdi?.grants, ["service_role"]);

const handleOutcome = manifest.entries["handle_sdi_outcome(p_invoice_id uuid, p_outcome text, p_provider_reference text, p_reason text)"];
assert.equal(handleOutcome?.classification, "SERVER_ONLY");
assert.deepEqual(handleOutcome?.grants, ["service_role"]);

const webhook = fs.readFileSync(path.join(ROOT, "app/api/fatturazione/sdi-webhook/route.ts"), "utf8");
assert.doesNotMatch(webhook, /readSupabaseServiceRoleKey\(\).*Bearer/);
assert.match(webhook, /mismatch \|=/);

console.log("pre-aruba-security-gate.test.ts OK");
