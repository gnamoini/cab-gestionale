import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function exists(rel: string): boolean {
  return fs.existsSync(path.join(ROOT, rel));
}

const PHASE_DOCS = [
  "docs/audit-phase2-page-inventory.md",
  "docs/audit-phase3-bug-hunt-plan.md",
  "docs/audit-phase4-edge-cases.md",
  "docs/audit-phase5-storage-audit.md",
  "docs/audit-phase6-technical-debt.md",
  "docs/audit-phase7-security-audit.md",
  "docs/audit-phase8-permissions-audit.md",
  "docs/audit-phase9-data-sync-audit.md",
  "docs/audit-phase10-notifications-audit.md",
  "docs/audit-phase11-forms-save-audit.md",
  "docs/audit-phase12-performance-audit.md",
  "docs/audit-phase13-compatibility-audit.md",
  "docs/audit-phase14-prioritization-final.md",
] as const;

for (const doc of PHASE_DOCS) {
  assert.ok(exists(doc), `${doc} missing`);
}

const livingDocs = ["docs/data-sync.md", "docs/rbac-matrix.md", "docs/audit-checklist.md"] as const;
for (const doc of livingDocs) {
  assert.ok(exists(doc), `${doc} missing`);
}

const preventiviService = read("src/services/preventivi.service.ts");
assert.match(preventiviService, /ensureSectionWrite\("preventivi"\)/);
assert.match(preventiviService, /ensureSectionDelete\("preventivi"\)/);

const settingsGate = read("components/gestionale/gestionale-settings-ready-gate.tsx");
const authGate = read("components/gestionale/gestionale-auth-gate.tsx");
const topNotice = read("components/gestionale/gestionale-top-notice.tsx");
const gestionaleLayout = read("app/(gestionale)/layout.tsx");

assert.match(settingsGate, /toast\.warning/);
assert.match(settingsGate, /useGestionaleTopNotice/);
assert.doesNotMatch(settingsGate, /LoadingProgressBar/);
assert.doesNotMatch(settingsGate, /SettingsSyncNotice/);

assert.match(authGate, /useGestionaleTopNotice/);
assert.doesNotMatch(authGate, /GlobalLoadingView/);
assert.doesNotMatch(authGate, /border-b border-\[color:var\(--cab-border\)\]/);

assert.match(topNotice, /createPortal/);
assert.match(topNotice, /fixed inset-x-0/);

assert.match(gestionaleLayout, /GestionaleTopNoticeProvider/);

const promemoriaModal = read("components/dashboard/promemoria/dashboard-promemoria-form-modal.tsx");
assert.match(promemoriaModal, /GestionaleUnsavedChangesDialog/);

const dipendentiHook = read("src/hooks/use-dipendenti-timesheet.ts");
assert.match(dipendentiHook, /entriesDegraded/);

const masterReport = read("docs/technical-audit-report.md");
assert.match(masterReport, /audit-input-security\.md/);
assert.match(masterReport, /audit-pdf-system\.md/);
assert.match(masterReport, /audit-phase14-prioritization-final/);
assert.match(masterReport, /20260705120000_gestionale_sync_realtime_gaps/);

const E2E_SPECS = [
  "e2e/smoke/01-auth.spec.ts",
  "e2e/smoke/02-rbac-routes.spec.ts",
  "e2e/smoke/03-dashboard-report.spec.ts",
  "e2e/smoke/04-modal-scroll.spec.ts",
  "e2e/smoke/05-document-lifecycle.spec.ts",
  "e2e/smoke/06-mobile-shell.spec.ts",
  "e2e/smoke/07-hydration-runtime.spec.ts",
  "e2e/smoke/08-bunder.spec.ts",
  "e2e/smoke/09-dipendenti.spec.ts",
  "e2e/smoke/10-preventivi.spec.ts",
  "e2e/smoke/11-client-portal.spec.ts",
  "e2e/smoke/12-mobile-routes.spec.ts",
] as const;

for (const spec of E2E_SPECS) {
  assert.ok(exists(spec), `${spec} missing`);
}

const smokeRegression = read("scripts/smoke-regression-tests.ts");
for (const policy of [
  "sync-invalidation-policy.test.ts",
  "notifications-policy.test.ts",
  "forms-save-policy.test.ts",
  "performance-policy.test.ts",
  "compatibility-policy.test.ts",
  "audit-signoff-policy.test.ts",
]) {
  assert.match(smokeRegression, new RegExp(policy.replace(".", "\\.")));
}

const migrations = [
  "supabase/migrations/20260704120000_bunder_documents.sql",
  "supabase/migrations/20260704130000_deprecate_supporto_tables.sql",
  "supabase/migrations/20260705120000_gestionale_sync_realtime_gaps.sql",
] as const;

for (const mig of migrations) {
  assert.ok(exists(mig), `${mig} missing`);
}

console.log("audit-signoff-policy.test.ts OK");
