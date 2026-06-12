import { fetchSchedeBundlesStore, fetchSchedeRowsByLavorazioneIds } from "@/lib/schede/schede-bundles-fetch";
import { ensureSectionRead } from "@/src/lib/auth/permission-guards";
import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import { err, type ServiceResult } from "@/src/services/service-result";
import type { SchedaLavorazioneRow } from "@/src/types/supabase-tables";
import type { LavorazioneSchedeStore } from "@/types/schede";
import { serviceFailFromError } from "@/src/utils/supabaseErrorHandler";

/** Batch schede lato client — stessa query `.in()` del server (sostituisce N× getAll). */
export async function fetchSchedeBundlesStoreAuthorized(
  lavorazioneIds: readonly string[],
  codiciByLavorazioneId?: Readonly<Record<string, string | null | undefined>>,
): Promise<ServiceResult<LavorazioneSchedeStore>> {
  try {
    const allowed = await ensureSectionRead("lavorazioni");
    if (!allowed.success) return err(allowed.error ?? "Permesso richiesto.");
    const sb = await getBrowserSupabase();
    return fetchSchedeBundlesStore(sb, lavorazioneIds, codiciByLavorazioneId);
  } catch (e) {
    return serviceFailFromError(e);
  }
}

/** Righe schede batch (per prime cache hub senza secondo fetch). */
export async function fetchSchedeRowsByLavorazioneIdsAuthorized(
  lavorazioneIds: readonly string[],
): Promise<ServiceResult<SchedaLavorazioneRow[]>> {
  try {
    const allowed = await ensureSectionRead("lavorazioni");
    if (!allowed.success) return err(allowed.error ?? "Permesso richiesto.");
    const sb = await getBrowserSupabase();
    return fetchSchedeRowsByLavorazioneIds(sb, lavorazioneIds);
  } catch (e) {
    return serviceFailFromError(e);
  }
}
