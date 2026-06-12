"use client";

import { useEffect } from "react";
import { isRequestDecisionAuditEnabled } from "@/lib/observability/config";
import {
  getDecisionAlignedCount,
  getDecisionAuditEvents,
  getDecisionMismatchCount,
  resetDecisionAudit,
} from "@/lib/observability/request-decision-audit";

export type RequestDecisionAuditDebug = {
  report: () => void;
  events: typeof getDecisionAuditEvents;
  mismatches: typeof getDecisionMismatchCount;
  aligned: typeof getDecisionAlignedCount;
  reset: typeof resetDecisionAudit;
};

declare global {
  interface Window {
    __REQUEST_DECISION_AUDIT__?: RequestDecisionAuditDebug;
  }
}

function printDecisionReport(): void {
  console.groupCollapsed("[RDR] audit report");
  console.table({
    mismatches: getDecisionMismatchCount(),
    aligned: getDecisionAlignedCount(),
  });
  console.table(getDecisionAuditEvents().slice(-20));
  console.groupEnd();
}

export function mountRequestDecisionDebug(): void {
  if (!isRequestDecisionAuditEnabled()) return;
  if (typeof window === "undefined") return;
  window.__REQUEST_DECISION_AUDIT__ = {
    report: printDecisionReport,
    events: getDecisionAuditEvents,
    mismatches: getDecisionMismatchCount,
    aligned: getDecisionAlignedCount,
    reset: resetDecisionAudit,
  };
}

export function RequestDecisionDebugMount() {
  useEffect(() => {
    mountRequestDecisionDebug();
  }, []);
  return null;
}
