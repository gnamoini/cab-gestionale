import { REGRESSION_CORE, REGRESSION_EXTENDED } from "@/lib/regression/smoke-regression-lists";
import { registerClassificationMeta } from "@/lib/control/suites/regression-classification-meta";
import { P0_CRITICAL_SET } from "@/lib/control/suites/regression-p0-critical";
import {
  SECURITY_RBAC_HARDENING_SUITE,
  SECURITY_RBAC_SUITE,
} from "@/lib/control/suites/security-rbac.suite";

export const P0_MIN = 35;
export const P0_MAX = 95;

const RBAC_SUITE_SET = new Set([...SECURITY_RBAC_SUITE, ...SECURITY_RBAC_HARDENING_SUITE]);

const P0_PATTERNS = [
  /rbac/i,
  /security/i,
  /auth\//i,
  /permission/i,
  /portal/i,
  /tenant/i,
  /user-ban/i,
  /role-switch/i,
  /input-security/i,
  /forms-save/i,
  /publication-gate/i,
  /production-gate/i,
  /documenti-file/i,
  /documento-file-access/i,
  /fatturazione.*write/i,
  /fatturazione.*policy/i,
  /import-export-migration-gate/i,
  /import-files-boundary/i,
  /import-core-state/i,
  /supabase-publication/i,
  /http-security/i,
  /workflow/i,
  /write-audit/i,
  /write-graph/i,
  /rls/i,
  /session/i,
  /migration-gate/i,
  /document-capture.*invariant/i,
  /data-import/i,
  /billing/i,
  /ddt/i,
  /stock-/i,
  /spare-parts/i,
  /identifica-ricambio/i,
  /page-metadata-policy/i,
];

const P2_PATTERNS = [
  /design-system/i,
  /modal-/i,
  /ui-consistency/i,
  /flex-/i,
  /layout-/i,
  /loading-design/i,
  /report-design/i,
  /mobile-focus/i,
  /global-table/i,
  /debug-instrumentation/i,
  /audit-signoff/i,
  /form-ux-migration-(coverage|shadow)/i,
];

const P3_CORE_PATTERNS = [
  /form-ux-migration-enforcement/i,
  /form-ux-enforcement-phase/i,
  /form-ux-governance/i,
  /form-ux-map-/i,
  /map-promotion/i,
  /map-wave/i,
];

function matchesAny(file: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(file));
}

function isP0(file: string): boolean {
  return P0_CRITICAL_SET.has(file) || matchesAny(file, P0_PATTERNS);
}

function partitionCore(): { p0: string[]; p1: string[]; p2: string[]; p3: string[] } {
  const p0: string[] = [];
  const p1: string[] = [];
  const p2: string[] = [];
  const p3: string[] = [];
  for (const file of REGRESSION_CORE) {
    if (RBAC_SUITE_SET.has(file)) continue;
    if (matchesAny(file, P3_CORE_PATTERNS)) {
      p3.push(file);
      registerClassificationMeta({ test: file, tier: "P3", reason: "ux-only" });
      continue;
    }
    if (matchesAny(file, P2_PATTERNS)) {
      p2.push(file);
      registerClassificationMeta({ test: file, tier: "P2", reason: "ux-only" });
      continue;
    }
    if (isP0(file)) {
      p0.push(file);
      continue;
    }
    p1.push(file);
    registerClassificationMeta({ test: file, tier: "P1", reason: "customer-impact" });
  }
  return { p0, p1, p2, p3 };
}

function partitionExtended(): { p0: string[]; p2: string[]; p3: string[] } {
  const p0: string[] = [];
  const p2: string[] = [];
  const p3: string[] = [];
  for (const file of REGRESSION_EXTENDED) {
    if (isP0(file)) {
      p0.push(file);
      continue;
    }
    if (matchesAny(file, P3_CORE_PATTERNS) || /form-ux-map/i.test(file)) {
      p3.push(file);
      registerClassificationMeta({ test: file, tier: "P3", reason: "ux-only" });
      continue;
    }
    if (matchesAny(file, P2_PATTERNS)) {
      p2.push(file);
      registerClassificationMeta({ test: file, tier: "P2", reason: "ux-only" });
      continue;
    }
    p3.push(file);
    registerClassificationMeta({ test: file, tier: "P3", reason: "ux-only" });
  }
  return { p0, p2, p3 };
}

const coreParts = partitionCore();
const extParts = partitionExtended();

export const REGRESSION_P0: readonly string[] = [...coreParts.p0, ...extParts.p0];
export const REGRESSION_P1: readonly string[] = coreParts.p1;
export const REGRESSION_P2: readonly string[] = [...coreParts.p2, ...extParts.p2];
export const REGRESSION_P3: readonly string[] = [...coreParts.p3, ...extParts.p3];

export const REGRESSION_ALL_CLASSIFIED: readonly string[] = [
  ...REGRESSION_P0,
  ...REGRESSION_P1,
  ...REGRESSION_P2,
  ...REGRESSION_P3,
  ...SECURITY_RBAC_SUITE,
  ...SECURITY_RBAC_HARDENING_SUITE,
];

export const REGRESSION_LEGACY_ALL: readonly string[] = [...REGRESSION_CORE, ...REGRESSION_EXTENDED];
