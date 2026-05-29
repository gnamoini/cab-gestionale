"use client";

import type { QueryClient } from "@tanstack/react-query";
import { RuntimeEvents, trackRuntimeEvent } from "@/lib/observability/events";
import { invalidateOperationalTruth } from "@/src/lib/runtime/truth-layer/invalidate-runtime-truth";

export const REPORT_REFRESH_DEBOUNCE_MS = 400;

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let refreshInFlight = false;

/** Refresh mirato report (log + manual entries) senza loop broadcast. */
export function scheduleReportBroadcastRefresh(queryClient: QueryClient, onSettled?: () => void): void {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    if (refreshInFlight) {
      scheduleReportBroadcastRefresh(queryClient, onSettled);
      return;
    }
    refreshInFlight = true;
    void invalidateOperationalTruth({
      queryClient,
      domain: "report",
      skipReportBroadcast: true,
    })
      .then(() => onSettled?.())
      .catch(() => {
        trackRuntimeEvent(RuntimeEvents.reportDataError, { source: "broadcast_refresh" });
      })
      .finally(() => {
        refreshInFlight = false;
      });
  }, REPORT_REFRESH_DEBOUNCE_MS);
}
