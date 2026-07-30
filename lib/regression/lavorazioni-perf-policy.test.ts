import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  LAVORAZIONI_ATTIVE_RPC_FILTERS,
} from "@/lib/lavorazioni/lavorazioni-prefetch-filters";
import { getPrefetchRoutesForScope } from "@/lib/render/query-ownership-registry";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const view = read("components/gestionale/lavorazioni/lavorazioni-view.tsx");
const listV2 = read("lib/lavorazioni/use-lavorazioni-list-v2.ts");
const bff = read("lib/bff/lavorazioni-page-fetch-server.ts");
const prefetch = read("src/lib/react-query/prefetch-gestionale-page.ts");
const page = read("app/(gestionale)/lavorazioni/page.tsx");
const deferred = read("components/gestionale/lavorazioni/lavorazioni-deferred-hydration.tsx");
const secondaryPrefetch = read("lib/lavorazioni/use-lavorazioni-secondary-prefetch.ts");

assert.equal(LAVORAZIONI_ATTIVE_RPC_FILTERS.includeMezzo, false);
assert.match(view, /listIncludeMezzo/);
assert.match(view, /enrichLavorazioneListRowsWithMezzi/);
assert.match(listV2, /includeMezzo !== true/);

assert.match(bff, /getMezziListLightServer/);
assert.match(bff, /getLavorazioniArchivioCountServer/);
assert.match(bff, /Promise\.all/);
assert.match(bff, /archivioCount/);

const prefetchDeferred = prefetch.split("export async function prefetchDeferredPage")[1] ?? "";
const lavDeferredBlock =
  prefetchDeferred.split('case "lavorazioni":')[1]?.split('case "lavorazioni_clienti":')[0] ?? "";
assert.match(lavDeferredBlock, /mezziListQueryKey/);
assert.match(lavDeferredBlock, /dto\.mezzi/);
assert.match(lavDeferredBlock, /dto\.archivioCount/);
assert.doesNotMatch(lavDeferredBlock, /getLavorazioniArchivioCountServer/);

assert.match(page, /prefetchCriticalPage\(qc, "lavorazioni"\)/);
assert.match(page, /LavorazioniDeferredHydration/);
assert.match(page, /Suspense/);
assert.doesNotMatch(page, /prefetchGestionalePage\(qc, "lavorazioni"\)/);

assert.match(deferred, /prefetchDeferredPage\(qc, "lavorazioni"\)/);
assert.doesNotMatch(deferred, /if\s*\(.*data/);

assert.match(view, /LavorazioneCompletamentoEditModal = dynamic/);
assert.match(view, /SchedaConcurrencyMergeDialog = dynamic/);
assert.match(view, /LavorazioneConcludiConfirmDialogLazy/);
assert.match(view, /LavorazioneEliminaConfirmDialogLazy/);
assert.match(view, /GestionaleModalGate/);
assert.match(read("components/gestionale/lavorazioni/lavorazioni-confirm-dialogs-lazy.tsx"), /dynamic/);

assert.match(view, /attiveQuery\.data === undefined/);
assert.match(view, /chiuseQuery\.data === undefined/);

assert.match(view, /useLavorazioniSecondaryQueryGate/);
assert.match(secondaryPrefetch, /requestIdleCallback/);
assert.match(secondaryPrefetch, /setTimeout/);

assert.match(view, /LavorazioneAttivaTableRow/);
assert.match(view, /GlobalTableSortTh/);
assert.doesNotMatch(view, /lavorazioni-list-section/);

const listFetchServer = read("lib/lavorazioni/lavorazioni-list-fetch-server.ts");
assert.match(listFetchServer, /lavorazioniAttiveListFilters/);

const lavRoutes = getPrefetchRoutesForScope("lavorazioni.list.attive");
assert.ok(lavRoutes.includes("/lavorazioni"));

console.log("lavorazioni-perf-policy.test.ts OK");
