import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const matrix = read("docs/performance-regression-matrix.md");
assert.match(matrix, /INP/);
assert.match(matrix, /<3000 ms \(S1\)/);
assert.match(matrix, /≤1600 KB min/);
assert.match(matrix, /bench:memory/);

const listRollout = read("lib/performance/list-pagination-rollout.ts");
assert.doesNotMatch(listRollout, /vercelEnv === "preview"/);

const portalBff = read("lib/bff/client-portal-page-fetch-server.ts");
assert.doesNotMatch(portalBff, /CLIENT_PORTAL_ARCHIVIO_FILTERS/);
assert.match(portalBff, /archivio: LavorazioneListRow\[\] = \[\]/);

const dashboardBff = read("lib/bff/dashboard-data-fetch-server.ts");
assert.match(dashboardBff, /headerKpi/);
assert.match(dashboardBff, /fetchPreventiviRecordsServer/);
assert.match(dashboardBff, /fetchInvoiceListPayloadServer/);

const dashboardView = read("components/dashboard/dashboard-view.tsx");
assert.match(dashboardView, /calendarOpen/);
assert.doesNotMatch(dashboardView, /calendarV2Enabled \? <CalendarV2Section/);

const deferredBridges = read("src/components/deferred-gestionale-bridges.tsx");
assert.match(deferredBridges, /requestIdleCallback/);

const kanbanBoard = read("components/gestionale/lavorazioni/lavorazioni-kanban-desktop-board.tsx");
assert.match(kanbanBoard, /KanbanVirtualColumnScroll/);

assert.match(read("components/gestionale/lavorazioni/lavorazioni-page-state.tsx"), /LavorazioniModalStateProvider/);
assert.match(read("components/gestionale/lavorazioni/lavorazioni-toolbar-state.tsx"), /LavorazioniToolbarStateProvider/);

const magIndex = read("lib/magazzino/magazzino-filter-search-index.ts");
assert.match(magIndex, /buildMagazzinoHaystackIndex/);

const detailPage = read("app/(gestionale)/lavorazioni-clienti/[id]/page.tsx");
assert.match(detailPage, /ClientPortalDetailDeferredHydration/);

const registry = read("lib/performance/performance-budget-registry.ts");
assert.match(registry, /\/lavorazioni-clienti/);

console.log("performance-regression-matrix-policy.test.ts OK");
