"use client";

import { isRuntimeCoordinationTraceEnabled } from "@/lib/observability/config";
import {
  clearRuntimeTrace,
  getRuntimeTrace,
  getRuntimeTraceSummary,
} from "@/lib/observability/runtime-coordination-tracer";
import type { RuntimeTraceFilter } from "@/lib/observability/runtime-coordination-types";
import { useEffect } from "react";

export type GestionaleRuntimeCoordinationDebug = {
  getTrace: (filter?: RuntimeTraceFilter) => ReturnType<typeof getRuntimeTrace>;
  clear: () => void;
  summary: () => ReturnType<typeof getRuntimeTraceSummary>;
};

declare global {
  interface Window {
    __GESTIONALE_RC__?: GestionaleRuntimeCoordinationDebug;
  }
}

export function mountRuntimeCoordinationDebug(): void {
  if (!isRuntimeCoordinationTraceEnabled()) return;
  if (typeof window === "undefined") return;
  window.__GESTIONALE_RC__ = {
    getTrace: getRuntimeTrace,
    clear: clearRuntimeTrace,
    summary: getRuntimeTraceSummary,
  };
}

/** Attaches `window.__GESTIONALE_RC__` in development. */
export function RuntimeCoordinationDebugMount() {
  useEffect(() => {
    mountRuntimeCoordinationDebug();
  }, []);
  return null;
}
