/**
 * Supabase Security Advisor critical hardening migration checks.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const migration = fs.readFileSync(
  path.join(ROOT, "supabase/migrations/20260910120005_security_advisor_critical_hardening.sql"),
  "utf8",
);

const searchPathFunctions = [
  "set_updated_at()",
  "rbac_normalize_role(text)",
  "rbac_is_restricted_app_settings_row(text, text)",
  "rbac_resource_to_module(text)",
  "rbac_log_entita_module(text)",
  "invoice_recalculate_status(numeric, numeric, date, text)",
  "rbac_is_valid_erp_module(text)",
  "rbac_role_module_default(text, text, text)",
  "trg_profiles_ruolo_guard()",
  "trg_profiles_role_key_guard()",
  "ordine_fornitore_row_total(numeric, numeric, numeric)",
  "ordine_fornitore_compute_totals(jsonb, numeric, numeric)",
  "mezzi_legacy_attrezzatura_valued(text, text, text, text)",
  "notification_priority_rank(text)",
  "profile_display_name(text, text)",
  "document_capture_guard_post_finalize()",
  "document_capture_events_append_only()",
  "document_capture_assert_status_transition(text, text)",
] as const;

for (const fn of searchPathFunctions) {
  assert.match(
    migration,
    new RegExp(`ALTER FUNCTION public\\.${fn.replace(/[()]/g, "\\$&").replace(/,/g, ",\\s*")} SET search_path = public`, "i"),
    `${fn} must set search_path = public`,
  );
}

assert.match(migration, /DROP FUNCTION IF EXISTS public\.can_write_org\(uuid\)/i);
assert.match(migration, /DROP FUNCTION IF EXISTS public\.is_member_org\(uuid\)/i);
assert.match(migration, /REVOKE ALL ON FUNCTION public\.%I\(%s\) FROM anon/i);
assert.match(migration, /REVOKE ALL ON FUNCTION public\.%I\(%s\) FROM PUBLIC/i);
assert.match(migration, /p\.prosecdef/i);

const followUp = fs.readFileSync(
  path.join(ROOT, "supabase/migrations/20260910120010_revoke_public_security_definer_execute.sql"),
  "utf8",
);
assert.match(followUp, /FROM PUBLIC/i);

console.log("security-advisor-critical-hardening.test: OK");
