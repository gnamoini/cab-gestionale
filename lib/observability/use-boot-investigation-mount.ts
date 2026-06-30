"use client";

import { useEffect } from "react";
import { isBootInvestigationEnabled, logBoot } from "@/lib/observability/boot-investigation";

/** Log [MOUNT] / [UNMOUNT] for a component (dev investigation only). */
export function useBootInvestigationMount(name: string, meta?: Record<string, unknown>): void {
  useEffect(() => {
    if (!isBootInvestigationEnabled()) return;
    logBoot("MOUNT", name, meta);
    return () => {
      logBoot("UNMOUNT", name);
    };
  }, [name]);
}
