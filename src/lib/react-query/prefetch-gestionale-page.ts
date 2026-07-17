import "server-only";

import { dehydrate, QueryClient, type DehydratedState } from "@tanstack/react-query";
import { getAppSettingsPayloadReadServer, getAppSettingsPayloadServer } from "@/lib/app-settings/app-settings-fetch-server";
import {
  LAVORAZIONI_ATTIVE_LIGHT_FILTERS,
  LAVORAZIONI_REPORT_FILTERS,
  getLavorazioniReportLightServer,
} from "@/lib/lavorazioni/lavorazioni-list-fetch-server";
import { getPrefetchCachePolicyHint } from "@/lib/decision/prefetch-cache-hint";
import { lavorazioniInfiniteSeedFromRows } from "@/lib/lavorazioni/lavorazioni-infinite-cache";
import { isServerListPaginationEnabled } from "@/lib/performance/list-pagination-rollout";
import { resolveInitialLoad } from "@/lib/render/render-path-orchestrator";
import { getMagazzinoReportLightServer } from "@/lib/magazzino/magazzino-list-fetch-server";
import { getMezziListLightServer, getMezziReportLightServer } from "@/lib/mezzi/mezzi-list-fetch-server";
import { getMovimentiListServer } from "@/lib/movimenti/movimenti-list-fetch-server";
import { fetchDashboardDataDTOServer } from "@/lib/bff/dashboard-data-fetch-server";
import { MAGAZZINO_DASHBOARD_KPI_QUERY_KEY } from "@/lib/magazzino/dashboard-mag-query-keys";
import { QK } from "@/src/lib/react-query/query-keys";
import { fetchDocumentiPageDTOServer } from "@/lib/bff/documenti-page-fetch-server";
import { fetchReportDataDTOServer } from "@/lib/bff/report-bundle-fetch-server";
import { fetchFatturazionePageDTOServer } from "@/lib/bff/fatturazione-page-fetch-server";
import { fetchPreventiviPageDTOServer } from "@/lib/bff/preventivi-page-fetch-server";
import { fetchLavorazioniPageDTOServer } from "@/lib/bff/lavorazioni-page-fetch-server";
import { fetchClientPortalPageDTOServer } from "@/lib/bff/client-portal-page-fetch-server";
import { fetchMagazzinoPageDTOServer } from "@/lib/bff/magazzino-page-fetch-server";
import { fetchMezziPageDTOServer } from "@/lib/bff/mezzi-page-fetch-server";
import { fetchDipendentiPageDTOServer } from "@/lib/bff/dipendenti-page-fetch-server";
import { fetchSicurezzaPageDTOServer } from "@/lib/bff/sicurezza-page-fetch-server";
import { fetchAgendaPageDefaultRangeServer } from "@/lib/bff/agenda-page-fetch-server";
import { getReportManualEntriesServer } from "@/lib/report/report-manual-entries-fetch-server";
import { SCHEde_BUNDLES_QUERY_KEY } from "@/src/lib/react-query/query-keys";
import {
  documentiListQueryKey,
  fatturazioneListQueryKey,
  fatturazioneOpenItemsQueryKey,
  fatturazionePaymentsQueryKey,
  mezziListQueryKey,
  ordiniFornitoriListQueryKey,
  preventiviBillingQueryKey,
  preventiviRecordsQueryKey,
} from "@/lib/render/query-key-factory";
import {
  GESTIONALE_REPORT_GC_MS,
  GESTIONALE_REPORT_STALE_MS,
  GESTIONALE_VIEW_GC_MS,
  GESTIONALE_VIEW_STALE_MS,
} from "@/lib/react-query/query-layer-policies";
import { GESTIONALE_SEMI_GC_MS, GESTIONALE_SEMI_STALE_MS, GESTIONALE_STATIC_GC_MS, GESTIONALE_STATIC_STALE_MS } from "@/lib/react-query/data-cache-tiers";
import { PWA_QUERY_CLIENT_DEFAULTS } from "@/lib/pwa/pwa-query-policy";
import { resolveCabAppSettingsFallbackServer } from "@/lib/app-settings/settings-fallback-server";
import type { CabAppSettingsQueryPayload } from "@/src/hooks/gestionale/use-settings-queries";
import type { ServiceResult } from "@/src/services/service-result";

const LA_LIST_STALE_MS = 30_000;

