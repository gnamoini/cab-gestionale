import fs from "node:fs";
import path from "node:path";
import { GESTIONALE_PERMISSION_MODULES } from "@/src/lib/permissions/gestionale-modules";
import type { ProductionReadinessCodeScan } from "@/lib/production/production-readiness-types";

const SCAN_ROOTS = ["app", "components", "lib", "src", "context", "scripts"] as const;
const SCAN_EXT = new Set([".ts", ".tsx"]);
const SKIP_DIRS = new Set(["node_modules", ".next", ".git", "dist", "build"]);

const SKIP_SCAN_PREFIXES = ["lib/production/"];

const LEGACY_PUBLIC_URL_ALLOWLIST = new Set([
  "lib/documenti/storage-path-from-stored.ts",
  /** Fixture URL legacy per assert su classify/resolve. */
  "lib/documenti/documento-file-access.test.ts",
]);

/** Test RBAC che invocano hasCapability/can_manage_settings (non production path). */
const RBAC_CAPABILITY_DIRECT_ALLOWLIST = new Set([
  "lib/rbac.capability.test.ts",
  "lib/regression/security-rbac-policy.test.ts",
]);

const PILOT_ENV_IMPORT_ALLOWLIST = new Set([
  "lib/permissions/operator-global-settings.ts",
  "lib/env/pilot-operator-settings.ts",
  "lib/permissions/operator-global-settings.test.ts",
]);

const USE_TOAST_ALLOWLIST = new Set([
  "context/toast-context.tsx",
  "src/hooks/use-gestionale-toast.ts",
  "context/upload-feedback-context.tsx",
  "src/providers/query-provider.tsx",
  "src/components/gestionale-notifications-bridge.tsx",
  "src/components/gestionale-realtime-bridge.tsx",
]);

/** Write legacy mezzi attrezzatura cols — bloccati in production scan (V2 SSOT). */
const LEGACY_MEZZI_WRITE_ALLOWLIST = new Set([
  "lib/domain/mezzo-attrezzatura/backfill-rules.ts",
  "lib/domain/mezzo-attrezzatura/upsert-from-scheda-v2.ts",
  "lib/regression/dto-mappers.test.ts",
  "lib/regression/intervento-export-ui-alignment.test.ts",
]);

const LEGACY_READ_ADAPTER_IMPORT_ALLOWLIST = new Set([
  "lib/mezzi/mezzi-db-ui-adapter.ts",
  "lib/mezzi/mezzi-attrezzature-batch.ts",
  "lib/domain/mezzo-attrezzatura/compose-mezzo-gestito.ts",
  "lib/domain/intervento-context/build-intervento-context.ts",
  "lib/data-import/entities/mezzi/mezzi-import-attrezzatura.server.ts",
]);

function normalizeRel(p: string): string {
  return p.replace(/\\/g, "/");
}

function walkSourceFiles(rootDir: string, base = rootDir): string[] {
  const out: string[] = [];
  if (!fs.existsSync(rootDir)) return out;
  for (const ent of fs.readdirSync(rootDir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(ent.name)) continue;
    const full = path.join(rootDir, ent.name);
    if (ent.isDirectory()) {
      out.push(...walkSourceFiles(full, base));
      continue;
    }
    const ext = path.extname(ent.name);
    if (!SCAN_EXT.has(ext)) continue;
    out.push(normalizeRel(path.relative(base, full)));
  }
  return out;
}

function scanMigrationsSql(repoRoot: string): {
  portalSecurity: boolean;
  userPermissionsRls: boolean;
  rbacPilot: boolean;
  permissionModulesInSql: string[];
} {
  const migDir = path.join(repoRoot, "supabase", "migrations");
  if (!fs.existsSync(migDir)) {
    return { portalSecurity: false, userPermissionsRls: false, rbacPilot: false, permissionModulesInSql: [] };
  }
  let sql = "";
  for (const f of fs.readdirSync(migDir)) {
    if (f.endsWith(".sql")) sql += `${fs.readFileSync(path.join(migDir, f), "utf8")}\n`;
  }
  const portalSecurity =
    sql.includes("rbac_is_restricted_app_settings_row") &&
    sql.includes("client_portal_access") &&
    sql.includes("can_manage_security") &&
    sql.includes("rbac_can_write_app_settings_row");
  const userPermissionsRls = sql.includes("user_effective_can") && sql.includes("rbac_module_can");
  const rbacPilot =
    sql.includes("enable_operator_global_settings") &&
    (sql.includes("rbac_pilot_operator_global_settings_enabled") ||
      sql.includes("rbac_operator_global_settings_db_enabled"));
  const permissionModulesInSql = GESTIONALE_PERMISSION_MODULES.filter((m) => sql.includes(`'${m}'`));
  return { portalSecurity, userPermissionsRls, rbacPilot, permissionModulesInSql };
}

