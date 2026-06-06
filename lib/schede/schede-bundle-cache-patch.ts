import type { QueryClient } from "@tanstack/react-query";
import { schedaRowsToBundle } from "@/lib/schede/schede-db-mapper";
import { SCHEde_BUNDLES_QUERY_KEY } from "@/src/lib/react-query/query-keys";
import { schedeService } from "@/src/services/schede.service";
import type { LavorazioneSchedeStore } from "@/types/schede";

/**
 * Aggiorna solo la slice lavorazione nel bundle cache — evita refetch monolith su singola scheda.
 */
export async function refreshSchedeBundleSliceForSchedaId(
  qc: QueryClient,
  schedaId: string,
): Promise<boolean> {
  const id = schedaId.trim();
  if (!id) return false;

  const rowRes = await schedeService.getById(id);
  if (!rowRes.success || !rowRes.data) return false;

  const lavId = rowRes.data.lavorazione_id?.trim();
  if (!lavId) return false;

  const allRes = await schedeService.getAll({ lavorazione_id: lavId });
  if (!allRes.success) return false;

  const bundle = schedaRowsToBundle(lavId, allRes.data ?? []);
  qc.setQueryData<LavorazioneSchedeStore>(SCHEde_BUNDLES_QUERY_KEY, (prev) => ({
    ...(prev ?? {}),
    [lavId]: bundle,
  }));
  return true;
}
