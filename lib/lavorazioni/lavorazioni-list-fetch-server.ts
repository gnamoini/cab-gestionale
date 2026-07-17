import "server-only";

import { cache } from "react";
import { fetchLavorazioniListRows } from "@/lib/lavorazioni/lavorazioni-list-fetch";
import { resolveLavorazioniStatiForServer } from "@/lib/app-settings/resolve-settings-for-server";
import { verifyServerPageRead } from "@/src/lib/auth/server-permission-guards";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import { err, type ServiceResult } from "@/src/services/service-result";
import {
  LAVORAZIONI_ATTIVE_LIGHT_FILTERS,
  LAVORAZIONI_REPORT_FILTERS,
  lavorazioniAttiveListFilters,
} from "@/lib/lavorazioni/lavorazioni-prefetch-filters";
import type { LavorazioneFilters, LavorazioneListRow } from "@/src/services/lavorazioni.service";

export { LAVORAZIONI_ATTIVE_LIGHT_FILTERS, LAVORAZIONI_REPORT_FILTERS };

export async function fetchLavorazioniListAuthorizedServer(
  filters?: LavorazioneFilters,
): Promise<ServiceResult<LavorazioneListRow[]>> {
  const allowed = await verifyServerPageRead("lavorazioni");
  if (!allowed) return err("Permesso richiesto.");
  const sb = await createSupabaseServerUserClient();
  const sanitizeStati = await resolveLavorazioniStatiForServer();
  return fetchLavorazioniListRows(sb, filters, { sanitizeStati });
}

export const getLavorazioniAttiveLightServer = cache(async () => {
  return fetchLavorazioniListAuthorizedServer(lavorazioniAttiveListFilters());
});

export const getLavorazioniReportLightServer = cache(async () => {
  return fetchLavorazioniListAuthorizedServer(LAVORAZIONI_REPORT_FILTERS);
});
