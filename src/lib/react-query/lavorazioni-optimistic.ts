export type {
  LavorazioneBaseSnapshot,
  LavorazioneUpdateOptimisticAudit,
  LavorazioneUpdateOptimisticContext,
  LavorazioniListSnapshot,
} from "@/src/lib/react-query/lavorazioni-optimistic-cache";
export {
  applyOptimisticLavorazioneUpdate,
  assertNoArchivedInActiveLists,
  buildConcludeOptimisticPatch,
  buildRestoreOptimisticPatch,
  buildLavorazioneOptimisticAudit,
  isLavorazioniListCacheQueryKey,
  isLavorazioneRowVersionNewer,
  lavorazioniListCacheRows,
  rollbackLavorazioneUpdateQueries,
  snapshotLavorazioneUpdateQueries,
} from "@/src/lib/react-query/lavorazioni-optimistic-cache";

import type { QueryClient } from "@tanstack/react-query";
import { invalidateEntity } from "@/lib/cache/minimal-invalidation-contract";
import { invalidateOperationalTruth } from "@/src/lib/runtime/truth-layer/invalidate-operational-truth";

/** Invalidazione post-update rapido: allinea liste lavorazioni al DB via MIC. */
export async function settleLavorazioneQuickUpdate(
  qc: QueryClient,
  hadError: boolean,
  lavorazioneId?: string,
  dbVersion?: string,
): Promise<void> {
  if (hadError) return;
  if (lavorazioneId) {
    await invalidateEntity({
      queryClient: qc,
      entityType: "lavorazione",
      entityId: lavorazioneId,
      scope: "full",
      dbVersion,
    });
    return;
  }
  await invalidateOperationalTruth({ queryClient: qc, domain: "lavorazioni" });
}
