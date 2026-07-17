import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { getPrefetchRoutesForScope } from "@/lib/render/query-ownership-registry";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const page = read("app/(gestionale)/report/page.tsx");
const deferred = read("components/gestionale/report/report-deferred-hydration.tsx");
const bff = read("lib/bff/report-bundle-fetch-server.ts");
const prefetch = read("src/lib/react-query/prefetch-gestionale-page.ts");
const listHooks = read("src/hooks/gestionale/use-entity-list-queries.ts");
const reportQueries = read("src/hooks/gestionale/use-report-queries.ts");
const liveData = read("lib/report/use-report-live-data.ts");
const derived = read("lib/report/use-report-live-data-derived.ts");
const view = read("components/gestionale/report/report-view.tsx");
const loaders = read("components/report/report-section-loaders.ts");
const derivedPrefetch = read("components/report/use-report-derived-prefetch.ts");
const lavSection = read("components/report/report-lavorazioni-section.tsx");
const magSection = read("components/report/report-magazzino-section.tsx");

assert.match(page, /prefetchCriticalPage\(qc, "report"\)/);
assert.match(page, /ReportDeferredHydration/);
assert.match(page, /Suspense/);
assert.match(page, /GestionaleHydrationBoundary/);
assert.doesNotMatch(page, /prefetchReportPage\(\)/);

assert.match(deferred, /prefetchDeferredPage\(qc, "report"\)/);

assert.match(bff, /fetchReportDataDTOServer/);
assert.match(bff, /cache\(/);
assert.match(bff, /Promise\.all/);
assert.match(bff, /enrichLavorazioneListRowsWithMezzi/);

const prefetchDeferred = prefetch.split("export async function prefetchDeferredPage")[1] ?? "";
const reportBlock = prefetchDeferred.split('case "report":')[1]?.split('case "')[0] ?? "";
assert.match(reportBlock, /fetchReportDataDTOServer/);
assert.match(reportBlock, /seedPrefetchedData/);
assert.match(reportBlock, /lavorazioni\.list\.report/);
assert.match(reportBlock, /magazzino\.report/);
assert.match(reportBlock, /mezzi\.report/);
assert.match(reportBlock, /movimenti\.list/);
assert.match(reportBlock, /report\.manualEntries/);

assert.match(listHooks, /mezzi\.report/);
assert.match(listHooks, /magazzino\.report/);
assert.match(listHooks, /movimenti\.list/);

assert.match(reportQueries, /LAVORAZIONI_REPORT_FILTERS/);
assert.match(reportQueries, /useReportLavorazioniQuery/);
assert.match(reportQueries, /useReportManualEntriesQuery/);
assert.match(reportQueries, /lavorazioni\.list\.report/);
assert.match(reportQueries, /report\.manualEntries/);
assert.match(reportQueries, /useSharedEntityQuery/);

assert.match(liveData, /enableMezzi/);
assert.match(liveData, /useReportLiveDataDerived/);
assert.match(read("components/report/report-analytics-view.tsx"), /enableMezzi:\s*false/);
assert.match(liveData, /useReportLavorazioniQuery/);
assert.doesNotMatch(liveData, /includeMezzo:\s*true/);

assert.match(derived, /useReportLiveDataDerived/);
assert.match(derived, /needsClientEnrich/);

assert.match(view, /dynamic\s*\(/);
assert.match(view, /ReportAnalyticsView/);
assert.doesNotMatch(view, /ssr:\s*false/);

assert.match(loaders, /loadReportSection/);

assert.match(derivedPrefetch, /economicEnabled/);
assert.match(derivedPrefetch, /dati_economici/);
assert.match(derivedPrefetch, /grafici_kpi/);

assert.match(lavSection, /ReportLavorazioniImportResultModal = dynamic/);
assert.match(magSection, /ReportMagazzinoManualHistoryModal = dynamic/);

for (const scope of [
  "lavorazioni.list.report",
  "mezzi.report",
  "magazzino.report",
  "movimenti.list",
  "report.manualEntries",
] as const) {
  assert.ok(getPrefetchRoutesForScope(scope).includes("/report"), `${scope} must prefetch on /report`);
}

console.log("report-perf-policy.test.ts OK");
