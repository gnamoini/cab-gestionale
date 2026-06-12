import type { QueryClient } from "@tanstack/react-query";
import { schedaRowsToBundle } from "@/lib/schede/schede-db-mapper";
import { SCHEde_BUNDLES_QUERY_KEY } from "@/src/lib/react-query/query-keys";
import { lavorazioniService } from "@/src/services/lavorazioni.service";
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

/** Rimuove la slice bundle per lavorazione (es. soft delete). */
export function evictSchedeBundleForLavorazioneId(qc: QueryClient, lavorazioneId: string): void {
  const id = lavorazioneId.trim();
  if (!id) return;
  qc.setQueryData<LavorazioneSchedeStore>(SCHEde_BUNDLES_QUERY_KEY, (prev) => {
    if (!prev?.[id]) return prev;
    const next = { ...prev };
    delete next[id];
    return next;
  });
}

/**
 * Aggiorna bundle cache per tutte le lavorazioni collegate a un mezzo.
 * Usato da MIC post-mutazione mezzo (display ingresso snapshot).
 */
export async function refreshSchedeBundlesForMezzoId(
  qc: QueryClient,
  mezzoId: string,
): Promise<number> {
  const id = mezzoId.trim();
  if (!id) return 0;

  const lavRes = await lavorazioniService.getAll({ mezzo_id: id, fetchMode: "light" });
  if (!lavRes.success || !lavRes.data?.length) return 0;

  let patched = 0;
  for (const lav of lavRes.data) {
    const lavId = lav.id?.trim();
    if (!lavId) continue;
    const allRes = await schedeService.getAll({ lavorazione_id: lavId });
    if (!allRes.success) continue;
    const bundle = schedaRowsToBundle(lavId, allRes.data ?? [], null);
    qc.setQueryData<LavorazioneSchedeStore>(SCHEde_BUNDLES_QUERY_KEY, (prev) => ({
      ...(prev ?? {}),
      [lavId]: bundle,
    }));
    patched += 1;
  }
  return patched;
}
