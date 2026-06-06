import type { QueryClient } from "@tanstack/react-query";
import {
  collectLongSessionMetrics,
  type LongSessionMetricsSnapshot,
} from "@/lib/observability/long-session-metrics";

declare global {
  interface Window {
    __cabLongSessionMetrics?: () => LongSessionMetricsSnapshot;
  }
}

/** Espone metriche long-session in console dev (`window.__cabLongSessionMetrics()`). */
export function installLongSessionDevHook(queryClient: QueryClient): void {
  if (typeof window === "undefined") return;
  window.__cabLongSessionMetrics = () =>
    collectLongSessionMetrics(queryClient.getQueryCache().getAll().length);
}
