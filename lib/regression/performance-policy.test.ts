import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  GESTIONALE_CORE_STALE_MS,
  GESTIONALE_REPORT_STALE_MS,
  GESTIONALE_VIEW_STALE_MS,
} from "@/lib/react-query/query-layer-policies";
import { CLIENT_PAGE_SIZE } from "@/lib/ui/use-client-pagination";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

assert.equal(GESTIONALE_CORE_STALE_MS, 30_000);
assert.equal(GESTIONALE_VIEW_STALE_MS, 60_000);
assert.equal(GESTIONALE_REPORT_STALE_MS, 120_000);
assert.equal(CLIENT_PAGE_SIZE, 100);

const realtimeConfig = read("lib/realtime/gestionale-realtime-config.ts");
assert.match(realtimeConfig, /GESTIONALE_REALTIME_POLL_MS = 20_000/);

const reportView = read("components/gestionale/report/report-view.tsx");
const documentiView = read("components/gestionale/documenti/documenti-view.tsx");
const preventiviView = read("components/preventivi/preventivi-view.tsx");
const lavorazioniView = read("components/gestionale/lavorazioni/lavorazioni-view.tsx");
const magazzinoView = read("components/gestionale/magazzino/magazzino-view.tsx");

for (const [name, src] of [
  ["documenti-view", documentiView],
  ["preventivi-view", preventiviView],
  ["lavorazioni-view", lavorazioniView],
  ["magazzino-view", magazzinoView],
] as const) {
  assert.match(src, /dynamic\s*\(/, `${name} missing next/dynamic code split`);
}

assert.doesNotMatch(
  reportView,
  /ssr:\s*false/,
  "report-view should SSR after server prefetch (no ssr:false wrapper)",
);

assert.match(magazzinoView, /RicambioNewModal/, "magazzino-view should lazy-load RicambioNewModal");
assert.match(magazzinoView, /RicambioEditModal/, "magazzino-view should lazy-load RicambioEditModal");
assert.match(magazzinoView, /MagazzinoRicambioInfoModal|magazzino-modals/, "magazzino info modal lazy split");
assert.match(magazzinoView, /virtualRows/, "magazzino-view should use virtualized table rows");
assert.match(magazzinoView, /gestionaleListTableLastRowAttr/, "magazzino last row should mark bottom corner radius");
assert.match(read("components/gestionale/global-table/gestionale-list-table.css"), /data-gestionale-last-row/);

const lazyPdf = read("lib/pdf/lazy-pdf-modules.ts");
assert.match(lazyPdf, /importLavorazioniListPdf/);
assert.match(lazyPdf, /importPreventiviPdf/);
assert.match(lazyPdf, /importDipendentiPdfSections/);
assert.match(read("lib/pdf/pdf-worker-pilot.ts"), /runPdfGenerationInWorker/);

const lavorazioniViewPdf = read("components/gestionale/lavorazioni/lavorazioni-view.tsx");
assert.doesNotMatch(
  lavorazioniViewPdf,
  /from "@\/lib\/lavorazioni\/lavorazioni-list-pdf"/,
  "lavorazioni-view should not statically import PDF module",
);
assert.match(lavorazioniViewPdf, /openPdfArtifact/, "lavorazioni PDF via server artifact API");

const lazyRouteViews = read("components/gestionale/lazy-route-views.tsx");
assert.match(lazyRouteViews, /LavorazioniViewLazy/);
assert.match(lazyRouteViews, /DashboardViewLazy/);
assert.match(lazyRouteViews, /dynamic\s*\(/);

const appShell = read("components/gestionale/app-shell.tsx");
assert.match(appShell, /useBootInvestigationMount/);
assert.match(appShell, /AppShellSidebar/);
assert.doesNotMatch(appShell, /UiOsShadowMount/);
assert.doesNotMatch(appShell, /from "@\/lib\/ui-os"/);

const lavPage = read("app/(gestionale)/lavorazioni/page.tsx");
assert.match(lavPage, /LavorazioniViewLazy/);
assert.match(lavPage, /UIPageAdapterGate/);

assert.match(lavorazioniView, /LavorazioneCreateModal = dynamic/);

assert.match(reportView, /dynamic\s*\(/);
assert.match(reportView, /ReportAnalyticsView/);

const preventiviViewPdf = read("components/preventivi/preventivi-view.tsx");
assert.doesNotMatch(
  preventiviViewPdf,
  /from "@\/lib\/preventivi\/preventivi-pdf"/,
  "preventivi-view should not statically import preventivi-pdf",
);

const dipendentiExport = read("lib/dipendenti/pdf/dipendenti-pdf-export.ts");
assert.doesNotMatch(
  dipendentiExport,
  /from "@\/lib\/dipendenti\/pdf\/dipendenti-pdf-sections"/,
  "dipendenti-pdf-export should lazy-load jspdf sections",
);

const queryPolicies = read("lib/react-query/query-layer-policies.ts");
assert.match(queryPolicies, /refetchOnWindowFocus: false/);
assert.match(queryPolicies, /GESTIONALE_REPORT_STALE_MS = 120_000/);

const dataCacheTiers = read("lib/react-query/data-cache-tiers.ts");
assert.match(dataCacheTiers, /GESTIONALE_STATIC_STALE_MS/);
assert.match(dataCacheTiers, /GESTIONALE_SEMI_STALE_MS/);
assert.match(dataCacheTiers, /staticQueryOpts/);
assert.match(dataCacheTiers, /semiDynamicQueryOpts/);

const globalOptions = read("src/hooks/use-global-options.ts");
assert.doesNotMatch(globalOptions, /staleTime:\s*0/, "useGlobalOptions must not force staleTime 0");
assert.match(globalOptions, /tier:\s*"static"/);

const reportLiveDataCache = read("lib/report/use-report-live-data.ts");
assert.doesNotMatch(reportLiveDataCache, /staleTime:\s*Infinity/, "report live must not use Infinity staleTime");

assert.match(read("src/context/app-settings-query-context.tsx"), /AppSettingsQueryProvider/);
assert.match(read("docs/cache-strategy-map.md"), /STATIC/);

const queryProvider = read("src/providers/query-provider.tsx");
assert.match(queryProvider, /gcTime:\s*PWA_QUERY_CLIENT_DEFAULTS\.gcTime/, "QueryClient must set explicit gcTime for long-session cache lifecycle");
assert.match(queryProvider, /shouldRefetchPwaGroupOnReconnect/);

const tableSelectColumns = read("lib/db/table-select-columns.ts");
assert.match(tableSelectColumns, /export const LAVORAZIONI_COLUMNS/);
assert.match(tableSelectColumns, /export const LAVORAZIONI_LIST_LIGHT_COLUMNS/);
assert.match(tableSelectColumns, /export const MEZZI_EMBED_LIGHT_COLUMNS/);
assert.match(tableSelectColumns, /export const MEZZI_LIST_LIGHT_COLUMNS/);
assert.match(tableSelectColumns, /export const LAVORAZIONI_REPORT_LIGHT_COLUMNS/);
assert.match(tableSelectColumns, /export const MAGAZZINO_RICAMBI_COLUMNS/);
assert.match(tableSelectColumns, /export const LOG_MODIFICHE_WITH_PROFILE_SELECT/);

const dtoMappers = read("lib/db/dto-mappers.ts");
assert.match(dtoMappers, /mapLavorazioneLightToListRow/);
assert.match(dtoMappers, /enrichLavorazioneListRowsWithMezzi/);

const logService = read("src/services/log.service.ts");
assert.match(
  logService,
  /filters\?\.limit \?\? LOG_MODIFICHE_RETENTION_PER_ENTITA/,
  "log.service must default-limit unbounded getAll",
);

const lavListFetch = read("lib/lavorazioni/lavorazioni-list-fetch.ts");
assert.match(lavListFetch, /LAVORAZIONI_LIST_LIGHT_COLUMNS/);
assert.match(lavListFetch, /MEZZI_EMBED_LIGHT_COLUMNS/);
assert.match(lavListFetch, /resolveFetchMode/);
assert.match(lavListFetch, /filters\?\.fetchMode \?\? "light"/);
assert.match(lavListFetch, /filters\?\.includeProfiles === true/);
assert.doesNotMatch(lavListFetch, /return `\*,/, "lavorazioni list select must not use bare *");

assert.match(lavorazioniView, /fetchMode:\s*"light"/);
assert.match(lavorazioniView, /needsChiuseFetch/);
assert.match(lavorazioniView, /useLavorazioneProfileNamesQuery/);
assert.match(lavorazioniView, /ServerListLoadMore/);

const dashboardMetrics = read("src/hooks/view/use-dashboard-metrics.ts");
assert.match(dashboardMetrics, /useLavorazioniReportSlice/);
assert.doesNotMatch(dashboardMetrics, /includeMezzo:\s*true/, "dashboard must not full-list embed mezzo");

const mezziView = read("components/gestionale/mezzi/mezzi-view.tsx");
assert.match(mezziView, /useLavorazioniReportSlice/);

const reportLiveData = read("lib/report/use-report-live-data.ts");
const reportLiveDerived = read("lib/report/use-report-live-data-derived.ts");
const reportQueries = read("src/hooks/gestionale/use-report-queries.ts");
assert.doesNotMatch(reportLiveData, /LAV_ARCHIVIO_FILTERS/, "report must use single lavorazioni fetch");
assert.doesNotMatch(reportQueries, /includeMezzo:\s*true/, "report lavorazioni must not embed mezzo");
assert.match(reportQueries, /LAVORAZIONI_REPORT_FILTERS/);
assert.match(reportLiveDerived, /needsClientEnrich/);
assert.match(reportLiveDerived, /enrichLavorazioneListRowsWithMezzi/);
assert.match(reportLiveDerived, /lavorazioniArchivioRaw/);

const mezziService = read("src/services/mezzi.service.ts");
assert.match(mezziService, /fetchMezziListRows/);
assert.match(mezziService, /getAllForReport/);
assert.match(read("lib/mezzi/mezzi-list-fetch.ts"), /MEZZI_LIST_LIGHT_COLUMNS/);

const dbPerfMigration = read("supabase/migrations/20260711120000_db_performance_indexes.sql");
assert.match(dbPerfMigration, /idx_lavorazioni_codice_trgm/);
assert.match(dbPerfMigration, /list_timesheet_month_keys/);

const servicesDir = path.join(ROOT, "src/services");
for (const file of fs.readdirSync(servicesDir)) {
  if (!file.endsWith(".service.ts")) continue;
  const src = fs.readFileSync(path.join(servicesDir, file), "utf8");
  assert.doesNotMatch(
    src,
    /\.select\(['"]\*['"]\)/,
    `${file} must not use select('*') — use lib/db/table-select-columns.ts`,
  );
}

const renamePropagation = read("src/services/settings-rename-propagation.service.ts");
assert.match(renamePropagation, /runBatchedRowUpdates/);

const slowQueryAuditScript = read("scripts/ops/slow-query-audit.mjs");
assert.match(slowQueryAuditScript, /slow-query-audit\.json/);
assert.match(slowQueryAuditScript, /pg_stat_statements|pgStatStatements/);

const queryInventory = read("scripts/ops/query-inventory.json");
assert.match(queryInventory, /"queries"/);
assert.match(queryInventory, /"preventivi-embed"/);

const perfBudgetRegistry = read("lib/performance/performance-budget-registry.ts");
assert.match(perfBudgetRegistry, /PERFORMANCE_BUDGETS/);
assert.match(perfBudgetRegistry, /maxPayloadKb/);

const perfRegressionGuard = read("scripts/ops/performance-regression-check.mjs");
assert.match(perfRegressionGuard, /FAIL_PCT|failPct/);
assert.match(perfRegressionGuard, /performance-regression-diff\.json/);

const buildBudgetGate = read("scripts/ops/extract-build-budgets.mjs");
assert.match(buildBudgetGate, /build-budget-snapshot\.json/);
assert.match(buildBudgetGate, /--gate/);

const perfGovernanceDoc = read("docs/performance-governance-v6-budget.md");
assert.match(perfGovernanceDoc, /GLOBAL_FIRST_LOAD_JS_KB/);

const slowQueryDoc = read("docs/slow-query-audit.md");
for (const section of [
  "Top query lente",
  "Seq scan rilevati",
  "Overhead RLS",
  "Hotspot ranking",
  "Raccomandazioni future",
]) {
  assert.match(slowQueryDoc, new RegExp(section), `docs/slow-query-audit.md missing section: ${section}`);
}

const gestionaleModal = read("components/gestionale/gestionale-modal.tsx");
assert.doesNotMatch(
  gestionaleModal,
  /lavorazioni-modals/,
  "gestionale-modal must import shell from gestionale-modal-shell, not lavorazioni-modals",
);
assert.match(gestionaleModal, /gestionale-modal-shell/);

const modalShell = read("components/gestionale/gestionale-modal-shell.tsx");
assert.match(modalShell, /GestionaleModalShell/);

const resolveAuth = read("src/lib/auth/resolve-server-auth.ts");
assert.match(resolveAuth, /isJwtFreshForProxyCache/);

const proxyHandler = read("src/middleware/proxy-handler.ts");
assert.match(proxyHandler, /no_auth_cookie/);

const prefetchGestionale = read("src/lib/react-query/prefetch-gestionale-page.ts");
assert.match(prefetchGestionale, /seedPrefetchedData/);
assert.doesNotMatch(prefetchGestionale, /qc\.setQueryData\(/, "prefetch must use prefetchQuery tiers, not bare setQueryData");

const gestionaleLoadingRoutes = [
  "app/(gestionale)/dashboard/loading.tsx",
  "app/(gestionale)/lavorazioni/loading.tsx",
  "app/(gestionale)/magazzino/loading.tsx",
  "app/(gestionale)/mezzi/loading.tsx",
  "app/(gestionale)/preventivi/loading.tsx",
  "app/(gestionale)/fatturazione/loading.tsx",
  "app/(gestionale)/documenti/loading.tsx",
  "app/(gestionale)/report/loading.tsx",
  "app/(gestionale)/impostazioni/loading.tsx",
  "app/(gestionale)/agenda/loading.tsx",
  "app/(gestionale)/dipendenti/loading.tsx",
  "app/(gestionale)/sicurezza/loading.tsx",
  "app/(gestionale)/lavorazioni-clienti/loading.tsx",
  "app/(gestionale)/acesso-negato/loading.tsx",
];
for (const route of gestionaleLoadingRoutes) {
  assert.ok(fs.existsSync(path.join(ROOT, route)), `missing loading.tsx: ${route}`);
}

assert.match(prefetchGestionale, /prefetchCriticalPage/);
assert.match(prefetchGestionale, /prefetchDeferredPage/);

const globalsCore = read("app/globals-core.css");
assert.match(globalsCore, /gestionale-list-layout\.css/);
assert.ok(fs.existsSync(path.join(ROOT, "app/globals-gestionale-shell.css")), "missing globals-gestionale-shell.css");
const globalsGestionaleShell = read("app/globals-gestionale-shell.css");

const gestionaleLayout = read("app/(gestionale)/layout.tsx");
const rootLayout = read("app/layout.tsx");
assert.match(gestionaleLayout, /globals-gestionale-shell\.css/);
assert.doesNotMatch(rootLayout, /globals-gestionale-shell/);
assert.match(read("app/globals.css"), /@import "\.\/globals-core\.css"/);
assert.match(globalsGestionaleShell, /cab-nav-drawer-panel\.cab-sidebar[\s\S]*--cab-sidebar-icon-anchor: 0/);
assert.match(globalsGestionaleShell, /cab-nav-drawer-panel\.cab-sidebar \.cab-sidebar-nav-row[\s\S]*min-height: 3\.25rem/);

const drawerNavSsot = read("lib/ui/modal-size-system.ts");
assert.match(drawerNavSsot, /drawerNav:[\s\S]*bg-\[var\(--cab-card\)\]/);

const useGestionaleConfirm = read("src/hooks/use-gestionale-confirm.tsx");
assert.match(useGestionaleConfirm, /GestionaleConfirmDialogLazy/);
assert.doesNotMatch(useGestionaleConfirm, /from "@\/components\/gestionale\/gestionale-confirm-dialog"/);

const globalTableSortIcon = read("components/gestionale/global-table/global-table-sort-icon.tsx");
assert.doesNotMatch(globalTableSortIcon, /"use client"/);

const useServiceQuery = read("src/hooks/use-service-query.ts");
assert.match(useServiceQuery, /signal/);
assert.match(useServiceQuery, /runWithAbortSignal/);
assert.doesNotMatch(useServiceQuery, /onAbort = \(\) => \{\s*throw/);

const useGestionaleQueryOpts = read("src/hooks/gestionale/use-gestionale-query-opts.ts");
assert.match(useGestionaleQueryOpts, /GESTIONALE_CORE_STALE_MS/);

const globalLoadingBridge = read("src/components/global-loading-query-bridge.tsx");
assert.match(globalLoadingBridge, /readGlobalLoadingMeta\(q\.meta\) === null/);

const authRetry = read("src/lib/auth/auth-network-retry.ts");
assert.match(authRetry, /getUserWithAuthRetry/);

console.log("performance-policy.test.ts OK");
