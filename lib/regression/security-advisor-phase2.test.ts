/**
 * Supabase Security Advisor phase 2 migration checks.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const pgTrgmMigration = fs.readFileSync(
  path.join(ROOT, "supabase/migrations/20260910120011_move_pg_trgm_to_extensions.sql"),
  "utf8",
);

assert.match(pgTrgmMigration, /CREATE SCHEMA IF NOT EXISTS extensions/i);
assert.match(pgTrgmMigration, /ALTER EXTENSION pg_trgm SET SCHEMA extensions/i);

const revokeMigration = fs.readFileSync(
  path.join(ROOT, "supabase/migrations/20260910120012_revoke_authenticated_internal_definer.sql"),
  "utf8",
);

const internalFunctions = [
  "handle_new_user()",
  "log_app_settings_update_audit()",
  "prune_log_modifiche_retention()",
  "trg_lavorazioni_assign_codice()",
  "trg_ordini_fornitori_assign_numero()",
  "trg_preventivi_assign_numero()",
  "trg_fanout_client_portal_lavorazione_ingresso()",
  "trg_fanout_client_portal_lavorazione_completata()",
  "sync_mezzo_km_from_reading()",
  "trg_compliance_record_recalc_rule()",
  "assert_ddt_preventivo_row_allocations(uuid)",
  "assert_invoice_preventivo_allocations(uuid)",
  "assign_ddt_numero(integer, text)",
  "assign_lavorazione_codice(timestamp with time zone)",
  "assign_ordine_fornitore_numero(date)",
  "assign_preventivo_numero_lavorazione(uuid)",
  "assign_preventivo_numero_manuale(timestamp with time zone)",
  "ddt_preventivo_row_delivered_qty(uuid, text, uuid)",
  "invoice_preventivo_allocated_total(uuid, uuid)",
  "recalc_compliance_rule_due(uuid)",
  "wse_write_history(uuid, integer, text, jsonb, jsonb)",
  "document_capture_assert_status_transition(text, text)",
  "cab_fanout_client_portal_lavorazione_notification(text, uuid)",
  "security_set_user_role(uuid, text)",
] as const;

for (const fn of internalFunctions) {
  const escaped = fn.replace(/[()]/g, "\\$&").replace(/,/g, ",\\s*");
  assert.match(
    revokeMigration,
    new RegExp(`REVOKE ALL ON FUNCTION public\\.${escaped} FROM authenticated`, "i"),
    `${fn} must revoke authenticated execute`,
  );
}

assert.match(revokeMigration, /t\.typname = 'trigger'/i);
assert.match(revokeMigration, /p\.prosecdef/i);

const intentionalRpc = [
  "soft_delete_lavorazione",
  "create_ddt_with_rows",
  "bulk_upsert_app_settings",
  "cab_count_unread_notifications",
] as const;

for (const fn of intentionalRpc) {
  assert.doesNotMatch(
    revokeMigration,
    new RegExp(`REVOKE ALL ON FUNCTION public\\.${fn}`, "i"),
    `${fn} must not be revoked in phase 2 migration`,
  );
}

console.log("security-advisor-phase2.test: OK");
