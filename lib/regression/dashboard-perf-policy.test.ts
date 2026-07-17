import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { LAVORAZIONI_DASHBOARD_REPORT_FILTERS } from "@/lib/lavorazioni/lavorazioni-prefetch-filters";
import { resolveInitialLoad } from "@/lib/render/render-path-orchestrator";
import { getPrefetchRoutesForScope } from "@/lib/render/query-ownership-registry";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

assert.equal(LAVORAZIONI_DASHBOARD_REPORT_FILTERS.fetchMode, "report");
assert.equal(LAVORAZIONI_DASHBOARD_REPORT_FILTERS.includeMezzo, false);

const clientReportKey = resolveInitialLoad({ scopeKey: "lavorazioni.list.report" }).queryKey;
const bff = read("lib/bff/dashboard-data-fetch-server.ts");
const prefetch = read("src/lib/react-query/prefetch-gestionale-page.ts");

assert.match(bff, /LAVORAZIONI_DASHBOARD_REPORT_FILTERS/);
assert.match(prefetch, /lavorazioni\.list\.report/);
const prefetchDeferred = prefetch.split("export async function prefetchDeferredPage")[1] ?? "";
const dashboardDeferredBlock =
  prefetchDeferred.split('case "dashboard":')[1]?.split('case "lavorazioni":')[0] ?? "";
assert.match(dashboardDeferredBlock, /lavorazioni\.list\.report/);
assert.doesNotMatch(dashboardDeferredBlock, /lavorazioni\.list\.attive/);

const dashboardMetrics = read("src/hooks/view/use-dashboard-metrics.ts");
assert.match(dashboardMetrics, /useLavorazioniReportSlice/);

const reportRoutes = getPrefetchRoutesForScope("lavorazioni.list.report");
assert.ok(reportRoutes.includes("/dashboard"), "report scope must include /dashboard for SSR hydration");

const page = read("app/(gestionale)/dashboard/page.tsx");
assert.match(page, /DashboardDeferredHydration/);

const deferred = read("components/dashboard/dashboard-deferred-hydration.tsx");
assert.match(deferred, /prefetchDeferredPage/);

const renderer = read("components/dashboard/dashboard-widget-renderer.tsx");
assert.match(renderer, /dynamic\s*\(/);

assert.ok(
  JSON.stringify(clientReportKey).length > 2,
  "report query key must be resolved for alignment check",
);

const provider = read("components/dashboard/control-tower-metrics-provider.tsx");
assert.match(provider, /useDashboardSyncInvalidation/);

assert.match(read("lib/dashboard/use-dashboard-header-kpi-queries.ts"), /useDashboardHeaderKpiQueries/);
assert.match(read("src/hooks/view/use-control-tower-metrics.ts"), /useDashboardHeaderKpiQueries/);

console.log("dashboard-perf-policy.test.ts OK");
