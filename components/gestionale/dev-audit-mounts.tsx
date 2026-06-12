"use client";

import { DesignSystemLockMount } from "@/components/gestionale/design-system-lock-mount";
import { ResponsiveLayoutAuditMount } from "@/components/gestionale/responsive-layout-audit-mount";
import { UiOsShadowMount } from "@/components/gestionale/ui-os-shadow-mount";
import { HydrationConsistencyDebugMount } from "@/lib/render/hydration-consistency-debug";
import { QueryDedupDebugMount } from "@/lib/observability/query-dedup-debug";
import { EdgeRuntimeDebugMount } from "@/lib/observability/edge-runtime-debug";
import { RequestDecisionDebugMount } from "@/lib/observability/request-decision-debug";
import { AssetCacheDebugMount } from "@/lib/observability/asset-cache-debug";
import { RuntimeCoordinationDebugMount } from "@/lib/observability/runtime-coordination-debug";
import { VisualLayoutLinterMount } from "@/components/gestionale/visual-layout-linter-mount";

/** DEV-only audit tooling — imported dynamically from app-shell in development. */
export function DevAuditMounts() {
  return (
    <>
      <ResponsiveLayoutAuditMount />
      <VisualLayoutLinterMount />
      <DesignSystemLockMount />
      <UiOsShadowMount />
      <RuntimeCoordinationDebugMount />
      <AssetCacheDebugMount />
      <HydrationConsistencyDebugMount />
      <QueryDedupDebugMount />
      <EdgeRuntimeDebugMount />
      <RequestDecisionDebugMount />
    </>
  );
}
