import assert from "node:assert/strict";
import { validateProductionReadiness } from "@/lib/production/production-readiness";
import { scanProductionReadinessCode } from "@/lib/production/production-readiness-scan";
import type { ProductionReadinessCodeScan } from "@/lib/production/production-readiness-types";

const cleanScan: ProductionReadinessCodeScan = {
  legacyResolveDocumentoFileUrlHits: [],
  legacySupabasePublicUrlInCodeHits: [],
  pilotEnvImportOutsideAllowlist: [],
  rbacBypassOutsideCentralFunction: [],
  directUseToastHits: [],
  legacyDialogHits: [],
  realtimePollingFallbackPresent: false,
  logBatcherPresent: false,
  isOperatorGlobalSettingsUsedInRbac: true,
};

const cleanDb = {
  connected: true,
  operatorGlobalSettingsDbEnabled: false,
  documentiBucketPublic: false,
  legacyPublicDocumentUrlCount: 0,
  storageOrphanObjectCount: null,
  rbacOperatorPilotSqlPresent: true,
  portalSecurityGuardSqlPresent: true,
  userPermissionsRlsPresent: true,
};

const envClean = { ...process.env };
delete envClean.NEXT_PUBLIC_ENABLE_OPERATOR_GLOBAL_SETTINGS;

const ok = validateProductionReadiness({
  env: envClean,
  codeScan: cleanScan,
  db: cleanDb,
});

assert.equal(ok.ready, true, `expected ready, blockers: ${ok.blockers.join("; ")}`);

const blocked = validateProductionReadiness({
  env: { ...envClean, NEXT_PUBLIC_ENABLE_OPERATOR_GLOBAL_SETTINGS: "1" } as NodeJS.ProcessEnv,
  codeScan: cleanScan,
  db: cleanDb,
});

assert.equal(blocked.ready, false, `blockers: ${blocked.blockers.join("; ")}`);
assert.ok(blocked.blockers.some((b) => b.includes("ENABLE_OPERATOR_GLOBAL_SETTINGS")));

const dbOnlyNoEnv = validateProductionReadiness({
  env: envClean,
  codeScan: cleanScan,
  db: { ...cleanDb, operatorGlobalSettingsDbEnabled: true },
});

assert.equal(dbOnlyNoEnv.ready, true, `db-only without env should not block: ${dbOnlyNoEnv.blockers.join("; ")}`);
assert.ok(
  dbOnlyNoEnv.warnings.some((w) => w.includes("Flag DB pilot attivo senza env")),
  `expected advisory warning, got: ${dbOnlyNoEnv.warnings.join("; ")}`,
);

const combinedPilot = validateProductionReadiness({
  env: { ...envClean, NEXT_PUBLIC_ENABLE_OPERATOR_GLOBAL_SETTINGS: "1" } as NodeJS.ProcessEnv,
  codeScan: cleanScan,
  db: { ...cleanDb, operatorGlobalSettingsDbEnabled: true },
});

assert.equal(combinedPilot.ready, false, `env + DB must block: ${combinedPilot.blockers.join("; ")}`);
assert.ok(
  combinedPilot.blockers.some(
    (b) => b.includes("ENABLE_OPERATOR_GLOBAL_SETTINGS") || b.includes("Pilot impostazioni operatore"),
  ),
);

const scan = scanProductionReadinessCode();
assert.equal(
  scan.legacySupabasePublicUrlInCodeHits.some((h) => h.file.includes("documento-file-access.test.ts")),
  false,
  "test fixture URL must not block production gate",
);
assert.equal(
  scan.rbacBypassOutsideCentralFunction.some((h) => h.file.includes("rbac.capability.test.ts")),
  false,
  "rbac capability unit tests must not block production gate",
);
assert.equal(
  scan.rbacBypassOutsideCentralFunction.some((h) => h.file.includes("security-rbac-policy.test.ts")),
  false,
  "security rbac regression must not block production gate",
);
assert.equal(
  scan.realtimePollingFallbackPresent,
  false,
  "gestionale-realtime-bridge must use SyncTransportController (no unsafe dual transport)",
);

console.log("production-readiness.test.ts OK");
