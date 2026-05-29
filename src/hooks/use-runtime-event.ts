"use client";

import { useCallback } from "react";
import { trackRuntimeEvent, type RuntimeEventName } from "@/lib/observability/events";

export function useRuntimeEvent() {
  return useCallback((name: RuntimeEventName, meta?: Record<string, unknown>) => {
    trackRuntimeEvent(name, meta);
  }, []);
}
