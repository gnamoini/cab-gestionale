import type { LavorazioneSchedeStore } from "@/types/schede";
import type { QueryClient } from "@tanstack/react-query";
import { SCHEde_BUNDLES_QUERY_KEY } from "@/src/lib/react-query/query-keys";

export type SchedeStoreSnapshot = LavorazioneSchedeStore | undefined;

export function snapshotSchedeStore(qc: QueryClient): SchedeStoreSnapshot {
  return qc.getQueryData<LavorazioneSchedeStore>(SCHEde_BUNDLES_QUERY_KEY);
}

export function applyOptimisticSchedeStore(
  qc: QueryClient,
  next: LavorazioneSchedeStore,
): void {
  qc.setQueryData<LavorazioneSchedeStore>(SCHEde_BUNDLES_QUERY_KEY, next);
}

export function rollbackSchedeStore(qc: QueryClient, snapshot: SchedeStoreSnapshot): void {
  qc.setQueryData(SCHEde_BUNDLES_QUERY_KEY, snapshot);
}
