import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { getPrefetchRoutesForScope } from "@/lib/render/query-ownership-registry";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const page = read("app/(gestionale)/mezzi/page.tsx");
const deferred = read("components/gestionale/mezzi/mezzi-deferred-hydration.tsx");
const bff = read("lib/bff/mezzi-page-fetch-server.ts");
const prefetch = read("src/lib/react-query/prefetch-gestionale-page.ts");
const listHooks = read("src/hooks/gestionale/use-entity-list-queries.ts");
const view = read("components/gestionale/mezzi/mezzi-view.tsx");
const derived = read("lib/mezzi/use-mezzi-list-derived.ts");
const matrix = read("components/gestionale/mezzi/mezzi-tagliandi-matrix-table.tsx");

assert.match(page, /prefetchCriticalPage\(qc, "mezzi"\)/);
assert.match(page, /MezziDeferredHydration/);
assert.match(page, /Suspense/);

assert.match(deferred, /prefetchDeferredPage\(qc, "mezzi"\)/);

assert.match(bff, /fetchMezziPageDTOServer/);
assert.match(bff, /getMezziListLightServer/);
assert.match(bff, /cache\(/);

const prefetchDeferred = prefetch.split("export async function prefetchDeferredPage")[1] ?? "";
const mezziBlock = prefetchDeferred.split('case "mezzi":')[1]?.split('case "')[0] ?? "";
assert.match(mezziBlock, /fetchMezziPageDTOServer/);
assert.match(mezziBlock, /seedPrefetchedData/);

assert.match(listHooks, /ownershipScopeKey: variant === "list" \? MEZZI_LIST_SCOPE/);
assert.match(listHooks, /mezzi\.list/);

assert.match(view, /MezziFilterFields = dynamic/);
assert.match(view, /MezziLogDrawer = dynamic/);
assert.match(view, /MezziEditModal = dynamic/);
assert.match(view, /filtriEspansi \?/);
assert.match(view, /useMezziListDerived/);
assert.match(view, /useLavorazioniReportSlice/);
assert.match(view, /prefetchMezziTagliandiQueries/);

assert.match(derived, /useMezziListDerived/);
assert.match(derived, /buildInterventiByMezzoIdFromLavorazioni/);
assert.match(derived, /filterMezziGestiti/);

assert.match(matrix, /virtualRows/);
assert.match(matrix, /mezzoTagliandiEnabled/);

const mezziRoutes = getPrefetchRoutesForScope("mezzi.list");
assert.ok(mezziRoutes.includes("/mezzi"));

console.log("mezzi-perf-policy.test.ts OK");
