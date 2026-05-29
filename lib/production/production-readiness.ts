import { isOperatorGlobalSettingsEnabled } from "@/lib/permissions/operator-global-settings";
import { GESTIONALE_PERMISSION_MODULES } from "@/src/lib/permissions/gestionale-modules";
import { validateProductionEnv } from "@/lib/ops/validate-production-env";
import { scanProductionReadinessCode, scanProductionReadinessMigrations } from "@/lib/production/production-readiness-scan";
import type {
  ProductionReadinessDbSnapshot,
  ProductionReadinessFinding,
  ProductionReadinessInput,
  ProductionReadinessResult,
} from "@/lib/production/production-readiness-types";

function isOperatorSettingsEnvEnabled(env: NodeJS.ProcessEnv): boolean {
  return env.NEXT_PUBLIC_ENABLE_OPERATOR_GLOBAL_SETTINGS?.trim() === "1";
}

function isProductionDeployTarget(env: NodeJS.ProcessEnv): boolean {
  const nodeEnv = env.NODE_ENV?.trim().toLowerCase() ?? "";
  const vercelEnv = env.VERCEL_ENV?.trim().toLowerCase() ?? "";
  return nodeEnv === "production" || vercelEnv === "production";
}

function pushFinding(
  list: ProductionReadinessFinding[],
  finding: ProductionReadinessFinding,
): void {
  list.push(finding);
}

function formatHits(hits: { file: string; line: number }[], max = 5): string {
  const slice = hits.slice(0, max);
  const tail = hits.length > max ? ` (+${hits.length - max} altre)` : "";
  return slice.map((h) => `${h.file}:${h.line}`).join(", ") + tail;
}

/**
 * Valuta se il gestionale è pronto per il deploy in produzione.
 * Combina env, scan codice, migration SQL (statiche) e snapshot DB opzionale.
 */
