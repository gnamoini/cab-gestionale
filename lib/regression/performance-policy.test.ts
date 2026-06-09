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
const bunderView = read("components/bunder/bunder-view.tsx");
const preventiviView = read("components/preventivi/preventivi-view.tsx");
const lavorazioniView = read("components/gestionale/lavorazioni/lavorazioni-view.tsx");
const magazzinoView = read("components/gestionale/magazzino/magazzino-view.tsx");

for (const [name, src] of [
  ["report-view", reportView],
  ["documenti-view", documentiView],
  ["bunder-view", bunderView],
  ["preventivi-view", preventiviView],
  ["lavorazioni-view", lavorazioniView],
  ["magazzino-view", magazzinoView],
] as const) {
  assert.match(src, /dynamic\s*\(/, `${name} missing next/dynamic code split`);
}

assert.match(magazzinoView, /RicambioNewModal/, "magazzino-view should lazy-load RicambioNewModal");
assert.match(magazzinoView, /RicambioEditModal/, "magazzino-view should lazy-load RicambioEditModal");
assert.match(magazzinoView, /MagazzinoRicambioInfoModal|magazzino-modals/, "magazzino info modal lazy split");
assert.match(magazzinoView, /virtualRows/, "magazzino-view should use virtualized table rows");
assert.match(magazzinoView, /gestionaleListTableLastRowAttr/, "magazzino last row should mark bottom corner radius");
assert.match(read("components/gestionale/global-table/gestionale-list-table.css"), /data-gestionale-last-row/);

const lazyPdf = read("lib/pdf/lazy-pdf-modules.ts");
assert.match(lazyPdf, /importLavorazioniListPdf/);
assert.match(lazyPdf, /importPreventiviPdf/);
assert.match(lazyPdf, /importBunderPdf/);
assert.match(lazyPdf, /importDipendentiPdfSections/);

const lavorazioniViewPdf = read("components/gestionale/lavorazioni/lavorazioni-view.tsx");
assert.doesNotMatch(
  lavorazioniViewPdf,
  /from "@\/lib\/lavorazioni\/lavorazioni-list-pdf"/,
  "lavorazioni-view should not statically import PDF module",
);
assert.match(lavorazioniViewPdf, /importLavorazioniListPdf/, "lavorazioni PDF via dynamic import");

const preventiviViewPdf = read("components/preventivi/preventivi-view.tsx");
assert.doesNotMatch(
  preventiviViewPdf,
  /from "@\/lib\/preventivi\/preventivi-pdf"/,
  "preventivi-view should not statically import preventivi-pdf",
);

const bunderViewPdf = read("components/bunder/bunder-view.tsx");
assert.doesNotMatch(
  bunderViewPdf,
  /from "@\/lib\/bunder\/bunder-pdf"/,
  "bunder-view should not statically import bunder-pdf",
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

const queryProvider = read("src/providers/query-provider.tsx");
assert.match(queryProvider, /gcTime:\s*300_000/, "QueryClient must set explicit gcTime for long-session cache lifecycle");

console.log("performance-policy.test.ts OK");
