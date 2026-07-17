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

assert.equal(LAVORAZIONI_ATTIVE_RPC_FILTERS.includeMezzo, false);
assert.match(view, /listIncludeMezzo/);
assert.match(view, /enrichLavorazioneListRowsWithMezzi/);
assert.match(listV2, /includeMezzo !== true/);

assert.match(bff, /getMezziListLightServer/);
assert.match(bff, /Promise\.all/);

const prefetchDeferred = prefetch.split("export async function prefetchDeferredPage")[1] ?? "";
const lavDeferredBlock =
  prefetchDeferred.split('case "lavorazioni":')[1]?.split('case "lavorazioni_clienti":')[0] ?? "";
assert.match(lavDeferredBlock, /mezziListQueryKey/);
assert.match(lavDeferredBlock, /dto\.mezzi/);

assert.match(view, /LavorazioneCompletamentoEditModal = dynamic/);
assert.match(view, /SchedaConcurrencyMergeDialog = dynamic/);
assert.match(view, /LavorazioneConcludiConfirmDialogLazy/);
assert.match(view, /LavorazioneEliminaConfirmDialogLazy/);
assert.match(view, /GestionaleModalGate/);
assert.match(read("components/gestionale/lavorazioni/lavorazioni-confirm-dialogs-lazy.tsx"), /dynamic/);

const listFetchServer = read("lib/lavorazioni/lavorazioni-list-fetch-server.ts");
assert.match(listFetchServer, /lavorazioniAttiveListFilters/);

const lavRoutes = getPrefetchRoutesForScope("lavorazioni.list.attive");
assert.ok(lavRoutes.includes("/lavorazioni"));

console.log("lavorazioni-perf-policy.test.ts OK");
