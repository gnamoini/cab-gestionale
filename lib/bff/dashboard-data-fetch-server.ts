import "server-only";

import { cache } from "react";
import { fetchLogModificheListServer } from "@/lib/gestionale-log/log-modifiche-fetch-server";
import {
  fetchLavorazioniListRowsByIds,
  fetchLavorazioniListRows,
  mergeMezzoIntoLavorazioneRows,
} from "@/lib/lavorazioni/lavorazioni-list-fetch";
import { buildDashboardMagWidgetFromReportRows } from "@/lib/magazzino/dashboard-mag-widget-server";
import type { MagazzinoDashboardKpi } from "@/lib/magazzino/dashboard-mag-query-keys";
import { getMagazzinoReportLightServer } from "@/lib/magazzino/magazzino-list-fetch-server";
import { fetchCabAppSettingsPayloadServer } from "@/lib/app-settings/resolve-settings-for-server";
import { fetchSchedeBundlesStoreServer } from "@/lib/schede/schede-bundles-fetch-server";
import { LAVORAZIONI_DASHBOARD_STATS_FILTERS } from "@/lib/lavorazioni/lavorazioni-prefetch-filters";
import { resolveLavorazioniStatiForServer } from "@/lib/app-settings/resolve-settings-for-server";
import { pickDashboardPriorityLavorazioneIds, DASHBOARD_SCHEde_PREFETCH_LIMIT } from "@/lib/view/dashboard-widgets-selectors";
import { verifyServerPageRead } from "@/src/lib/auth/server-permission-guards";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import { GESTIONALE_LOG_FEED_LIMIT } from "@/lib/react-query/query-layer-policies";
import type { LogFilters } from "@/src/services/log.service";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import { err, type ServiceResult } from "@/src/services/service-result";
import type { MagazzinoRicambioRow, LogModificaWithProfileRow } from "@/src/types/supabase-tables";
import { resolveCabAppSettingsFallbackServer } from "@/lib/app-settings/settings-fallback-server";
import type { CabAppSettingsQueryPayload } from "@/src/hooks/gestionale/use-settings-queries";
import type { LavorazioneSchedeStore } from "@/types/schede";

export type DashboardLogPrefetchSlice = {
  filters: LogFilters;
  rows: LogModificaWithProfileRow[];
};

export type DashboardDataDTO = {
  lavorazioni: LavorazioneListRow[];
  schedeStore: LavorazioneSchedeStore;
  magazzinoReport: MagazzinoRicambioRow[];
  magDashboardKpi: MagazzinoDashboardKpi;
  settings: CabAppSettingsQueryPayload;
  logSlices: DashboardLogPrefetchSlice[];
};

const DASHBOARD_MEZZO_ENRICH_LIMIT = DASHBOARD_SCHEde_PREFETCH_LIMIT;

const DASHBOARD_LOG_PREFETCH: readonly LogFilters[] = [
  { entita: "lavorazioni", limit: GESTIONALE_LOG_FEED_LIMIT },
  { entita: "magazzino_ricambi", limit: GESTIONALE_LOG_FEED_LIMIT },
  { entita: "movimenti_ricambi", limit: GESTIONALE_LOG_FEED_LIMIT },
] as const;

function codiciMapFromRows(rows: readonly LavorazioneListRow[]): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  for (const row of rows) out[row.id] = row.codice ?? null;
  return out;
}

async function fetchDashboardLavorazioniAuthorizedServer(): Promise<ServiceResult<LavorazioneListRow[]>> {
  const allowed = await verifyServerPageRead("lavorazioni");
  if (!allowed) return err("Permesso richiesto.");
  const sb = await createSupabaseServerUserClient();
  const sanitizeStati = await resolveLavorazioniStatiForServer();
  return fetchLavorazioniListRows(sb, LAVORAZIONI_DASHBOARD_STATS_FILTERS, { sanitizeStati });
}

/**
 * BFF Dashboard lite — wave 1: lav (no mezzo) ∥ mag ∥ settings ∥ logs;
 * wave 2: enrich mezzo top-N + schede batch mirato.
 */
export const fetchDashboardDataDTOServer = cache(async (): Promise<DashboardDataDTO> => {
  const [lavRes, magRes, settingsPayload, ...logResults] = await Promise.all([
    fetchDashboardLavorazioniAuthorizedServer(),
    getMagazzinoReportLightServer(),
    fetchCabAppSettingsPayloadServer(),
    ...DASHBOARD_LOG_PREFETCH.map((filters) => fetchLogModificheListServer(filters)),
  ]);

  let lavorazioni = lavRes.success ? (lavRes.data ?? []) : [];
  const schedeTargetIds = pickDashboardPriorityLavorazioneIds(lavorazioni, DASHBOARD_SCHEde_PREFETCH_LIMIT);
  const mezzoTargetIds = pickDashboardPriorityLavorazioneIds(lavorazioni, DASHBOARD_MEZZO_ENRICH_LIMIT);

  if (mezzoTargetIds.length > 0) {
    const sb = await createSupabaseServerUserClient();
    const sanitizeStati = await resolveLavorazioniStatiForServer();
    const enrichedRes = await fetchLavorazioniListRowsByIds(sb, mezzoTargetIds, { sanitizeStati });
    if (enrichedRes.success && enrichedRes.data?.length) {
      lavorazioni = mergeMezzoIntoLavorazioneRows(lavorazioni, enrichedRes.data);
    }
  }

  const schedeRes = schedeTargetIds.length
    ? await fetchSchedeBundlesStoreServer(schedeTargetIds, codiciMapFromRows(lavorazioni))
    : { success: true as const, data: {} as LavorazioneSchedeStore };

  const logSlices: DashboardLogPrefetchSlice[] = DASHBOARD_LOG_PREFETCH.map((filters, index) => ({
    filters,
    rows: logResults[index]?.success ? (logResults[index].data ?? []) : [],
  }));

  const magAllRows = magRes.success ? (magRes.data ?? []) : [];
  const magWidget = buildDashboardMagWidgetFromReportRows(
    magAllRows,
    logSlices,
    settingsPayload?.resolved?.mezziListe,
  );

  return {
    lavorazioni,
    schedeStore: schedeRes.success ? (schedeRes.data ?? {}) : {},
    magazzinoReport: magWidget.subsetRows,
    magDashboardKpi: magWidget.kpi,
    settings: settingsPayload ?? { rows: [], resolved: resolveCabAppSettingsFallbackServer() },
    logSlices,
  };
});
