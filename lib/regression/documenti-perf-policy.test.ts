import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { getPrefetchRoutesForScope } from "@/lib/render/query-ownership-registry";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const page = read("app/(gestionale)/documenti/page.tsx");
const deferred = read("components/gestionale/documenti/documenti-deferred-hydration.tsx");
const bff = read("lib/bff/documenti-page-fetch-server.ts");
const prefetch = read("src/lib/react-query/prefetch-gestionale-page.ts");
const listHooks = read("src/hooks/gestionale/use-entity-list-queries.ts");
const view = read("components/gestionale/documenti/documenti-view.tsx");
const derived = read("lib/documenti/use-documenti-list-derived.ts");

assert.match(page, /prefetchCriticalPage\(qc, "documenti"\)/);
assert.match(page, /DocumentiDeferredHydration/);
assert.match(page, /Suspense/);

assert.match(deferred, /prefetchDeferredPage\(qc, "documenti"\)/);

assert.match(bff, /fetchDocumentiPageDTOServer/);
assert.match(bff, /getDocumentiDashboardDTOServer/);

const prefetchDeferred = prefetch.split("export async function prefetchDeferredPage")[1] ?? "";
const docBlock = prefetchDeferred.split('case "documenti":')[1]?.split('case "')[0] ?? "";
assert.match(docBlock, /fetchDocumentiPageDTOServer/);
assert.match(docBlock, /documentiListQueryKey/);

assert.match(listHooks, /ownershipScopeKey: DOCUMENTI_LIST_SCOPE/);
assert.match(listHooks, /documenti\.list/);
assert.match(listHooks, /ownershipScopeKey: variant === "list" \? MEZZI_LIST_SCOPE/);
assert.match(listHooks, /mezzi\.list/);

assert.match(view, /DocumentiAdvancedFilterPanel = dynamic/);
assert.match(view, /DocumentiLogDrawer = dynamic/);
assert.match(view, /filtriEspansi \?/);
assert.match(view, /useDocumentiListDerived/);

assert.match(derived, /buildDocumentiSearchHaystackById/);
assert.match(derived, /useDocumentiListDerived/);

const docRoutes = getPrefetchRoutesForScope("documenti.list");
assert.ok(docRoutes.includes("/documenti"));

console.log("documenti-perf-policy.test.ts OK");
