import "server-only";

import { dehydrate, QueryClient, type DehydratedState } from "@tanstack/react-query";
import { getAppSettingsPayloadReadServer, getAppSettingsPayloadServer } from "@/lib/app-settings/app-settings-fetch-server";
import {
  LAVORAZIONI_ATTIVE_LIGHT_FILTERS,
  LAVORAZIONI_REPORT_FILTERS,
  getLavorazioniAttiveLightServer,
  getLavorazioniReportLightServer,
} from "@/lib/lavorazioni/lavorazioni-list-fetch-server";
import { lavorazioniInfiniteSeedFromRows } from "@/lib/lavorazioni/lavorazioni-infinite-cache";
import { isServerListPaginationEnabled } from "@/lib/performance/list-pagination-rollout";
import { resolveInitialLoad } from "@/lib/render/render-path-orchestrator";
import { getMagazzinoListServer, getMagazzinoReportLightServer } from "@/lib/magazzino/magazzino-list-fetch-server";
import { getMezziListLightServer, getMezziReportLightServer } from "@/lib/mezzi/mezzi-list-fetch-server";
import { getMovimentiListServer } from "@/lib/movimenti/movimenti-list-fetch-server";
import { fetchDashboardDataDTOServer } from "@/lib/bff/dashboard-data-fetch-server";
import { MAGAZZINO_DASHBOARD_KPI_QUERY_KEY } from "@/lib/magazzino/dashboard-mag-query-keys";
import { QK } from "@/src/lib/react-query/query-keys";
import { getDocumentiDashboardDTOServer } from "@/lib/bff/documenti-dashboard-fetch-server";
import { fetchReportDataDTOServer } from "@/lib/bff/report-bundle-fetch-server";
import { fetchPreventiviRecordsServer } from "@/lib/preventivi/preventivi-fetch-server";
import { fetchOrdiniFornitoriRecordsServer } from "@/lib/ordini-fornitori/ordine-fornitore-fetch-server";
import { fetchInvoiceListPayloadServer } from "@/lib/fatturazione/fatturazione-fetch-server";
import { fetchSchedeBundlesStoreServer } from "@/lib/schede/schede-bundles-fetch-server";
import { getReportManualEntriesServer } from "@/lib/report/report-manual-entries-fetch-server";
import { SCHEde_BUNDLES_QUERY_KEY } from "@/src/lib/react-query/query-keys";
import {
  documentiListQueryKey,
  fatturazioneListQueryKey,
  mezziListQueryKey,
  ordiniFornitoriListQueryKey,
  preventiviRecordsQueryKey,
} from "@/lib/render/query-key-factory";
import {
  GESTIONALE_REPORT_GC_MS,
  GESTIONALE_REPORT_STALE_MS,
  GESTIONALE_VIEW_GC_MS,
  GESTIONALE_VIEW_STALE_MS,
} from "@/lib/react-query/query-layer-policies";
import { GESTIONALE_SEMI_GC_MS, GESTIONALE_SEMI_STALE_MS, GESTIONALE_STATIC_GC_MS, GESTIONALE_STATIC_STALE_MS } from "@/lib/react-query/data-cache-tiers";
import { resolveCabAppSettingsFallbackServer } from "@/lib/app-settings/settings-fallback-server";
import type { CabAppSettingsQueryPayload } from "@/src/hooks/gestionale/use-settings-queries";
import type { ServiceResult } from "@/src/services/service-result";

const LA_LIST_STALE_MS = 30_000;

export function createServerQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
      },
    },
  });
}

function unwrap<T>(result: ServiceResult<T>, fallback: T): T {
  return result.success ? (result.data ?? fallback) : fallback;
}

async function prefetchSettingsPayload(
  qc: QueryClient,
  fetcher: () => Promise<ServiceResult<CabAppSettingsQueryPayload>>,
): Promise<void> {
  const settings = resolveInitialLoad({ scopeKey: "settings.payload" });
  void getPrefetchCachePolicyHint("settings.payload");
  await qc.prefetchQuery({
    queryKey: settings.queryKey,
    queryFn: async () => unwrap(await fetcher(), { rows: [], resolved: resolveCabAppSettingsFallbackServer() }),
    staleTime: GESTIONALE_STATIC_STALE_MS,
    gcTime: GESTIONALE_STATIC_GC_MS,
  });
}

export async function prefetchDashboardPage(): Promise<DehydratedState> {
  const qc = createServerQueryClient();
  const lav = resolveInitialLoad({ scopeKey: "lavorazioni.list.attive" });
  const magReport = resolveInitialLoad({ scopeKey: "magazzino.report" });
  const settings = resolveInitialLoad({ scopeKey: "settings.payload" });
  const schedeScope = resolveInitialLoad({ scopeKey: "schede.bundles" });

  const dto = await fetchDashboardDataDTOServer();

  qc.setQueryData(
    lav.queryKey,
    isServerListPaginationEnabled() ? lavorazioniInfiniteSeedFromRows(dto.lavorazioni) : dto.lavorazioni,
  );
  qc.setQueryData(magReport.queryKey, dto.magazzinoReport);
  qc.setQueryData(MAGAZZINO_DASHBOARD_KPI_QUERY_KEY, dto.magDashboardKpi);
  qc.setQueryData(settings.queryKey, dto.settings);
  qc.setQueryData(SCHEde_BUNDLES_QUERY_KEY, dto.schedeStore);
  for (const slice of dto.logSlices) {
    qc.setQueryData([...QK.log, slice.filters] as const, slice.rows);
  }
  void schedeScope;

  return dehydrate(qc);
}

