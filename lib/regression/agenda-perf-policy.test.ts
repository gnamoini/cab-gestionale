import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const page = read("app/(gestionale)/agenda/page.tsx");
const view = read("components/workshop-schedule/agenda-officina-view.tsx");
const lazyPanels = read("components/workshop-schedule/agenda-lazy-panels.tsx");
const bff = read("lib/bff/agenda-page-fetch-server.ts");
const fetchServer = read("lib/workshop-schedule/workshop-schedule-fetch-server.ts");
const prefetch = read("src/lib/react-query/prefetch-gestionale-page.ts");
const sessionList = read("components/workshop-schedule/agenda-session-list.tsx");

assert.match(page, /prefetchAgendaPage/);
assert.match(page, /AgendaOfficinaViewLazy/);

assert.match(bff, /fetchAgendaPageDefaultRangeServer/);
assert.match(fetchServer, /cab_list_workshop_schedule_events/);
assert.match(fetchServer, /verifyServerPageRead\("agenda"\)/);

const prefetchDeferred = prefetch.split("export async function prefetchDeferredPage")[1] ?? "";
const agendaBlock = prefetchDeferred.split('case "agenda":')[1]?.split('case "')[0] ?? "";
assert.match(agendaBlock, /fetchAgendaPageDefaultRangeServer/);
assert.match(agendaBlock, /workshop_schedule_events/);

assert.match(lazyPanels, /AgendaGanttViewLazy = dynamic/);
assert.match(lazyPanels, /AgendaDndLayerLazy = dynamic/);
assert.match(lazyPanels, /AgendaIntelligenceSidebarLazy = dynamic/);
assert.match(view, /AgendaGanttViewLazy/);
assert.match(view, /AgendaDndLayerLazy/);
assert.match(view, /AgendaIntelligenceSidebarLazy/);
assert.match(view, /GestionaleModalGate/);

assert.match(sessionList, /AGENDA_LIST_VIRTUAL_THRESHOLD/);
assert.match(sessionList, /useVirtualizer/);

console.log("agenda-perf-policy.test.ts OK");
