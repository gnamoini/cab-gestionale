/**
 * Maps inventory items → control registry/catalog references.
 */
import { CONTROL_REGISTRY } from "@/lib/control/registry";
import { CONTROL_CATALOG } from "@/lib/control/catalog";

export type InventoryItem = {
  kind: string;
  id: string;
  path: string;
  detail?: string;
};

/** Dev tooling excluded from coverage failure (Sprint 6 warning-only). */
const DEV_TOOLING_EXCLUDE =
  /^(debug|probe|analyze|form-ux:map:(?!gate)|map-promotion|map-wave)/i;

const NPM_TO_CONTROL: Record<string, string> = {
  "ci:tsc": "security.typescript.compile",
  "ci:build": "domain.build.production",
  "test:rbac": "security.rbac.matrix",
  "test:rbac:hardening": "security.rbac.hardening",
  "ux:enforce": "design.ux.enforce",
  "audit:ui": "design.ui.consistency",
  "ux:mobile-gate": "design.mobile.gate",
  "ios:check": "design.ios.static",
  "production:check": "data.production.readiness",
  "smoke:structural": "design.structural.smoke",
  "flex:eslint:gate": "design.flex.eslint",
  "flex:freeze:gate": "design.flex.freeze",
  "smoke:playwright": "runtime.e2e.smoke",
  "control:review": "governance.control.review",
  "control:parity": "governance.control.review",
  "control:certify": "governance.production.certification",
};

export function isDevToolingExcluded(id: string): boolean {
  return DEV_TOOLING_EXCLUDE.test(id);
}

export function resolveInventoryToControl(item: InventoryItem): string | undefined {
  if (item.kind === "npm-script") {
    if (isDevToolingExcluded(item.id)) return undefined;
    if (NPM_TO_CONTROL[item.id]) return NPM_TO_CONTROL[item.id];
    if (item.id.startsWith("control:")) return "governance.control.review";
  }
  if (item.kind === "regression-test") {
    return "governance.regression.classification";
  }
  return undefined;
}

export type CoverageGap = {
  inventoryId: string;
  kind: string;
  path: string;
  domain: string;
  mappedControl?: string;
};

export function computeCoverageGaps(inventory: {
  npmScripts: InventoryItem[];
  workflowSteps: InventoryItem[];
  scriptFiles: InventoryItem[];
}): CoverageGap[] {
  const gaps: CoverageGap[] = [];
  const allItems = [...inventory.npmScripts, ...inventory.workflowSteps, ...inventory.scriptFiles];

  for (const item of allItems) {
    if (item.kind === "npm-script" && isDevToolingExcluded(item.id)) continue;
    const mapped = resolveInventoryToControl(item);
    if (mapped && CONTROL_REGISTRY.some((c) => c.id === mapped)) continue;
    if (item.kind === "npm-script" && /gate|audit|smoke|regression|production|control|rbac|flex|ios|ux:|ci:/i.test(item.id)) {
      const domain = inferDomain(item);
      gaps.push({
        inventoryId: item.id,
        kind: item.kind,
        path: item.path,
        domain,
        mappedControl: mapped,
      });
    }
  }
  return gaps;
}

function inferDomain(item: InventoryItem): string {
  const hay = `${item.id} ${item.path} ${item.detail ?? ""}`;
  if (/rbac|security|auth|permission/i.test(hay)) return "security";
  if (/production|supabase|migration|import|export|data|rls/i.test(hay)) return "data";
  if (/cert|production:check|release/i.test(hay)) return "production";
  if (/design|ux|ui|flex|modal/i.test(hay)) return "design";
  return "governance";
}

export function catalogReferenceCoverage(): number {
  const refs = new Set(CONTROL_REGISTRY.map((c) => c.implementation.reference));
  let covered = 0;
  for (const ref of refs) {
    if (CONTROL_CATALOG[ref]) covered += 1;
  }
  return refs.size === 0 ? 1 : covered / refs.size;
}
