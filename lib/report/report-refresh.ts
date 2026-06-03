"use client";

import type { QueryClient } from "@tanstack/react-query";
import { RuntimeEvents, trackRuntimeEvent } from "@/lib/observability/events";
import { invalidateReportUniverse } from "@/lib/report/invalidate-report-universe";

export const REPORT_REFRESH_DEBOUNCE_MS = 400;
export const REPORT_DRIFT_REFRESH_COOLDOWN_MS = 60_000;

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let refreshInFlight = false;
let lastUniverseRefreshAt = 0;

export function resetReportRefreshStateForTests(): void {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = null;
  refreshInFlight = false;
  lastUniverseRefreshAt = 0;
}

/** Refresh coordinato report (universo query) senza loop broadcast. */
export function scheduleReportBroadcastRefresh(
  queryClient: QueryClient,
  onSettled?: () => void,
  options?: { force?: boolean },
): void {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    if (refreshInFlight) {
      scheduleReportBroadcastRefresh(queryClient, onSettled, options);
      return;
    }

    const now = Date.now();
    if (!options?.force && now - lastUniverseRefreshAt < REPORT_DRIFT_REFRESH_COOLDOWN_MS) {
      trackRuntimeEvent(RuntimeEvents.cacheInvalidateOperational, {
        domain: "report_universe",
        skipped: true,
        reason: "drift_cooldown",
      });
      onSettled?.();
      return;
    }

    refreshInFlight = true;
    lastUniverseRefreshAt = now;
    void invalidateReportUniverse(queryClient, { skipReportBroadcast: true })
      .then(() => onSettled?.())
      .catch(() => {
        trackRuntimeEvent(RuntimeEvents.reportDataError, { source: "broadcast_refresh" });
      })
      .finally(() => {
        refreshInFlight = false;
      });
  }, REPORT_REFRESH_DEBOUNCE_MS);
}
