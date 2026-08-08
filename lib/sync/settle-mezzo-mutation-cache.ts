"use client";

import type { QueryClient } from "@tanstack/react-query";
import { logMezzoMutationSaveTrace } from "@/lib/observability/mezzo-mutation-save-trace";
import { invalidateAfterMezzoMutations } from "@/src/lib/react-query/invalidate-related";
import { QK } from "@/src/lib/react-query/query-keys";

export type SettleMezzoMutationCacheOptions = {
  operation: string;
  mezzoId?: string;
  dbVersion?: string;
};

/**
 * ponytail: settle non bloccante — `none` nel critical path, refetch liste in background.
 * RQ v5: mutateAsync attende onSettled; active refetch qui bloccherebbe Save.
 */
export async function settleMezzoMutationCache(
  qc: QueryClient,
  options: SettleMezzoMutationCacheOptions,
): Promise<void> {
  const { operation, mezzoId, dbVersion } = options;
  logMezzoMutationSaveTrace("MEZZO_ON_SETTLED_START", { operation, mezzoId });
  logMezzoMutationSaveTrace("MEZZO_INVALIDATION_START", { operation, mezzoId, refetchType: "none" });

  await invalidateAfterMezzoMutations(qc, mezzoId, dbVersion, { refetchType: "none" });

  logMezzoMutationSaveTrace("MEZZO_INVALIDATION_DONE", { operation, mezzoId, refetchType: "none" });

  void qc.invalidateQueries({ queryKey: QK.mezzi, refetchType: "active" });
  void qc.invalidateQueries({ queryKey: QK.mezzoQueries, refetchType: "active" });
  void qc.invalidateQueries({ queryKey: QK.lavorazioniQueries, refetchType: "active" });

  logMezzoMutationSaveTrace("MEZZO_MUTATION_RESOLVED", { operation, mezzoId });
}
