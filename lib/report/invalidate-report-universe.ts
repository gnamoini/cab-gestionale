"use client";

import type { QueryClient } from "@tanstack/react-query";
import { RuntimeEvents, trackRuntimeEvent } from "@/lib/observability/events";
import { bumpReportDataRefresh } from "@/lib/report/report-broadcast";
import {
  REPORT_UNIVERSE_GESTIONALE_TABLES,
  settingsRenameKindsAffectReport,
} from "@/lib/report/report-universe-constants";
import { executeInvalidateGestionaleTables } from "@/src/lib/react-query/invalidate-targets";
import { QK } from "@/src/lib/react-query/query-keys";

export { REPORT_UNIVERSE_GESTIONALE_TABLES, settingsRenameKindsAffectReport };

export type InvalidateReportUniverseOptions = {
  /** Evita `bumpReportDataRefresh` (es. refresh già schedulato da broadcast debounced). */
  skipReportBroadcast?: boolean;
  refetchType?: "active" | "all" | "none";
};

/**
 * Invalidazione coordinata di tutte le sorgenti report (snapshot allineato).
 * Non modifica query hook né backend — solo prefix React Query.
 */
export async function invalidateReportUniverse(
  queryClient: QueryClient,
  options?: InvalidateReportUniverseOptions,
): Promise<void> {
  const refetchType = options?.refetchType ?? "active";

  trackRuntimeEvent(RuntimeEvents.cacheInvalidateOperational, {
    domain: "report_universe",
    skipReportBroadcast: !!options?.skipReportBroadcast,
  });

  executeInvalidateGestionaleTables(queryClient, [...REPORT_UNIVERSE_GESTIONALE_TABLES], {
    refetchType,
  });

  await queryClient.invalidateQueries({
    queryKey: QK.reportManualEntries,
    refetchType,
  });

  if (!options?.skipReportBroadcast) {
    bumpReportDataRefresh();
  }
}
