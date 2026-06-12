"use client";

import { isHydrationConsistencyAuditEnabled } from "@/lib/observability/config";
import {
  getHydrationMismatches,
  printHydrationConsistencyReport,
  resetHydrationConsistencyAudit,
} from "@/lib/render/hydration-consistency-audit";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

export type GestionaleRenderPathDebug = {
  report: typeof printHydrationConsistencyReport;
  mismatches: typeof getHydrationMismatches;
  reset: typeof resetHydrationConsistencyAudit;
};

declare global {
  interface Window {
    __GESTIONALE_RENDER_PATH__?: GestionaleRenderPathDebug;
  }
}

export function mountHydrationConsistencyDebug(): void {
  if (!isHydrationConsistencyAuditEnabled()) return;
  if (typeof window === "undefined") return;
  window.__GESTIONALE_RENDER_PATH__ = {
    report: printHydrationConsistencyReport,
    mismatches: getHydrationMismatches,
    reset: resetHydrationConsistencyAudit,
  };
}

export function HydrationConsistencyDebugMount() {
  const qc = useQueryClient();
  useEffect(() => {
    mountHydrationConsistencyDebug();
    if (!isHydrationConsistencyAuditEnabled()) return;
    const keys = qc.getQueryCache().getAll().map((q) => q.queryKey);
    void import("@/lib/render/hydration-consistency-audit").then((m) => m.auditDehydratedKeys(keys));
  }, [qc]);
  return null;
}
