"use client";

import { useEffect } from "react";
import { gestionaleLogger } from "@/lib/observability/logger";
import { getRuntimeHealthSnapshot } from "@/lib/observability/runtime-health";

const SNAPSHOT_INTERVAL_MS = 120_000;

function shouldEmitHealthSnapshot(): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  return process.env.NEXT_PUBLIC_CAB_OPS_WARN === "1";
}

/** Log periodico snapshot health (dev / CAB_OPS_WARN). */
export function RuntimeHealthBridge(): null {
  useEffect(() => {
    if (!shouldEmitHealthSnapshot()) return;
    const id = window.setInterval(() => {
      gestionaleLogger.debug("ops.health.snapshot", {
        operation: "system",
        meta: getRuntimeHealthSnapshot(),
      });
    }, SNAPSHOT_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, []);

  return null;
}
