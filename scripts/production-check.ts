/**
 * Production readiness gate — eseguire solo in GitHub Actions (workflow release-gate).
 * Entry point logico per RBAC/RLS, storage, pilot flags, legacy URL.
 *
 * NON autorizza deploy da sola: serve il check GitHub "release-gate" su commit in main.
 * Vercel non invoca questo script (build = next build only).
 *
 * CI: PRODUCTION_CHECK_REQUIRE_DB=1 + SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_*
 * Locale (advisory): PRODUCTION_CHECK_REQUIRE_DB=1 npm run production:check
 */
import { exitWithGate, printGateHeader, printGateResult } from "../lib/ci/gate-output";
import { fetchProductionReadinessDbSnapshot } from "../lib/production/fetch-production-readiness-db";
import { validateProductionReadiness } from "../lib/production/production-readiness";
import { scanProductionReadinessCode } from "../lib/production/production-readiness-scan";
import type { ProductionReadinessFinding } from "../lib/production/production-readiness-types";

const GATE_NAME = "Production readiness";

const CHECK_GROUPS: { label: string; ids: string[] }[] = [
  {
    label: "rbac-rls",
    ids: [
      "security-portal-acl-missing",
      "security-user-permissions-rls-missing",
      "security-user-permissions-module-mismatch",
      "security-rbac-pilot-sql-present",
      "rbac-central-function-missing",
      "rbac-pilot-env-bypass",
      "rbac-has-capability-bypass",
    ],
  },
  {
    label: "storage",
    ids: [
      "storage-documenti-bucket-public",
      "storage-legacy-document-urls",
      "storage-public-url-in-code",
      "storage-resolve-documento-legacy",
    ],
  },
  {
    label: "pilot-flags",
    ids: [
      "feature-flag-db-operator-settings",
      "feature-flag-env-operator-settings",
      "feature-flag-db-not-checked",
      "feature-flag-pilot-combined-active",
      "feature-flag-env-only-unverified",
    ],
  },
  {
    label: "legacy-urls",
    ids: ["storage-legacy-document-urls", "storage-public-url-in-code", "storage-resolve-documento-legacy"],
  },
  {
    label: "attrezzature-v2",
    ids: [
      "attrezzature-v2-r4-auto-migration",
      "attrezzature-v2-legacy-write-hits",
      "attrezzature-v2-legacy-adapter-import",
      "attrezzature-v2-db-disabled-prod",
    ],
  },
  {
    label: "ops-env",
    ids: [
      "ops-env-pilot-production",
      "ops-env-staging-public-production",
      "ops-env-service-role-in-runtime-env",
      "ops-env-smoke-creds-missing-ci",
    ],
  },
];

function formatFinding(f: ProductionReadinessFinding): string {
  return f.detail ? `${f.message} — ${f.detail}` : f.message;
}

function printChecksSection(
  groups: typeof CHECK_GROUPS,
  blockerIds: Set<string>,
  warningIds: Set<string>,
): void {
  console.log("CHECKS:");
  for (const group of groups) {
    const relevant = group.ids.filter((id) => blockerIds.has(id) || warningIds.has(id));
    const failed = relevant.filter((id) => blockerIds.has(id));
    const warned = relevant.filter((id) => warningIds.has(id) && !blockerIds.has(id));
    let status = "ok";
    if (failed.length > 0) status = "FAIL";
    else if (warned.length > 0) status = "warn";
    console.log(`  ${group.label}: ${status}`);
  }
  console.log("");
}

function requireDb(): boolean {
  return (
    process.env.PRODUCTION_CHECK_REQUIRE_DB === "1" ||
    process.env.CI === "true" ||
    process.env.CI === "1"
  );
}

function warnIfInvalidRuntime(): void {
  const onVercel = process.env.VERCEL === "1";
  const inCi = process.env.CI === "true" || process.env.CI === "1";
  if (onVercel && !inCi) {
    console.warn(
      "[production:check] WARNING: questo gate non deve girare su Vercel. " +
        "L’autorità di release è solo GitHub Actions release-gate.",
    );
  }
}

async function main() {
  warnIfInvalidRuntime();

  let db;
  try {
    db = await fetchProductionReadinessDbSnapshot();
  } catch {
    db = undefined;
  }

  const report = validateProductionReadiness({
    codeScan: scanProductionReadinessCode(),
    db,
    requireDb: requireDb(),
  });

  const blockerIds = new Set(report.findings.blockers.map((f) => f.id));
  const warningIds = new Set(report.findings.warnings.map((f) => f.id));

  const status = report.ready ? "PASS" : "FAIL";
  const blockers = report.findings.blockers.map(formatFinding);
  const warnings = report.findings.warnings.map(formatFinding);

  printGateResult({ name: GATE_NAME, status, blockers, warnings });
  printGateHeader("Production readiness detail");
  printChecksSection(CHECK_GROUPS, blockerIds, warningIds);

  if (!report.meta.dbChecked) {
    console.log("DB snapshot: not connected (required)");
    if (requireDb()) {
      const missing = [
        !process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() && "NEXT_PUBLIC_SUPABASE_URL",
        !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() && "NEXT_PUBLIC_SUPABASE_ANON_KEY",
        !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() && "SUPABASE_SERVICE_ROLE_KEY",
      ].filter(Boolean);
      if (missing.length > 0) {
        console.log(`[production:check] missing env: ${missing.join(", ")}`);
      }
      for (const b of report.findings.blockers) {
        console.log(`[production:check] blocker: ${b.id}`);
      }
    }
  } else {
    console.log("DB snapshot: connected");
  }

  exitWithGate(status);
}

void main();