export async function prefetchMezziPage(): Promise<DehydratedState> {
  const qc = createServerQueryClient();
  const mezzi = resolveInitialLoad({ scopeKey: "mezzi.list" });
  await qc.prefetchQuery({
    queryKey: mezzi.queryKey,
    queryFn: async () => unwrap(await getMezziListLightServer(), []),
    staleTime: GESTIONALE_SEMI_STALE_MS,
    gcTime: GESTIONALE_SEMI_GC_MS,
  });
  return dehydrate(qc);
}

export async function prefetchLavorazioniPage(): Promise<DehydratedState> {
  const qc = createServerQueryClient();
  const lav = resolveInitialLoad({ scopeKey: "lavorazioni.list.attive" });
  const lavRes = await getLavorazioniAttiveLightServer();
  const rows = unwrap(lavRes, []);
  qc.setQueryData(
    lav.queryKey,
    isServerListPaginationEnabled() ? lavorazioniInfiniteSeedFromRows(rows) : rows,
  );

  const ids = rows.map((r) => r.id);
  if (ids.length > 0) {
    const codici: Record<string, string | null> = {};
    for (const row of rows) codici[row.id] = row.codice ?? null;
    const schedeRes = await fetchSchedeBundlesStoreServer(ids, codici);
    if (schedeRes.success) {
      qc.setQueryData(SCHEde_BUNDLES_QUERY_KEY, schedeRes.data ?? {});
    }
  }

  return dehydrate(qc);
}

export async function prefetchDocumentiPage(): Promise<DehydratedState> {
  const qc = createServerQueryClient();
  const settings = resolveInitialLoad({ scopeKey: "settings.payload" });
  const mezzi = resolveInitialLoad({ scopeKey: "mezzi.list" });
  const documenti = resolveInitialLoad({ scopeKey: "documenti.list" });

  const dtoRes = await getDocumentiDashboardDTOServer();
  if (dtoRes.success && dtoRes.data) {
    qc.setQueryData(settings.queryKey, dtoRes.data.settings);
    qc.setQueryData(mezziListQueryKey("list", null), dtoRes.data.mezzi);
    qc.setQueryData(documentiListQueryKey(null), dtoRes.data.documenti);
  } else {
    await Promise.all([
      prefetchSettingsPayload(qc, getAppSettingsPayloadReadServer),
      qc.prefetchQuery({
        queryKey: mezzi.queryKey,
        queryFn: async () => unwrap(await getMezziListLightServer(), []),
        staleTime: GESTIONALE_SEMI_STALE_MS,
        gcTime: GESTIONALE_SEMI_GC_MS,
      }),
    ]);
  }

  void documenti;
  return dehydrate(qc);
}

export async function prefetchMagazzinoPage(): Promise<DehydratedState> {
  const qc = createServerQueryClient();
  const mag = resolveInitialLoad({ scopeKey: "magazzino.list" });
  await Promise.all([
    qc.prefetchQuery({
      queryKey: mag.queryKey,
      queryFn: async () => unwrap(await getMagazzinoListServer(), []),
      staleTime: GESTIONALE_SEMI_STALE_MS,
      gcTime: GESTIONALE_SEMI_GC_MS,
    }),
    prefetchSettingsPayload(qc, getAppSettingsPayloadReadServer),
  ]);
  return dehydrate(qc);
}

export async function prefetchReportPage(): Promise<DehydratedState> {
  const qc = createServerQueryClient();
  const lavReport = resolveInitialLoad({ scopeKey: "lavorazioni.list.report" });
  const magReport = resolveInitialLoad({ scopeKey: "magazzino.report" });
  const mezziReport = resolveInitialLoad({ scopeKey: "mezzi.report" });
  const movimenti = resolveInitialLoad({ scopeKey: "movimenti.list" });
  const manual = resolveInitialLoad({ scopeKey: "report.manualEntries" });
  const settings = resolveInitialLoad({ scopeKey: "settings.payload" });

  const dto = await fetchReportDataDTOServer();

  qc.setQueryData(lavReport.queryKey, dto.lavorazioni);
  qc.setQueryData(magReport.queryKey, dto.magazzino);
  qc.setQueryData(mezziReport.queryKey, dto.mezzi);
  qc.setQueryData(movimenti.queryKey, dto.movimenti);
  qc.setQueryData(manual.queryKey, dto.manualEntries);
  qc.setQueryData(settings.queryKey, dto.settings);

  return dehydrate(qc);
}

export async function prefetchPreventiviPage(): Promise<DehydratedState> {
  const qc = createServerQueryClient();
  const preventivi = resolveInitialLoad({ scopeKey: "preventivi.list" });
  const [res, ordiniRes] = await Promise.all([
    fetchPreventiviRecordsServer(),
    fetchOrdiniFornitoriRecordsServer(),
  ]);
  if (res.success && res.data) {
    qc.setQueryData(preventiviRecordsQueryKey(), res.data);
  }
  if (ordiniRes.success && ordiniRes.data) {
    qc.setQueryData(ordiniFornitoriListQueryKey(), ordiniRes.data);
  }
  void preventivi;
  return dehydrate(qc);
}

export async function prefetchFatturazionePage(): Promise<DehydratedState> {
  const qc = createServerQueryClient();
  const res = await fetchInvoiceListPayloadServer();
  if (res.success && res.data) {
    qc.setQueryData(fatturazioneListQueryKey(), res.data);
  }
  return dehydrate(qc);
}

export async function prefetchImpostazioniPage(): Promise<DehydratedState> {
  const qc = createServerQueryClient();
  await prefetchSettingsPayload(qc, getAppSettingsPayloadServer);
  return dehydrate(qc);
}

// Re-export for server modules that import filter presets from fetch-server
export { LAVORAZIONI_ATTIVE_LIGHT_FILTERS, LAVORAZIONI_REPORT_FILTERS };