export type GestionalePrefetchPage =
  | "dashboard"
  | "lavorazioni"
  | "documenti"
  | "magazzino"
  | "report"
  | "preventivi"
  | "fatturazione"
  | "impostazioni"
  | "agenda"
  | "dipendenti"
  | "sicurezza"
  | "mezzi"
  | "lavorazioni_clienti";

export type PrefetchDeferredOptions = {
  /** Deep link `?prevTab=ordini` — prefetch SSR lista ordini fornitori. */
  includeOrdini?: boolean;
  /** Deep link `?tab=scadenziario` — prefetch SSR open items. */
  includeOpenItems?: boolean;
  /** Deep link `?tab=pagamenti` — prefetch SSR customer payments. */
  includePayments?: boolean;
};

/** Settings + gate minimo — await prima del first byte su route pesanti. */
export async function prefetchCriticalPage(qc: QueryClient, page: GestionalePrefetchPage): Promise<void> {
  switch (page) {
    case "mezzi":
    case "fatturazione":
      return;
    case "preventivi":
      await prefetchSettingsPayload(qc, getAppSettingsPayloadReadServer);
      return;
    case "agenda":
    case "dipendenti":
    case "lavorazioni":
      await prefetchSettingsPayload(qc, getAppSettingsPayloadServer);
      return;
    case "sicurezza":
      return;
    case "impostazioni":
      return;
    case "lavorazioni_clienti":
      await prefetchSettingsPayload(qc, getAppSettingsPayloadReadServer);
      return;
    case "documenti":
    case "magazzino":
      await prefetchSettingsPayload(qc, getAppSettingsPayloadReadServer);
      return;
    case "dashboard":
      return;
    case "report":
      await prefetchSettingsPayload(qc, getAppSettingsPayloadServer);
      return;
  }
}

