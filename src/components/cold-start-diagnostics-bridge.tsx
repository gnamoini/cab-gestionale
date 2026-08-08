"use client";

import { useEffect } from "react";

/** Lazy cold-start diagnostics — paint/SW observers + __cabColdStartReport export. */
export function ColdStartDiagnosticsBridge() {
  useEffect(() => {
    void import("@/lib/observability/cold-start-diagnostics").then((mod) => {
      mod.initColdStartDiagnostics();
    });
  }, []);

  return null;
}
