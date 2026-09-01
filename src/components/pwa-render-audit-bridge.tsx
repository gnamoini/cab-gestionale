"use client";

import { useEffect } from "react";
import { isPwaRenderAuditEnabled } from "@/lib/observability/pwa-render-audit-gate";

/** Lazy PWA render audit — __cabPwaRenderAudit + __cabPwaRenderCacheParity export. */
export function PwaRenderAuditBridge() {
  useEffect(() => {
    if (!isPwaRenderAuditEnabled()) return;
    void import("@/lib/observability/pwa-render-diagnostics").then((mod) => {
      mod.initPwaRenderDiagnostics();
    });
  }, []);

  return null;
}
