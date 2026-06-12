"use client";

import { Profiler, type ProfilerOnRenderCallback, type ReactNode } from "react";
import { isReactRenderAuditEnabled, recordProfilerRender } from "@/lib/observability/react-render-audit";

type Props = {
  children: ReactNode;
};

const onRender: ProfilerOnRenderCallback = (id, phase, actualDuration) => {
  const phaseNorm = phase === "mount" || phase === "update" || phase === "nested-update" ? phase : "update";
  recordProfilerRender(id, phaseNorm, actualDuration);
};

/** Dev-only — wraps main content with React Profiler when NEXT_PUBLIC_RENDER_AUDIT=1. */
export function ReactRenderAuditProfiler({ children }: Props) {
  if (!isReactRenderAuditEnabled()) return <>{children}</>;

  return (
    <Profiler id="gestionale-main" onRender={onRender}>
      {children}
    </Profiler>
  );
}
