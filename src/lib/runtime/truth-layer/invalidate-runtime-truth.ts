"use client";

import type { QueryClient } from "@tanstack/react-query";
import { noteInvalidationTruthSpike } from "@/lib/observability/degradation-detector";
import { RuntimeEvents, trackRuntimeEvent } from "@/lib/observability/events";
import { measureAsync } from "@/lib/observability/perf";
import { QK } from "@/src/lib/react-query/query-keys";
import { clearRuntimeCabAppSettings } from "@/src/lib/app-settings/runtime-settings-cache";
import { invalidateAllGestionaleOperationalQueries } from "@/lib/realtime/gestionale-realtime-config";

export type InvalidateRuntimeTruthReason =
  | "logout"
  | "sessionEstablished"
  | "roleOrPermissionsChanged"
  | "pilotChanged"
  | "appSettingsChanged";

export type InvalidateRuntimeTruthOptions = {
  reason: InvalidateRuntimeTruthReason;
  queryClient: QueryClient;
  /** Dopo mutazioni auth-critical: refetch permessi + settings. */
  refreshOperational?: boolean;
};

const COALESCE_REASONS: ReadonlySet<InvalidateRuntimeTruthReason> = new Set([
  "sessionEstablished",
  "roleOrPermissionsChanged",
  "pilotChanged",
  "appSettingsChanged",
]);

const inFlightByClient = new WeakMap<QueryClient, Map<InvalidateRuntimeTruthReason, Promise<void>>>();

const spikeWindowMs = 2000;
const spikeByReason = new Map<InvalidateRuntimeTruthReason, { count: number; windowStart: number }>();

function noteTruthInvalidateSpike(reason: InvalidateRuntimeTruthReason): void {
  const now = Date.now();
  const prev = spikeByReason.get(reason);
  if (!prev || now - prev.windowStart > spikeWindowMs) {
    spikeByReason.set(reason, { count: 1, windowStart: now });
    return;
  }
  prev.count += 1;
  if (prev.count > 3) {
    trackRuntimeEvent(RuntimeEvents.cacheInvalidateTruthSpike, { reason, count: prev.count });
    noteInvalidationTruthSpike(reason, prev.count);
  }
}

async function runInvalidateRuntimeTruth(opts: InvalidateRuntimeTruthOptions): Promise<void> {
  const { reason, queryClient, refreshOperational = false } = opts;
  noteTruthInvalidateSpike(reason);

  if (reason === "appSettingsChanged") {
    clearRuntimeCabAppSettings();
  }

  await measureAsync(`invalidate.truth.${reason}`, "cache", async () => {
    const tasks: Promise<unknown>[] = [
      queryClient.invalidateQueries({ queryKey: QK.userPermissions, refetchType: "active" }),
      queryClient.invalidateQueries({ queryKey: QK.settings, refetchType: "active" }),
      queryClient.invalidateQueries({ queryKey: QK.profiles, refetchType: "active" }),
    ];

    if (reason === "roleOrPermissionsChanged" || reason === "pilotChanged" || reason === "appSettingsChanged") {
      tasks.push(
        queryClient.invalidateQueries({ queryKey: QK.securityUsersPermissions, refetchType: "active" }),
        queryClient.invalidateQueries({ queryKey: QK.securityUsers, refetchType: "active" }),
      );
    }

    if (reason === "roleOrPermissionsChanged") {
      tasks.push(
        queryClient.invalidateQueries({ queryKey: QK.log, refetchType: "active" }),
        queryClient.invalidateQueries({ queryKey: QK.authUsers, refetchType: "active" }),
        queryClient.invalidateQueries({ queryKey: QK.authLogs, refetchType: "active" }),
      );
    }

    if (refreshOperational || reason === "appSettingsChanged") {
      invalidateAllGestionaleOperationalQueries(queryClient);
    }

    await Promise.all(tasks);
  });

  trackRuntimeEvent(RuntimeEvents.cacheInvalidateTruth, { reason });
}

/** Hub client per invalidare cache auth/permessi/pilot e opzionalmente dati operativi. */
export async function invalidateRuntimeTruth(opts: InvalidateRuntimeTruthOptions): Promise<void> {
  const { reason, queryClient } = opts;

  if (!COALESCE_REASONS.has(reason)) {
    await runInvalidateRuntimeTruth(opts);
    return;
  }

  let map = inFlightByClient.get(queryClient);
  if (!map) {
    map = new Map();
    inFlightByClient.set(queryClient, map);
  }

  const existing = map.get(reason);
  if (existing) {
    trackRuntimeEvent(RuntimeEvents.cacheInvalidateTruthCoalesced, { reason });
    await existing;
    return;
  }

  const run = runInvalidateRuntimeTruth(opts).finally(() => {
    map!.delete(reason);
  });
  map.set(reason, run);
  await run;
}

export {
  invalidateOperationalTruth,
  type InvalidateOperationalTruthOptions,
  type OperationalTruthDomain,
} from "@/src/lib/runtime/truth-layer/invalidate-operational-truth";
export {
  invalidateReportUniverse,
  type InvalidateReportUniverseOptions,
} from "@/lib/report/invalidate-report-universe";
export {
  REPORT_UNIVERSE_GESTIONALE_TABLES,
  settingsRenameKindsAffectReport,
} from "@/lib/report/report-universe-constants";
