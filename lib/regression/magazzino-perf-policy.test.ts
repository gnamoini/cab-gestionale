import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { getPrefetchRoutesForScope } from "@/lib/render/query-ownership-registry";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const page = read("app/(gestionale)/magazzino/page.tsx");
const deferred = read("components/gestionale/magazzino/magazzino-deferred-hydration.tsx");
const bff = read("lib/bff/magazzino-page-fetch-server.ts");
const prefetch = read("src/lib/react-query/prefetch-gestionale-page.ts");
const listHooks = read("src/hooks/gestionale/use-entity-list-queries.ts");
const view = read("components/gestionale/magazzino/magazzino-view.tsx");
const derived = read("lib/magazzino/use-magazzino-list-derived.ts");

assert.match(page, /prefetchCriticalPage\(qc, "magazzino"\)/);
assert.match(page, /MagazzinoDeferredHydration/);
assert.match(page, /Suspense/);

assert.match(deferred, /prefetchDeferredPage\(qc, "magazzino"\)/);

assert.match(bff, /fetchMagazzinoPageDTOServer/);
assert.match(bff, /getMagazzinoListServer/);
assert.match(bff, /cache\(/);

const prefetchDeferred = prefetch.split("export async function prefetchDeferredPage")[1] ?? "";
const magBlock = prefetchDeferred.split('case "magazzino":')[1]?.split('case "')[0] ?? "";
assert.match(magBlock, /fetchMagazzinoPageDTOServer/);
assert.match(magBlock, /seedPrefetchedData/);

assert.match(listHooks, /ownershipScopeKey: variant === "list" \? MAGAZZINO_LIST_SCOPE/);
assert.match(listHooks, /magazzino\.list/);

assert.match(view, /MagazzinoAdvancedFilterPanel = dynamic/);
assert.match(view, /GestionaleModalGate open=\{filtriEspansi\}/);
assert.match(view, /MagazzinoLogDrawer = dynamic/);
assert.match(view, /useMagazzinoListDerived/);
assert.match(view, /needConsumoMap/);
assert.doesNotMatch(view, /erpBtnNuovaLavorazione/);
assert.doesNotMatch(view, /lavorazioni-shared/);

assert.match(derived, /useMagazzinoListDerived/);
assert.match(derived, /analyzeArchiveDuplicateCodes/);

const magRoutes = getPrefetchRoutesForScope("magazzino.list");
assert.ok(magRoutes.includes("/magazzino"));

console.log("magazzino-perf-policy.test.ts OK");
