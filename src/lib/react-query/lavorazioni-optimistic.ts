export type {
  LavorazioneBaseSnapshot,
  LavorazioneUpdateOptimisticContext,
  LavorazioniListSnapshot,
} from "@/src/lib/react-query/lavorazioni-optimistic-cache";
export {
  applyOptimisticLavorazioneUpdate,
  buildConcludeOptimisticPatch,
  rollbackLavorazioneUpdateQueries,
  snapshotLavorazioneUpdateQueries,
} from "@/src/lib/react-query/lavorazioni-optimistic-cache";

import type { QueryClient } from "@tanstack/react-query";
import { invalidateOperationalTruth } from "@/src/lib/runtime/truth-layer/invalidate-operational-truth";

/** Invalidazione post-update rapido: allinea liste lavorazioni al DB via truth layer. */
export function settleLavorazioneQuickUpdate(qc: QueryClient, _hadError: boolean): void {
  void invalidateOperationalTruth({ queryClient: qc, domain: "lavorazioni" });
}
