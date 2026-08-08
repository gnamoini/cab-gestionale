import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { getPrefetchRoutesForScope } from "@/lib/render/query-ownership-registry";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const page = read("app/(gestionale)/preventivi/page.tsx");
const deferred = read("components/preventivi/preventivi-deferred-hydration.tsx");
const bff = read("lib/bff/preventivi-page-fetch-server.ts");
const prefetch = read("src/lib/react-query/prefetch-gestionale-page.ts");
const recordsHook = read("src/hooks/gestionale/use-preventivi-records-query.ts");
const billingHook = read("src/hooks/gestionale/use-preventivi-billing-query.ts");
const view = read("components/preventivi/preventivi-view.tsx");
const derived = read("lib/preventivi/use-preventivi-list-derived.ts");

assert.match(page, /prefetchGestionalePage\(qc, "preventivi"/);
assert.match(page, /PreventiviViewLazy/);
assert.match(page, /GestionaleHydrationBoundary/);
assert.match(page, /includeOrdini/);

assert.match(deferred, /prefetchDeferredPage\(qc, "preventivi"/);
assert.match(deferred, /includeOrdini/);

assert.match(bff, /fetchPreventiviPageDTOServer/);
assert.match(bff, /fetchPreventiviRecordsServer/);
assert.match(bff, /fetchPreventiviBillingStatusServer/);
assert.match(bff, /cache\(/);

const prefetchDeferred = prefetch.split("export async function prefetchDeferredPage")[1] ?? "";
const prevBlock = prefetchDeferred.split('case "preventivi":')[1]?.split('case "')[0] ?? "";
assert.match(prevBlock, /fetchPreventiviPageDTOServer/);
assert.match(prevBlock, /preventiviBillingQueryKey/);
assert.match(prevBlock, /includeOrdini/);

const layout = read("app/(gestionale)/layout.tsx");
assert.match(layout, /prefetchGestionaleLayoutSettings/);

const prefetchCritical = prefetch.split("export async function prefetchCriticalPage")[1]?.split("export async function prefetchGestionaleLayoutSettings")[0] ?? "";
assert.doesNotMatch(prefetchCritical, /prefetchSettingsPayload/);
assert.match(prefetch, /prefetchGestionaleLayoutSettings/);

assert.match(recordsHook, /ownershipScopeKey: PREVENTIVI_LIST_SCOPE/);
assert.match(recordsHook, /preventivi\.list/);

assert.match(billingHook, /preventiviBillingQueryKey/);

assert.match(view, /OrdiniFornitoriView = dynamic/);
assert.match(view, /PreventiviAdvancedFilterPanel = dynamic/);
assert.match(view, /PreventiviLogDrawer = dynamic/);
assert.match(view, /filtriEspansi \?/);
assert.match(view, /usePreventiviListDerived/);
assert.match(view, /usePreventiviRecordsQuery/);
assert.doesNotMatch(view, /lavorazioni-shared/);

assert.match(derived, /usePreventiviListDerived/);

const prevRoutes = getPrefetchRoutesForScope("preventivi.list");
assert.ok(prevRoutes.includes("/preventivi"));

console.log("preventivi-perf-policy.test.ts OK");