function lineHits(content: string, pattern: RegExp): number[] {
  const lines: number[] = [];
  const rows = content.split(/\r?\n/);
  for (let i = 0; i < rows.length; i++) {
    if (pattern.test(rows[i]!)) lines.push(i + 1);
  }
  return lines;
}

/** Scansione statica repository (senza DB). */
export function scanProductionReadinessCode(repoRoot = process.cwd()): ProductionReadinessCodeScan {
  const files: { rel: string; content: string }[] = [];
  for (const root of SCAN_ROOTS) {
    const abs = path.join(repoRoot, root);
    for (const rel of walkSourceFiles(abs, repoRoot)) {
      if (SKIP_SCAN_PREFIXES.some((p) => rel.startsWith(p))) continue;
      files.push({ rel, content: fs.readFileSync(path.join(repoRoot, rel), "utf8") });
    }
  }

  const legacyResolveDocumentoFileUrlHits: ProductionReadinessCodeScan["legacyResolveDocumentoFileUrlHits"] = [];
  const legacySupabasePublicUrlInCodeHits: ProductionReadinessCodeScan["legacySupabasePublicUrlInCodeHits"] = [];
  const pilotEnvImportOutsideAllowlist: ProductionReadinessCodeScan["pilotEnvImportOutsideAllowlist"] = [];
  const rbacBypassOutsideCentralFunction: ProductionReadinessCodeScan["rbacBypassOutsideCentralFunction"] = [];
  const directUseToastHits: ProductionReadinessCodeScan["directUseToastHits"] = [];
  const legacyDialogHits: ProductionReadinessCodeScan["legacyDialogHits"] = [];
  const legacyMezziColumnWriteHits: ProductionReadinessCodeScan["legacyMezziColumnWriteHits"] = [];
  const legacyAdapterImportOutsideAllowlist: ProductionReadinessCodeScan["legacyAdapterImportOutsideAllowlist"] =
    [];

  let realtimePollingFallbackPresent = false;
  let logBatcherPresent = false;
  let isOperatorGlobalSettingsUsedInRbac = false;

  for (const { rel, content } of files) {
    if (SKIP_SCAN_PREFIXES.some((p) => rel.startsWith(p))) continue;

    if (
      rel === "lib/rbac.ts" &&
      (/operatore:\s*\{[\s\S]*?can_manage_settings:\s*true/.test(content) ||
        content.includes("isOperatorGlobalSettingsEnabled"))
    ) {
      isOperatorGlobalSettingsUsedInRbac = true;
    }

    if (rel.includes("gestionale-realtime-bridge")) {
      const hasPollingFallback = content.includes("startPollingFallback");
      const hasRealtimeSubscribe = content.includes("subscribePostgresChanges");
      const hasExclusiveTransport = content.includes("SyncTransportController");
      if (hasPollingFallback && hasRealtimeSubscribe && !hasExclusiveTransport) {
        realtimePollingFallbackPresent = true;
      }
    }

    if (rel.includes("log-modifiche-batcher")) {
      logBatcherPresent = true;
    }

    const rows = content.split(/\r?\n/);
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]!;
      if (/\bresolveDocumentoFileUrl\s*\(/.test(row) && !row.includes("resolveDocumentoFileUrlSigned")) {
        legacyResolveDocumentoFileUrlHits.push({ file: rel, line: i + 1 });
      }
    }

    if (!LEGACY_PUBLIC_URL_ALLOWLIST.has(rel)) {
      for (const line of lineHits(content, /storage\/v1\/object\/public\//)) {
        legacySupabasePublicUrlInCodeHits.push({ file: rel, line });
      }
    }

    if (
      content.includes("isPilotOperatorGlobalSettingsEnabled") &&
      !PILOT_ENV_IMPORT_ALLOWLIST.has(rel)
    ) {
      for (const line of lineHits(content, /isPilotOperatorGlobalSettingsEnabled/)) {
        pilotEnvImportOutsideAllowlist.push({ file: rel, line });
      }
    }

    if (rel === "lib/rbac.ts" && /isPilotOperatorGlobalSettingsEnabled|isOperatorGlobalSettingsEnvEnabled/.test(content)) {
      for (const line of lineHits(content, /isPilotOperatorGlobalSettingsEnabled|isOperatorGlobalSettingsEnvEnabled/)) {
        rbacBypassOutsideCentralFunction.push({ file: rel, line });
      }
    }

    if (
      /hasCapability\s*\([^)]*can_manage_settings/.test(content) &&
      !content.includes("isOperatorGlobalSettingsEnabled") &&
      rel !== "lib/auth/rbac.ts" &&
      !RBAC_CAPABILITY_DIRECT_ALLOWLIST.has(rel)
    ) {
      for (const line of lineHits(content, /can_manage_settings/)) {
        rbacBypassOutsideCentralFunction.push({ file: rel, line });
      }
    }

    if (/\buseToast\s*\(/.test(content) && !USE_TOAST_ALLOWLIST.has(rel)) {
      for (const line of lineHits(content, /\buseToast\s*\(/)) {
        directUseToastHits.push({ file: rel, line });
      }
    }

    if (/window\.(alert|confirm|prompt)\s*\(/.test(content) && !rel.includes("use-gestionale-confirm")) {
      for (const line of lineHits(content, /window\.(alert|confirm|prompt)\s*\(/)) {
        legacyDialogHits.push({ file: rel, line });
      }
    }

    if (!LEGACY_MEZZI_WRITE_ALLOWLIST.has(rel) && !rel.endsWith(".test.ts")) {
      const rows = content.split(/\r?\n/);
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]!;
        if (!/\b(marca|modello|matricola|tipo_attrezzatura)\s*:/.test(row)) continue;
        const windowText = rows.slice(Math.max(0, i - 2), i + 3).join("\n");
        const looksLikeMezziPayloadWrite =
          /\.from\s*\(\s*["']mezzi["']\s*\)\.(insert|update)\s*\(/.test(windowText) ||
          /attachMezzoEntityKey\s*\(\s*\{[\s\S]{0,400}\b(marca|modello|matricola|tipo_attrezzatura)\s*:/.test(windowText) ||
          /(MezzoInsert|MezzoUpdate)[\s\S]{0,120}\b(marca|modello|matricola|tipo_attrezzatura)\s*:/.test(windowText);
        if (looksLikeMezziPayloadWrite) {
          legacyMezziColumnWriteHits.push({ file: rel, line: i + 1 });
        }
      }
    }

    if (
      /from\s+["']@\/lib\/domain\/mezzo-attrezzatura\/compose-mezzo-gestito["']/.test(content) &&
      !LEGACY_READ_ADAPTER_IMPORT_ALLOWLIST.has(rel) &&
      !rel.endsWith(".test.ts")
    ) {
      for (const line of lineHits(content, /from\s+["']@\/lib\/domain\/mezzo-attrezzatura\/compose-mezzo-gestito["']/)) {
        legacyAdapterImportOutsideAllowlist.push({ file: rel, line });
      }
    }
  }

  const r4DropMigrationInAutoPath = fs.existsSync(
    path.join(repoRoot, "supabase", "migrations", "20260801120500_drop_mezzi_legacy_attrezzatura.sql"),
  );

  return {
    legacyResolveDocumentoFileUrlHits,
    legacySupabasePublicUrlInCodeHits,
    pilotEnvImportOutsideAllowlist,
    rbacBypassOutsideCentralFunction,
    directUseToastHits,
    legacyDialogHits,
    legacyMezziColumnWriteHits,
    legacyAdapterImportOutsideAllowlist,
    r4DropMigrationInAutoPath,
    realtimePollingFallbackPresent,
    logBatcherPresent,
    isOperatorGlobalSettingsUsedInRbac,
  };
}

export function scanProductionReadinessMigrations(repoRoot = process.cwd()) {
  return scanMigrationsSql(repoRoot);
}
