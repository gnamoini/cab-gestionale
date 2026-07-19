"use client";

import dynamic from "next/dynamic";
import { isBootInvestigationEnabled } from "@/lib/observability/boot-investigation-gate";

const ObservabilityDiagnosticsPackInner = dynamic(
  () => import("@/components/observability/observability-diagnostics-pack-inner"),
  { ssr: false },
);

/** Dynamic diagnostics — boot timeline, health bridge, overflow audit. */
export function ObservabilityDiagnosticsPack() {
  if (!isBootInvestigationEnabled()) return null;
  return <ObservabilityDiagnosticsPackInner />;
}
