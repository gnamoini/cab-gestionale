"use client";

import type { QueryClient } from "@tanstack/react-query";
import { invalidateMicSettings } from "@/lib/cache/minimal-invalidation-contract";
import { traceMutationLifecycle } from "@/lib/observability/trace-mutation-lifecycle";
import { dispatchGestionaleAction } from "@/lib/sync/gestionale-sync-dispatch";
import type { ServiceResult } from "@/src/services/service-result";

/**
 * Persistenza impostazioni + sync unificato (dispatch → invalidate QK.settings → cab-sync → broadcast).
 * Unico entry point post-write per `app_settings`.
 */
export async function persistSettingsRecord<T>(
  qc: QueryClient,
  write: () => Promise<ServiceResult<T>>,
): Promise<ServiceResult<T>> {
  const result = await write();
  if (result.success) {
    dispatchGestionaleAction(qc, ["app_settings"], {
      source: "local_mutation",
      cabSyncEvents: [{ type: "settings_updated" }],
    });
    void traceMutationLifecycle(
      { entityType: "settings", entityId: "global", operation: "persist" },
      () => invalidateMicSettings(qc),
    );
  }
  return result;
}
