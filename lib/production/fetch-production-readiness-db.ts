import { createClient } from "@supabase/supabase-js";
import { assertSupabasePublicEnv } from "@/lib/env/supabase-public";
import { readSupabaseServiceRoleKey } from "@/lib/env/supabase-service-role";
import {
  OPERATOR_GLOBAL_SETTINGS_KEY,
  OPERATOR_GLOBAL_SETTINGS_MODULE,
  parseOperatorGlobalSettingsDbEnabled,
} from "@/lib/permissions/operator-global-settings";
import { runStorageConsistencyDiagnostics } from "@/lib/ops/storage-consistency-diagnostics";
import { scanProductionReadinessMigrations } from "@/lib/production/production-readiness-scan";
import type { ProductionReadinessDbSnapshot } from "@/lib/production/production-readiness-types";

/** Snapshot DB per validateProductionReadiness (service role, solo server). */
export async function fetchProductionReadinessDbSnapshot(): Promise<ProductionReadinessDbSnapshot> {
  const mig = scanProductionReadinessMigrations();
  const base: ProductionReadinessDbSnapshot = {
    connected: false,
    operatorGlobalSettingsDbEnabled: false,
    documentiBucketPublic: null,
    legacyPublicDocumentUrlCount: 0,
    storageOrphanObjectCount: null,
    rbacOperatorPilotSqlPresent: mig.rbacPilot,
    portalSecurityGuardSqlPresent: mig.portalSecurity,
    userPermissionsRlsPresent: mig.userPermissionsRls,
  };

  const serviceKey = readSupabaseServiceRoleKey();
  if (!serviceKey) return base;

  try {
    const { url } = assertSupabasePublicEnv();
    const admin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: settingsRow, error: settingsErr } = await admin
      .from("app_settings")
      .select("value")
      .eq("module", OPERATOR_GLOBAL_SETTINGS_MODULE)
      .eq("key", OPERATOR_GLOBAL_SETTINGS_KEY)
      .maybeSingle();

    if (settingsErr) return base;

    const { data: buckets, error: bucketsErr } = await admin.storage.listBuckets();
    const documentiBucket = bucketsErr ? null : buckets?.find((b) => b.id === "documenti");

    const storageDiag = await runStorageConsistencyDiagnostics();

    return {
      connected: true,
      operatorGlobalSettingsDbEnabled: parseOperatorGlobalSettingsDbEnabled(settingsRow?.value),
      documentiBucketPublic: documentiBucket?.public ?? null,
      legacyPublicDocumentUrlCount: storageDiag.legacyPublicDocumentUrlCount,
      storageOrphanObjectCount: storageDiag.storageOrphanObjectCount,
      rbacOperatorPilotSqlPresent: mig.rbacPilot,
      portalSecurityGuardSqlPresent: mig.portalSecurity,
      userPermissionsRlsPresent: mig.userPermissionsRls,
    };
  } catch {
    return base;
  }
}