export function validateProductionReadiness(input: ProductionReadinessInput = {}): ProductionReadinessResult {
  const env = input.env ?? process.env;
  const codeScan = input.codeScan ?? scanProductionReadinessCode();
  const migSql = scanProductionReadinessMigrations();
  const db: ProductionReadinessDbSnapshot = input.db ?? {
    connected: false,
    operatorGlobalSettingsDbEnabled: false,
    documentiBucketPublic: null,
    legacyPublicDocumentUrlCount: 0,
    storageOrphanObjectCount: null,
    rbacOperatorPilotSqlPresent: migSql.rbacPilot,
    portalSecurityGuardSqlPresent: migSql.portalSecurity,
    userPermissionsRlsPresent: migSql.userPermissionsRls,
  };

  const blockers: ProductionReadinessFinding[] = [];
  const warnings: ProductionReadinessFinding[] = [];
  const productionTarget = isProductionDeployTarget(env);
  const envPilot = isOperatorSettingsEnvEnabled(env);
  const opsEnv = validateProductionEnv(env);

  for (const f of opsEnv.blockers) pushFinding(blockers, f);
  for (const f of opsEnv.warnings) pushFinding(warnings, f);

  // —— SECURITY / RLS ——
  if (!migSql.portalSecurity && !db.portalSecurityGuardSqlPresent) {
    pushFinding(blockers, {
      id: "security-portal-acl-missing",
      category: "security",
      message: "Override portale clienti (app_settings) senza guard admin-only in migration SQL.",
      detail: "Atteso rbac_is_restricted_app_settings_row + can_manage_security su client_portal_access.",
    });
  }

  if (!migSql.userPermissionsRls && !db.userPermissionsRlsPresent) {
    pushFinding(blockers, {
      id: "security-user-permissions-rls-missing",
      category: "security",
      message: "RLS user_permissions non allineata: manca user_effective_can / rbac_module_can nelle migration.",
    });
  } else {
    const missingInSql = GESTIONALE_PERMISSION_MODULES.filter(
      (m) => !migSql.permissionModulesInSql.includes(m),
    );
    if (missingInSql.length > 0) {
      pushFinding(blockers, {
        id: "security-user-permissions-module-mismatch",
        category: "security",
        message: "Moduli UI user_permissions non presenti in migration RLS.",
        detail: `Mancanti in SQL: ${missingInSql.join(", ")}`,
      });
    }
  }

  if (db.connected && db.operatorGlobalSettingsDbEnabled) {
    pushFinding(blockers, {
      id: "feature-flag-db-operator-settings",
      category: "feature-flag",
      message: "app_settings.system.enable_operator_global_settings è attivo nel database.",
      detail: "Disattivare prima del deploy production.",
    });
  } else if (!db.connected && migSql.rbacPilot) {
    pushFinding(warnings, {
      id: "security-rbac-pilot-sql-present",
      category: "security",
      message: "Funzione SQL pilot operatore presente nelle migration (verificare flag DB disattivato).",
    });
  }

  // —— STORAGE ——
  if (db.connected && db.documentiBucketPublic === true) {
    pushFinding(blockers, {
      id: "storage-documenti-bucket-public",
      category: "storage",
      message: "Bucket storage «documenti» è public=true.",
      detail: "Richiesto bucket privato con signed URL.",
    });
  }

  if (db.connected && db.legacyPublicDocumentUrlCount > 0) {
    pushFinding(blockers, {
      id: "storage-legacy-document-urls",
      category: "storage",
      message: `Trovati ${db.legacyPublicDocumentUrlCount} documenti con URL http(s) legacy in url_file.`,
    });
  }

  const orphanThreshold = Number(process.env.OPS_STORAGE_ORPHAN_WARN_THRESHOLD ?? "10");
  if (
    db.connected &&
    db.storageOrphanObjectCount != null &&
    db.storageOrphanObjectCount > orphanThreshold
  ) {
    pushFinding(warnings, {
      id: "storage-orphan-objects-advisory",
      category: "storage",
      message: `Rilevati ${db.storageOrphanObjectCount} oggetti storage «documenti» senza riga DB (campione).`,
      detail: `Soglia warning: ${orphanThreshold}. Eseguire npm run ops:diagnostics.`,
    });
  }

  if (codeScan.legacySupabasePublicUrlInCodeHits.length > 0) {
    pushFinding(blockers, {
      id: "storage-public-url-in-code",
      category: "storage",
      message: "Riferimenti a URL storage pubblici Supabase nel codice.",
      detail: formatHits(codeScan.legacySupabasePublicUrlInCodeHits),
    });
  }

  if (codeScan.legacyResolveDocumentoFileUrlHits.length > 0) {
    pushFinding(blockers, {
      id: "storage-resolve-documento-legacy",
      category: "storage",
      message: "API legacy apertura documenti (resolveDocumento*) ancora presente nel codebase.",
      detail: formatHits(codeScan.legacyResolveDocumentoFileUrlHits),
    });
  }

  // —— FEATURE FLAGS ——
  if (envPilot) {
    pushFinding(blockers, {
      id: "feature-flag-env-operator-settings",
      category: "feature-flag",
      message: "NEXT_PUBLIC_ENABLE_OPERATOR_GLOBAL_SETTINGS è attivo.",
      detail: productionTarget
        ? "Rilevato ambiente production: disabilitare prima del deploy."
        : "Rimuovere o impostare ≠ 1 prima del deploy production.",
    });
  }

  if (!db.connected && input.requireDb) {
    pushFinding(blockers, {
      id: "feature-flag-db-not-checked",
      category: "database",
      message: "Impossibile verificare app_settings.system.enable_operator_global_settings (DB non connesso).",
    });
  }

  if (
    db.connected &&
    isOperatorSettingsEnvEnabled(env) &&
    isOperatorGlobalSettingsEnabled(db.operatorGlobalSettingsDbEnabled)
  ) {
    pushFinding(blockers, {
      id: "feature-flag-pilot-combined-active",
      category: "feature-flag",
      message: "Pilot impostazioni operatore attivo (env ∧ DB).",
    });
  } else if (envPilot && !db.connected) {
    pushFinding(warnings, {
      id: "feature-flag-env-only-unverified",
      category: "feature-flag",
      message: "Env pilot attivo: verificare che il flag DB sia disattivato prima del deploy.",
    });
  }

  // —— RBAC CONSISTENCY ——
  if (!codeScan.isOperatorGlobalSettingsUsedInRbac) {
    pushFinding(blockers, {
      id: "rbac-central-function-missing",
      category: "rbac",
      message: "lib/rbac.ts non abilita can_manage_settings per operatore (matrice o pilot centralizzato).",
    });
  }

  if (codeScan.pilotEnvImportOutsideAllowlist.length > 0) {
    pushFinding(blockers, {
      id: "rbac-pilot-env-bypass",
      category: "rbac",
      message: "Bypass pilot env-only fuori dalla funzione centralizzata.",
      detail: formatHits(codeScan.pilotEnvImportOutsideAllowlist),
    });
  }

  if (codeScan.rbacBypassOutsideCentralFunction.length > 0) {
    pushFinding(blockers, {
      id: "rbac-has-capability-bypass",
      category: "rbac",
      message: "hasCapability / can_manage_settings usato fuori dal pattern centralizzato.",
      detail: formatHits(codeScan.rbacBypassOutsideCentralFunction),
    });
  }

  // —— WARNINGS (UX / osservabilità) ——
  if (codeScan.directUseToastHits.length > 0) {
    pushFinding(warnings, {
      id: "ux-toast-not-centralized",
      category: "ux",
      message: "useToast diretto ancora presente (preferire useGestionaleToast).",
      detail: formatHits(codeScan.directUseToastHits, 8),
    });
  }

  if (codeScan.legacyDialogHits.length > 0) {
    pushFinding(warnings, {
      id: "ux-legacy-dialogs",
      category: "ux",
      message: "window.alert / confirm / prompt legacy ancora presenti.",
      detail: formatHits(codeScan.legacyDialogHits),
    });
  }

  if (codeScan.logBatcherPresent) {
    pushFinding(warnings, {
      id: "ux-log-dedup-review",
      category: "ux",
      message: "Verificare manualmente che log_modifiche sia completamente deduplicato (batcher presente).",
    });
  }

  pushFinding(warnings, {
    id: "ux-loading-states-review",
    category: "ux",
    message: "Alcune view potrebbero avere loading states non uniformi (revisione manuale consigliata).",
  });

  if (codeScan.realtimePollingFallbackPresent) {
    pushFinding(warnings, {
      id: "ux-realtime-polling-fallback",
      category: "ux",
      message: "Realtime: fallback polling e websocket coesistono (comportamento atteso offline, verificare in prod).",
    });
  }

  if (!db.connected) {
    pushFinding(warnings, {
      id: "database-snapshot-skipped",
      category: "database",
      message: "Check database non eseguiti (service role / Supabase non disponibili).",
      detail: "Eseguire dalla UI Production Readiness o CI con SUPABASE_SERVICE_ROLE_KEY.",
    });
  }

  const blockerMessages = blockers.map((b) => (b.detail ? `${b.message} — ${b.detail}` : b.message));
  const warningMessages = warnings.map((w) => (w.detail ? `${w.message} — ${w.detail}` : w.message));

  return {
    ready: blockers.length === 0,
    blockers: blockerMessages,
    warnings: warningMessages,
    findings: { blockers, warnings },
    checkedAt: new Date().toISOString(),
    meta: {
      dbChecked: db.connected,
      codeScanned: true,
      productionTarget,
    },
  };
}
