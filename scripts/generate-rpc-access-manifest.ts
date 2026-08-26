/**
 * Classify SECURITY DEFINER functions for rpc-access-manifest.json (SSOT).
 * Run: npx tsx scripts/generate-rpc-access-manifest.ts
 */
import fs from "node:fs";
import path from "node:path";

type Classification =
  | "PUBLIC_SAFE"
  | "SERVER_ONLY"
  | "CRON_ONLY"
  | "INTERNAL_ONLY"
  | "AUTHENTICATED_CLIENT_CALLABLE"
  | "PORTALE_CLIENT_CALLABLE";

type BaselineFn = {
  name: string;
  args: string;
  grants: { anon: boolean; authenticated: boolean; serviceRole: boolean };
  hasAuthCheck: boolean;
};

type ManifestEntry = {
  classification: Classification;
  grants: ("anon" | "authenticated" | "service_role")[];
  anonAllow: boolean;
  requiresAuthUid: boolean;
  requiresRbac: boolean;
  notes?: string;
  findingRefs?: string[];
};

const ROOT = process.cwd();
const baselinePath = path.join(
  ROOT,
  "docs/security/baseline-pre-remediation-2026-08-26.json",
);
const baseline = JSON.parse(fs.readFileSync(baselinePath, "utf8")) as {
  functions: BaselineFn[];
};

const SERVER_ONLY = new Set([
  "ai_provider_key_record_failure",
  "ai_provider_key_record_success",
  "expire_import_files",
  "cleanup_import_storage",
  "cab_claim_communication_outbox_batch",
  "cab_claim_communication_send_batch",
  "cab_claim_delivery_queue_batch",
  "cab_claim_notification_outbox_batch",
  "cab_complete_communication_outbox",
  "cab_complete_communication_send",
  "cab_complete_delivery_queue",
  "cab_complete_notification_outbox",
  "cab_release_communication_outbox",
  "cab_release_notification_outbox",
  "cab_enqueue_communication_outbox",
  "cab_enqueue_notification_outbox",
  "cab_enqueue_raw_delivery",
  "cab_dispatch_notifications_bulk",
  "cab_log_notification_pipeline_trace",
  "cab_fanout_enqueue_raw_after_notification",
  "cab_sync_lavorazione_actual_labor_hours_safety_net",
  "handle_new_user",
  "resolve_auth_email_for_login",
  "security_set_user_role",
  "rbac_role_for_user",
  "rbac_user_page_access_level",
  "rbac_module_from_page_access",
  "expire_pending_document_captures",
  "prune_log_modifiche_retention",
  "sync_mezzo_km_from_reading",
  "assign_ddt_numero",
  "assign_lavorazione_codice",
  "assign_ordine_fornitore_numero",
  "assign_preventivo_numero_lavorazione",
  "assign_preventivo_numero_manuale",
  "assert_ddt_preventivo_row_allocations",
  "assert_invoice_preventivo_allocations",
  "ddt_preventivo_row_delivered_qty",
  "invoice_preventivo_allocated_total",
  "recalc_compliance_rule_due",
  "wse_write_history",
  "cab_fanout_client_portal_lavorazione_notification",
  "cab_fanout_client_portal_lavorazione_notification_core",
  "invoice_write_status_axes",
  "document_ai_index_is_usable",
]);

const CRON_ONLY = new Set([
  "cab_invoke_communication_outbox_worker",
  "cab_invoke_communication_send_worker",
  "cab_invoke_fatturazione_overdue_digest_worker",
  "cab_invoke_lavorazioni_overdue_digest_worker",
  "cab_invoke_notification_outbox_worker",
  "cab_invoke_push_delivery_worker",
  "cab_invoke_push_subscription_cleanup_worker",
  "cab_invoke_spare_parts_document_index_worker",
  "cab_invoke_spare_parts_part_search_worker",
  "process_search_rebuild_queue",
  "enqueue_search_rebuild",
  "prune_app_settings_audit_retention",
  "prune_log_modifiche_dashboard_window",
  "prune_log_modifiche_per_entity",
  "prune_maintenance_audit_events_retention",
  "prune_mezzo_anagrafica_history_retention",
]);

const INTERNAL_ONLY_PREFIX = "trg_";

/** Explicit PUBLIC_SAFE: anon EXECUTE allowed (rare). */
const PUBLIC_SAFE = new Set(["resolve_auth_email_for_login"]);

const PORTALE = new Set([
  "is_ddt_visible_to_client",
  "is_preventivo_visible_to_client",
  "mark_preventivo_viewed_by_client",
  "archive_lavorazione_client_portal",
]);

const STAFF_REPORTS = new Set([
  "customer_balance_reconciliation_report",
  "invoice_legacy_status_audit_report",
  "invoice_payment_reconciliation_report",
  "invoice_status_backfill_snapshot",
  "invoice_status_migration_report",
  "apply_invoice_status_backfill",
]);

const STAFF_EVENT_RPC = new Set([
  "append_preventivo_event",
  "invoice_insert_event",
  "execute_rename_job_complete",
  "execute_rename_job_start",
  "cab_publish_notification",
]);

const REFRESH_SEARCH = /^refresh_.*_search_document$/;

function fnKey(name: string, args: string): string {
  return args ? `${name}(${args})` : `${name}()`;
}

