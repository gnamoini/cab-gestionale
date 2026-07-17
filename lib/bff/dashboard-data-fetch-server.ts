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
import { LAVORAZIONI_DASHBOARD_REPORT_FILTERS } from "@/lib/lavorazioni/lavorazioni-prefetch-filters";
import { isLavorazioneInCorso } from "@/lib/lavorazioni/archived";
import { resolveLavorazioniStatiForServer } from "@/lib/app-settings/resolve-settings-for-server";
import { pickDashboardPriorityLavorazioneIds, DASHBOARD_SCHEde_PREFETCH_LIMIT } from "@/lib/view/dashboard-widgets-selectors";
import {
  verifyServerModuleCan,
  verifyServerPageRead,
} from "@/src/lib/auth/server-permission-guards";
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

const DASHBOARD_LOG_PREFETCH_BASE: readonly LogFilters[] = [
  { entita: "lavorazioni", limit: GESTIONALE_LOG_FEED_LIMIT },
  { entita: "magazzino_ricambi", limit: GESTIONALE_LOG_FEED_LIMIT },
  { entita: "movimenti_ricambi", limit: GESTIONALE_LOG_FEED_LIMIT },
] as const;

async function resolveDashboardLogPrefetchFilters(): Promise<LogFilters[]> {
  const filters: LogFilters[] = [...DASHBOARD_LOG_PREFETCH_BASE];
  if (await verifyServerPageRead("lavorazioni")) {
    filters.push({ entita: "scheda_lavorazione", limit: GESTIONALE_LOG_FEED_LIMIT });
  }
  if (await verifyServerModuleCan("preventivi", "read")) {
    filters.push({ entita: "preventivi", limit: GESTIONALE_LOG_FEED_LIMIT });
  }
  if (await verifyServerModuleCan("fatturazione", "read")) {
    filters.push({ entita: "invoices", limit: GESTIONALE_LOG_FEED_LIMIT });
  }
  return filters;
}

function codiciMapFromRows(rows: readonly LavorazioneListRow[]): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  for (const row of rows) out[row.id] = row.codice ?? null;
  return out;
}

function activeLavorazioniForDashboard(rows: readonly LavorazioneListRow[]): LavorazioneListRow[] {
  return rows.filter((r) => !r.deleted_at && isLavorazioneInCorso(r));
}

async function fetchDashboardLavorazioniAuthorizedServer(): Promise<ServiceResult<LavorazioneListRow[]>> {
  const allowed = await verifyServerPageRead("lavorazioni");
  if (!allowed) return err("Permesso richiesto.");
  const sb = await createSupabaseServerUserClient();
  const sanitizeStati = await resolveLavorazioniStatiForServer();
  return fetchLavorazioniListRows(sb, LAVORAZIONI_DASHBOARD_REPORT_FILTERS, { sanitizeStati });
}

/**
 * BFF Dashboard lite — wave 1: lav report ∥ mag ∥ settings ∥ logs;
 * wave 2: enrich mezzo top-N ∥ schede batch mirato.
 */
export const fetchDashboardDataDTOServer = cache(async (): Promise<DashboardDataDTO> => {
  const logFilters = await resolveDashboardLogPrefetchFilters();

  const [lavRes, magRes, settingsPayload, ...logResults] = await Promise.all([
    fetchDashboardLavorazioniAuthorizedServer(),
    getMagazzinoReportLightServer(),
    fetchCabAppSettingsPayloadServer(),
    ...logFilters.map((filters) => fetchLogModificheListServer(filters)),
  ]);

  let lavorazioni = lavRes.success ? (lavRes.data ?? []) : [];
  const activeRows = activeLavorazioniForDashboard(lavorazioni);
  const schedeTargetIds = pickDashboardPriorityLavorazioneIds(activeRows, DASHBOARD_SCHEde_PREFETCH_LIMIT);
  const mezzoTargetIds = pickDashboardPriorityLavorazioneIds(activeRows, DASHBOARD_MEZZO_ENRICH_LIMIT);

  const mezzoEnrichPromise = (async () => {
    if (mezzoTargetIds.length === 0) return lavorazioni;
    const sb = await createSupabaseServerUserClient();
    const sanitizeStati = await resolveLavorazioniStatiForServer();
    const enrichedRes = await fetchLavorazioniListRowsByIds(sb, mezzoTargetIds, { sanitizeStati });
    if (enrichedRes.success && enrichedRes.data?.length) {
      return mergeMezzoIntoLavorazioneRows(lavorazioni, enrichedRes.data);
    }
    return lavorazioni;
  })();

  const schedePromise =
    schedeTargetIds.length > 0
      ? fetchSchedeBundlesStoreServer(schedeTargetIds, codiciMapFromRows(lavorazioni))
      : Promise.resolve({ success: true as const, data: {} as LavorazioneSchedeStore });

  const [enrichedLavorazioni, schedeRes] = await Promise.all([mezzoEnrichPromise, schedePromise]);
  lavorazioni = enrichedLavorazioni;

  const logSlices: DashboardLogPrefetchSlice[] = logFilters.map((filters, index) => ({
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
