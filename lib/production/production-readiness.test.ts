import assert from "node:assert/strict";
import { validateProductionReadiness } from "@/lib/production/production-readiness";
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

console.log("production-readiness.test.ts OK");
