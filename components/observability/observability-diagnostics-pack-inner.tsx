"use client";

import { useEffect } from "react";
import { BootInvestigationMount } from "@/components/observability/boot-investigation-mount";
import { RuntimeHealthBridge } from "@/components/observability/runtime-health-bridge";

/** Heavy diagnostics — async chunk; mount via ObservabilityDiagnosticsPack only. */
export default function ObservabilityDiagnosticsPackInner() {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      void import("@/lib/observability/overflow-root-cause-audit");
    }
  }, []);

  return (
    <>
      <BootInvestigationMount />
      <RuntimeHealthBridge />
    </>
  );
}
