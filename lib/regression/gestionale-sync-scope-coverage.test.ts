/**
 * Static audit: view principali registrano useGestionaleSyncScope.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const ROUTE_VIEW_PAIRS: Array<{ route: string; viewFile: string }> = [
  { route: "/dashboard", viewFile: "components/dashboard/control-tower-metrics-provider.tsx" },
  { route: "/lavorazioni", viewFile: "components/gestionale/lavorazioni/lavorazioni-view.tsx" },
  { route: "/magazzino", viewFile: "components/gestionale/magazzino/magazzino-view.tsx" },
  { route: "/magazzino/carichi", viewFile: "components/gestionale/magazzino/carichi/receiving-list-view.tsx" },
  { route: "/report", viewFile: "components/report/report-analytics-view.tsx" },
  { route: "/mezzi", viewFile: "components/gestionale/mezzi/mezzi-view.tsx" },
  { route: "/preventivi", viewFile: "components/preventivi/preventivi-view.tsx" },
  { route: "/documenti", viewFile: "components/gestionale/documenti/documenti-view.tsx" },
  { route: "/dipendenti", viewFile: "components/gestionale/dipendenti/dipendenti-view.tsx" },
  { route: "/agenda", viewFile: "components/workshop-schedule/agenda-officina-view.tsx" },
  { route: "/impostazioni", viewFile: "components/dashboard/sistema-impostazioni-modal.tsx" },
  { route: "/fatturazione", viewFile: "components/fatturazione/fatturazione-view.tsx" },
  { route: "/lavorazioni-clienti", viewFile: "components/lavorazioni-clienti/client-lavorazioni-view.tsx" },
];

for (const { route, viewFile } of ROUTE_VIEW_PAIRS) {
  const src = read(viewFile);
  assert.match(
    src,
    /useGestionaleSyncScope\s*\(/,
    `${viewFile} must register sync scope for route ${route}`,
  );
}

console.log(`gestionale-sync-scope-coverage.test.ts OK (${ROUTE_VIEW_PAIRS.length} routes)`);