/** Dati lista / BFF — può completare dopo lo stream shell. */
export async function prefetchDeferredPage(
  qc: QueryClient,
  page: GestionalePrefetchPage,
  options?: PrefetchDeferredOptions,
): Promise<void> {
  switch (page) {
    case "dashboard": {
      const lav = resolveInitialLoad({ scopeKey: "lavorazioni.list.report" });
      const magReport = resolveInitialLoad({ scopeKey: "magazzino.report" });
      const settings = resolveInitialLoad({ scopeKey: "settings.payload" });
      const dto = await fetchDashboardDataDTOServer();
      await Promise.all([
        seedPrefetchedData(
          qc,
          lav.queryKey,
          isServerListPaginationEnabled() ? lavorazioniInfiniteSeedFromRows(dto.lavorazioni) : dto.lavorazioni,
          GESTIONALE_REPORT_STALE_MS,
          GESTIONALE_REPORT_GC_MS,
        ),
        seedPrefetchedData(qc, magReport.queryKey, dto.magazzinoReport, GESTIONALE_REPORT_STALE_MS, GESTIONALE_REPORT_GC_MS),
        seedPrefetchedData(qc, MAGAZZINO_DASHBOARD_KPI_QUERY_KEY, dto.magDashboardKpi, GESTIONALE_REPORT_STALE_MS, GESTIONALE_REPORT_GC_MS),
        seedPrefetchedData(qc, settings.queryKey, dto.settings, GESTIONALE_STATIC_STALE_MS, GESTIONALE_STATIC_GC_MS),
        seedPrefetchedData(qc, SCHEde_BUNDLES_QUERY_KEY, dto.schedeStore, GESTIONALE_SEMI_STALE_MS, GESTIONALE_SEMI_GC_MS),
        ...dto.logSlices.map((slice) =>
          seedPrefetchedData(qc, [...QK.log, slice.filters] as const, slice.rows, LA_LIST_STALE_MS, GESTIONALE_VIEW_GC_MS),
        ),
      ]);
      return;
    }
    case "lavorazioni": {
      const lav = resolveInitialLoad({ scopeKey: "lavorazioni.list.attive" });
      const dto = await fetchLavorazioniPageDTOServer();
      await Promise.all([
        seedPrefetchedData(
          qc,
          lav.queryKey,
          isServerListPaginationEnabled() ? lavorazioniInfiniteSeedFromRows(dto.lavorazioni) : dto.lavorazioni,
          LA_LIST_STALE_MS,
          GESTIONALE_VIEW_GC_MS,
        ),
        seedPrefetchedData(qc, mezziListQueryKey("list", null), dto.mezzi, GESTIONALE_SEMI_STALE_MS, GESTIONALE_SEMI_GC_MS),
        seedPrefetchedData(qc, SCHEde_BUNDLES_QUERY_KEY, dto.schedeBundles, GESTIONALE_SEMI_STALE_MS, GESTIONALE_SEMI_GC_MS),
      ]);
      return;
    }
    case "lavorazioni_clienti": {
      const inCorso = resolveInitialLoad({ scopeKey: "clientPortal.lavorazioni.inCorso" });
      const archivio = resolveInitialLoad({ scopeKey: "clientPortal.lavorazioni.archivio" });
      const dto = await fetchClientPortalPageDTOServer();
      const portalPaginated = isServerListPaginationEnabled();
      await Promise.all([
        seedPrefetchedData(
          qc,
          inCorso.queryKey,
          portalPaginated ? lavorazioniInfiniteSeedFromRows(dto.inCorso) : dto.inCorso,
          LA_LIST_STALE_MS,
          GESTIONALE_VIEW_GC_MS,
        ),
        seedPrefetchedData(
          qc,
          archivio.queryKey,
          portalPaginated ? lavorazioniInfiniteSeedFromRows(dto.archivio) : dto.archivio,
          LA_LIST_STALE_MS,
          GESTIONALE_VIEW_GC_MS,
        ),
        seedPrefetchedData(qc, SCHEde_BUNDLES_QUERY_KEY, dto.schedeBundles, GESTIONALE_SEMI_STALE_MS, GESTIONALE_SEMI_GC_MS),
      ]);
      return;
    }
    case "mezzi": {
      const mezzi = resolveInitialLoad({ scopeKey: "mezzi.list" });
      const dto = await fetchMezziPageDTOServer();
      await seedPrefetchedData(
        qc,
        mezziListQueryKey("list", null),
        dto.mezzi,
        GESTIONALE_SEMI_STALE_MS,
        GESTIONALE_SEMI_GC_MS,
      );
      return;
    }
    case "documenti": {
      const settings = resolveInitialLoad({ scopeKey: "settings.payload" });
      const mezzi = resolveInitialLoad({ scopeKey: "mezzi.list" });
      const documenti = resolveInitialLoad({ scopeKey: "documenti.list" });
      const dtoRes = await fetchDocumentiPageDTOServer();
      if (dtoRes.success && dtoRes.data) {
        await Promise.all([
          seedPrefetchedData(qc, settings.queryKey, dtoRes.data.settings, GESTIONALE_STATIC_STALE_MS, GESTIONALE_STATIC_GC_MS),
          seedPrefetchedData(qc, mezziListQueryKey("list", null), dtoRes.data.mezzi, GESTIONALE_SEMI_STALE_MS, GESTIONALE_SEMI_GC_MS),
          seedPrefetchedData(qc, documentiListQueryKey(null), dtoRes.data.documenti, GESTIONALE_SEMI_STALE_MS, GESTIONALE_SEMI_GC_MS),
        ]);
      } else {
        await qc.prefetchQuery({
          queryKey: mezzi.queryKey,
          queryFn: async () => unwrap(await getMezziListLightServer(), []),
          staleTime: GESTIONALE_SEMI_STALE_MS,
          gcTime: GESTIONALE_SEMI_GC_MS,
        });
      }
      void documenti;
      return;
    }
    case "magazzino": {
      const mag = resolveInitialLoad({ scopeKey: "magazzino.list" });
      const dto = await fetchMagazzinoPageDTOServer();
      await seedPrefetchedData(
        qc,
        mag.queryKey,
        dto.ricambi,
        GESTIONALE_SEMI_STALE_MS,
        GESTIONALE_SEMI_GC_MS,
      );
      return;
    }
    case "report": {
      const lavReport = resolveInitialLoad({ scopeKey: "lavorazioni.list.report" });
      const magReport = resolveInitialLoad({ scopeKey: "magazzino.report" });
      const mezziReport = resolveInitialLoad({ scopeKey: "mezzi.report" });
      const movimenti = resolveInitialLoad({ scopeKey: "movimenti.list" });
      const manual = resolveInitialLoad({ scopeKey: "report.manualEntries" });
      const settings = resolveInitialLoad({ scopeKey: "settings.payload" });
      const dto = await fetchReportDataDTOServer();
      await Promise.all([
        seedPrefetchedData(qc, lavReport.queryKey, dto.lavorazioni, GESTIONALE_REPORT_STALE_MS, GESTIONALE_REPORT_GC_MS),
        seedPrefetchedData(qc, magReport.queryKey, dto.magazzino, GESTIONALE_REPORT_STALE_MS, GESTIONALE_REPORT_GC_MS),
        seedPrefetchedData(qc, mezziReport.queryKey, dto.mezzi, GESTIONALE_REPORT_STALE_MS, GESTIONALE_REPORT_GC_MS),
        seedPrefetchedData(qc, movimenti.queryKey, dto.movimenti, LA_LIST_STALE_MS, GESTIONALE_VIEW_GC_MS),
        seedPrefetchedData(qc, manual.queryKey, dto.manualEntries, GESTIONALE_REPORT_STALE_MS, GESTIONALE_REPORT_GC_MS),
        seedPrefetchedData(qc, settings.queryKey, dto.settings, GESTIONALE_STATIC_STALE_MS, GESTIONALE_STATIC_GC_MS),
      ]);
      return;
    }
    case "preventivi": {
      const includeOrdini = options?.includeOrdini === true;
      const dto = await fetchPreventiviPageDTOServer(includeOrdini);
      const seeds: Promise<void>[] = [
        seedPrefetchedData(
          qc,
          preventiviRecordsQueryKey(),
          dto.preventivi,
          GESTIONALE_SEMI_STALE_MS,
          GESTIONALE_SEMI_GC_MS,
        ),
        seedPrefetchedData(
          qc,
          preventiviBillingQueryKey(),
          dto.billing,
          GESTIONALE_SEMI_STALE_MS,
          GESTIONALE_SEMI_GC_MS,
        ),
      ];
      if (includeOrdini && dto.ordini) {
        seeds.push(
          seedPrefetchedData(
            qc,
            ordiniFornitoriListQueryKey(),
            dto.ordini,
            GESTIONALE_SEMI_STALE_MS,
            GESTIONALE_SEMI_GC_MS,
          ),
        );
      }
      await Promise.all(seeds);
      return;
    }
    case "fatturazione": {
      const includeOpenItems = options?.includeOpenItems === true;
      const includePayments = options?.includePayments === true;
      const dto = await fetchFatturazionePageDTOServer({ includeOpenItems, includePayments });
      const seeds: Promise<void>[] = [
        seedPrefetchedData(qc, fatturazioneListQueryKey(), dto.list, GESTIONALE_SEMI_STALE_MS, GESTIONALE_SEMI_GC_MS),
      ];
      if (includeOpenItems && dto.openItems) {
        seeds.push(
          seedPrefetchedData(
            qc,
            fatturazioneOpenItemsQueryKey(),
            dto.openItems,
            GESTIONALE_SEMI_STALE_MS,
            GESTIONALE_SEMI_GC_MS,
          ),
        );
      }
      if (includePayments && dto.payments) {
        seeds.push(
          seedPrefetchedData(
            qc,
            fatturazionePaymentsQueryKey(),
            dto.payments,
            GESTIONALE_SEMI_STALE_MS,
            GESTIONALE_SEMI_GC_MS,
          ),
        );
      }
      await Promise.all(seeds);
      return;
    }
    case "impostazioni": {
      await prefetchSettingsPayload(qc, getAppSettingsPayloadServer);
      return;
    }
    case "agenda": {
      const dto = await fetchAgendaPageDefaultRangeServer();
      await seedPrefetchedData(
        qc,
        ["workshop_schedule_events", "range", dto.rangeStart, dto.rangeEnd, dto.filtersKey] as const,
        dto.sessions,
        GESTIONALE_SEMI_STALE_MS,
        GESTIONALE_SEMI_GC_MS,
      );
      return;
    }
    case "sicurezza": {
      const settings = resolveInitialLoad({ scopeKey: "settings.payload" });
      const dto = await fetchSicurezzaPageDTOServer();
      if ("error" in dto) return;
      await Promise.all([
        seedPrefetchedData(qc, settings.queryKey, dto.settings, GESTIONALE_STATIC_STALE_MS, GESTIONALE_STATIC_GC_MS),
        seedPrefetchedData(
          qc,
          QK.securityUsersPermissions,
          dto.usersPermissions,
          GESTIONALE_SEMI_STALE_MS,
          GESTIONALE_SEMI_GC_MS,
        ),
      ]);
      return;
    }
    case "dipendenti": {
      const dto = await fetchDipendentiPageDTOServer();
      await Promise.all([
        seedPrefetchedData(
          qc,
          QK.dipendentiTimesheetEmployees,
          dto.employees,
          GESTIONALE_SEMI_STALE_MS,
          GESTIONALE_SEMI_GC_MS,
        ),
        seedPrefetchedData(
          qc,
          [...QK.dipendentiTimesheetEntries, dto.from, dto.to] as const,
          dto.entries,
          GESTIONALE_SEMI_STALE_MS,
          GESTIONALE_SEMI_GC_MS,
        ),
        seedPrefetchedData(
          qc,
          QK.dipendentiTimesheetMonthKeysWithData,
          dto.monthKeys,
          GESTIONALE_SEMI_STALE_MS,
          GESTIONALE_SEMI_GC_MS,
        ),
      ]);
      return;
    }
  }
}

