"use client";

import { Profiler, type ProfilerOnRenderCallback, type ReactNode } from "react";
import { isBootInvestigationEnabled } from "@/lib/observability/boot-investigation-gate";
import { lazyCountRender } from "@/lib/observability/boot-investigation-lazy";
import { isReactRenderAuditEnabled, recordProfilerRender } from "@/lib/observability/react-render-audit";

type Props = {
  children: ReactNode;
};

const PROFILER_IDS = [
  "gestionale-main",
  "app-shell-content",
  "auth-gate-subtree",
] as const;

function makeOnRender(id: string): ProfilerOnRenderCallback {
  return (profilerId, phase, actualDuration) => {
    const phaseNorm =
      phase === "mount" || phase === "update" || phase === "nested-update" ? phase : "update";
    if (isReactRenderAuditEnabled()) {
      recordProfilerRender(profilerId || id, phaseNorm, actualDuration);
    }
    if (isBootInvestigationEnabled()) {
      lazyCountRender(profilerId || id, phaseNorm);
    }
  };
}

/** Dev-only — nested Profilers when RENDER_AUDIT or BOOT_INVESTIGATION enabled. */
export function ReactRenderAuditProfiler({ children }: Props) {
  const auditOn = isReactRenderAuditEnabled();
  const bootOn = isBootInvestigationEnabled();
  if (!auditOn && !bootOn) return <>{children}</>;

  let node: ReactNode = children;
  for (const id of PROFILER_IDS) {
    node = (
      <Profiler id={id} onRender={makeOnRender(id)}>
        {node}
      </Profiler>
    );
  }
  return <>{node}</>;
}