function classify(fn: BaselineFn): ManifestEntry {
  const { name } = fn;

  if (PUBLIC_SAFE.has(name)) {
    return {
      classification: "PUBLIC_SAFE",
      grants: ["anon", "service_role"],
      anonAllow: true,
      requiresAuthUid: false,
      requiresRbac: false,
      notes: "Login email resolve only; body validates input",
      findingRefs: ["SEC-PUBLIC-SAFE"],
    };
  }

  if (name.startsWith(INTERNAL_ONLY_PREFIX)) {
    return {
      classification: "INTERNAL_ONLY",
      grants: ["service_role"],
      anonAllow: false,
      requiresAuthUid: false,
      requiresRbac: false,
      notes: "Trigger/pg internal; no PostgREST client",
      findingRefs: ["SEC-01"],
    };
  }

  if (CRON_ONLY.has(name) || REFRESH_SEARCH.test(name)) {
    return {
      classification: "CRON_ONLY",
      grants: ["service_role"],
      anonAllow: false,
      requiresAuthUid: false,
      requiresRbac: false,
      findingRefs: ["SEC-02", "SEC-06", "SEC-11"],
    };
  }

  if (SERVER_ONLY.has(name) || name.startsWith("cab_claim_") || name.startsWith("cab_complete_")) {
    return {
      classification: "SERVER_ONLY",
      grants: ["service_role"],
      anonAllow: false,
      requiresAuthUid: false,
      requiresRbac: false,
      findingRefs: ["SEC-02", "SEC-03", "SEC-06", "SEC-07"],
    };
  }

  if (PORTALE.has(name)) {
    return {
      classification: "PORTALE_CLIENT_CALLABLE",
      grants: ["authenticated"],
      anonAllow: false,
      requiresAuthUid: true,
      requiresRbac: true,
      notes: "Cliente portal visibility/ownership",
    };
  }

  if (STAFF_REPORTS.has(name)) {
    return {
      classification: "AUTHENTICATED_CLIENT_CALLABLE",
      grants: ["authenticated"],
      anonAllow: false,
      requiresAuthUid: true,
      requiresRbac: true,
      notes: "Staff fatturazione/report read",
      findingRefs: ["SEC-04"],
    };
  }

  if (STAFF_EVENT_RPC.has(name)) {
    const module =
      name.includes("preventivo") ? "preventivi" : name.includes("invoice") ? "fatturazione" : "impostazioni";
    return {
      classification: "AUTHENTICATED_CLIENT_CALLABLE",
      grants: ["authenticated"],
      anonAllow: false,
      requiresAuthUid: true,
      requiresRbac: true,
      notes: `Staff ${module} write`,
      findingRefs: ["SEC-05", "SEC-11"],
    };
  }

  if (name.startsWith("rbac_") || name === "user_effective_can" || name === "current_profile_role") {
    return {
      classification: "AUTHENTICATED_CLIENT_CALLABLE",
      grants: ["authenticated"],
      anonAllow: false,
      requiresAuthUid: true,
      requiresRbac: false,
      notes: "RBAC helper for RLS/policies",
    };
  }

  if (
    name.startsWith("notification_") ||
    name.startsWith("cab_list_") ||
    name.startsWith("cab_mark_") ||
    name.startsWith("cab_count_") ||
    name.startsWith("cab_create_") ||
    name.startsWith("cab_dismiss_") ||
    name.startsWith("cab_upsert_workshop") ||
    name.startsWith("cab_patch_workshop") ||
    name.startsWith("cab_detect_schedule") ||
    name.startsWith("cab_migrate_dashboard")
  ) {
    return {
      classification: "AUTHENTICATED_CLIENT_CALLABLE",
      grants: ["authenticated"],
      anonAllow: false,
      requiresAuthUid: true,
      requiresRbac: true,
    };
  }

  if (name.startsWith("cab_revoke_push") || name.startsWith("cab_touch_push") || name.startsWith("cab_upsert_push")) {
    return {
      classification: "AUTHENTICATED_CLIENT_CALLABLE",
      grants: ["authenticated"],
      anonAllow: false,
      requiresAuthUid: true,
      requiresRbac: false,
    };
  }

  if (name.startsWith("document_capture_")) {
    return {
      classification: "AUTHENTICATED_CLIENT_CALLABLE",
      grants: ["authenticated"],
      anonAllow: false,
      requiresAuthUid: true,
      requiresRbac: true,
    };
  }

  if (name.startsWith("import_file_")) {
    return {
      classification: "AUTHENTICATED_CLIENT_CALLABLE",
      grants: ["authenticated"],
      anonAllow: false,
      requiresAuthUid: true,
      requiresRbac: true,
    };
  }

  // Default: authenticated staff RPC (revoke anon)
  return {
    classification: "AUTHENTICATED_CLIENT_CALLABLE",
    grants: ["authenticated", "service_role"],
    anonAllow: false,
    requiresAuthUid: true,
    requiresRbac: true,
    notes: "Default staff callable; anon revoked",
    findingRefs: ["SEC-01"],
  };
}

const entries: Record<string, ManifestEntry> = {};
for (const fn of baseline.functions) {
  entries[fnKey(fn.name, fn.args)] = classify(fn);
}

// Enforce: anonAllow only for PUBLIC_SAFE
for (const [key, entry] of Object.entries(entries)) {
  if (entry.anonAllow && entry.classification !== "PUBLIC_SAFE") {
    throw new Error(`anonAllow only allowed for PUBLIC_SAFE: ${key}`);
  }
  if (entry.grants.includes("anon") && entry.classification !== "PUBLIC_SAFE") {
    throw new Error(`grants must not include anon except PUBLIC_SAFE: ${key}`);
  }
}

const manifest = {
  version: 1,
  generatedAt: new Date().toISOString(),
  sourceBaseline: "docs/security/baseline-pre-remediation-2026-08-26.json",
  policy:
    "SECURITY DEFINER + EXECUTE anon = DENY. Absent from manifest = no client EXECUTE.",
  entries,
};

const outPath = path.join(ROOT, "docs/security/rpc-access-manifest.json");
fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2));
console.log(`manifest: ${Object.keys(entries).length} entries → ${outPath}`);