export function createServerQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: PWA_QUERY_CLIENT_DEFAULTS.retry,
        staleTime: PWA_QUERY_CLIENT_DEFAULTS.staleTime,
        gcTime: PWA_QUERY_CLIENT_DEFAULTS.gcTime,
        refetchOnWindowFocus: PWA_QUERY_CLIENT_DEFAULTS.refetchOnWindowFocus,
        refetchOnReconnect: PWA_QUERY_CLIENT_DEFAULTS.refetchOnReconnect,
      },
    },
  });
}

async function seedPrefetchedData<T>(
  qc: QueryClient,
  queryKey: readonly unknown[],
  data: T,
  staleTime: number,
  gcTime: number,
): Promise<void> {
  await qc.prefetchQuery({
    queryKey,
    queryFn: async () => data,
    staleTime,
    gcTime,
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
  await prefetchCriticalPage(qc, "dashboard");
  await prefetchDeferredPage(qc, "dashboard");
  return dehydrate(qc);
}

export async function prefetchMezziPage(): Promise<DehydratedState> {
  const qc = createServerQueryClient();
  await prefetchCriticalPage(qc, "mezzi");
  await prefetchDeferredPage(qc, "mezzi");
  return dehydrate(qc);
}

export async function prefetchLavorazioniPage(): Promise<DehydratedState> {
  const qc = createServerQueryClient();
  await prefetchCriticalPage(qc, "lavorazioni");
  await prefetchDeferredPage(qc, "lavorazioni");
  return dehydrate(qc);
}

export async function prefetchDocumentiPage(): Promise<DehydratedState> {
  const qc = createServerQueryClient();
  await prefetchCriticalPage(qc, "documenti");
  await prefetchDeferredPage(qc, "documenti");
  return dehydrate(qc);
}

export async function prefetchMagazzinoPage(): Promise<DehydratedState> {
  const qc = createServerQueryClient();
  await prefetchCriticalPage(qc, "magazzino");
  await prefetchDeferredPage(qc, "magazzino");
  return dehydrate(qc);
}

export async function prefetchReportPage(): Promise<DehydratedState> {
  const qc = createServerQueryClient();
  await prefetchCriticalPage(qc, "report");
  await prefetchDeferredPage(qc, "report");
  return dehydrate(qc);
}

export async function prefetchPreventiviPage(): Promise<DehydratedState> {
  const qc = createServerQueryClient();
  await prefetchCriticalPage(qc, "preventivi");
  await prefetchDeferredPage(qc, "preventivi");
  return dehydrate(qc);
}

export async function prefetchFatturazionePage(): Promise<DehydratedState> {
  const qc = createServerQueryClient();
  await prefetchCriticalPage(qc, "fatturazione");
  await prefetchDeferredPage(qc, "fatturazione");
  return dehydrate(qc);
}

export async function prefetchImpostazioniPage(): Promise<DehydratedState> {
  const qc = createServerQueryClient();
  await prefetchCriticalPage(qc, "impostazioni");
  await prefetchDeferredPage(qc, "impostazioni");
  return dehydrate(qc);
}

export async function prefetchAgendaPage(): Promise<DehydratedState> {
  const qc = createServerQueryClient();
  await prefetchCriticalPage(qc, "agenda");
  await prefetchDeferredPage(qc, "agenda");
  return dehydrate(qc);
}

export async function prefetchDipendentiPage(): Promise<DehydratedState> {
  const qc = createServerQueryClient();
  await prefetchCriticalPage(qc, "dipendenti");
  await prefetchDeferredPage(qc, "dipendenti");
  return dehydrate(qc);
}

export async function prefetchSicurezzaPage(): Promise<DehydratedState> {
  const qc = createServerQueryClient();
  await prefetchCriticalPage(qc, "sicurezza");
  await prefetchDeferredPage(qc, "sicurezza");
  return dehydrate(qc);
}

// Re-export for server modules that import filter presets from fetch-server
export { LAVORAZIONI_ATTIVE_LIGHT_FILTERS, LAVORAZIONI_REPORT_FILTERS };
