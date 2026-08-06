/**
 * Supabase linter 0010: public views exposed to authenticated must use security_invoker.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function assertSecurityInvokerView(migration: string, view: string): void {
  const re = new RegExp(
    `CREATE OR REPLACE VIEW public\\.${view}[\\s\\S]*?WITH \\(security_invoker = true\\)`,
    "i",
  );
  assert.match(migration, re, `${view} must use security_invoker = true`);
  assert.match(
    migration,
    new RegExp(`GRANT SELECT ON public\\.${view} TO authenticated`, "i"),
    `${view} must grant select to authenticated`,
  );
}

const legacyMigration = fs.readFileSync(
  path.join(ROOT, "supabase/migrations/20260910120004_security_invoker_views.sql"),
  "utf8",
);
const hardeningMigration = fs.readFileSync(
  path.join(ROOT, "supabase/migrations/20261111130000_security_advisor_linter_hardening.sql"),
  "utf8",
);

const legacyViews = [
  "preventivi_billing_status",
  "preventivo_ddt_fulfillment",
  "asset_timeline_projection",
  "v_dashboard_lavorazioni_kpi",
] as const;

const hardeningViews = [
  "maintenance_events",
  "maintenance_presets",
  "import_export_telemetry_daily",
] as const;

for (const view of legacyViews) {
  assertSecurityInvokerView(legacyMigration, view);
}

for (const view of hardeningViews) {
  assertSecurityInvokerView(hardeningMigration, view);
}

console.log("security-invoker-views.test: OK");
