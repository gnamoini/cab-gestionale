"use client";

import type { QueryClient } from "@tanstack/react-query";
import { clearClientEffectivePermissionsSnapshotCache } from "@/src/lib/runtime/truth-layer/client-effective-permissions-cache";
import {
  invalidateRuntimeTruth,
  type InvalidateRuntimeTruthReason,
} from "@/src/lib/runtime/truth-layer/invalidate-runtime-truth";
import { clearStickyRbacSnapshot } from "@/src/lib/rbac/sticky-rbac-snapshot";

export type InvalidateRbacTruthClientOptions = {
  reason: InvalidateRuntimeTruthReason;
  queryClient: QueryClient;
  affectedUserId?: string;
  currentUserId?: string | null;
  refreshAuth?: () => Promise<void>;
};

/** Hub client: invalida tutte le cache RBAC in-memory + React Query. */
export async function invalidateRbacTruthClient(opts: InvalidateRbacTruthClientOptions): Promise<void> {
  const shouldClearSnapshots =
    opts.reason === "logout" ||
    opts.reason === "roleOrPermissionsChanged" ||
    opts.reason === "appSettingsChanged" ||
    opts.reason === "pilotChanged";

  if (shouldClearSnapshots) {
    clearClientEffectivePermissionsSnapshotCache();
    clearStickyRbacSnapshot();
  }

  await invalidateRuntimeTruth({
    reason: opts.reason,
    queryClient: opts.queryClient,
    refreshOperational:
      opts.reason === "roleOrPermissionsChanged" ||
      opts.reason === "appSettingsChanged" ||
      opts.reason === "pilotChanged",
  });
  if (
    opts.affectedUserId &&
    opts.currentUserId &&
    opts.affectedUserId === opts.currentUserId
  ) {
    await opts.refreshAuth?.();
  }
}
