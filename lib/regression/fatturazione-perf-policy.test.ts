import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { getPrefetchRoutesForScope } from "@/lib/render/query-ownership-registry";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const page = read("app/(gestionale)/fatturazione/page.tsx");
const deferred = read("components/fatturazione/fatturazione-deferred-hydration.tsx");
const bff = read("lib/bff/fatturazione-page-fetch-server.ts");
const prefetch = read("src/lib/react-query/prefetch-gestionale-page.ts");
const invoicesHook = read("src/hooks/gestionale/use-invoices-query.ts");
const openItemsHook = read("src/hooks/gestionale/use-fatturazione-open-items-query.ts");
const paymentsHook = read("src/hooks/gestionale/use-fatturazione-payments-query.ts");
const view = read("components/fatturazione/fatturazione-view.tsx");
const fattureSection = read("components/fatturazione/fatturazione-fatture-section.tsx");
const derived = read("lib/fatturazione/use-fatturazione-list-derived.ts");

assert.match(page, /prefetchCriticalPage\(qc, "fatturazione"\)/);
assert.match(page, /FatturazioneDeferredHydration/);
assert.match(page, /Suspense/);
assert.match(page, /includeOpenItems/);
assert.match(page, /includePayments/);

assert.match(deferred, /prefetchDeferredPage\(qc, "fatturazione"/);
assert.match(deferred, /includeOpenItems/);
assert.match(deferred, /includePayments/);

assert.match(bff, /fetchFatturazionePageDTOServer/);
assert.match(bff, /fetchInvoiceListPayloadServer/);
assert.match(bff, /fetchFatturazioneOpenItemsServer/);
assert.match(bff, /fetchFatturazionePaymentsServer/);
assert.match(bff, /cache\(/);

const prefetchDeferred = prefetch.split("export async function prefetchDeferredPage")[1] ?? "";
const fatBlock = prefetchDeferred.split('case "fatturazione":')[1]?.split('case "')[0] ?? "";
assert.match(fatBlock, /fetchFatturazionePageDTOServer/);
assert.match(fatBlock, /fatturazioneOpenItemsQueryKey/);
assert.match(fatBlock, /fatturazionePaymentsQueryKey/);
assert.match(fatBlock, /includeOpenItems/);
assert.match(fatBlock, /includePayments/);

assert.match(invoicesHook, /ownershipScopeKey: FATTURAZIONE_LIST_SCOPE/);
assert.match(invoicesHook, /fatturazione\.list/);

assert.match(openItemsHook, /ownershipScopeKey: FATTURAZIONE_OPEN_ITEMS_SCOPE/);
assert.match(openItemsHook, /fatturazione\.openItems/);

assert.match(paymentsHook, /ownershipScopeKey: FATTURAZIONE_PAYMENTS_SCOPE/);
assert.match(paymentsHook, /fatturazione\.payments/);

assert.match(view, /FatturazioneScadenziarioSection = dynamic/);
assert.match(view, /FatturazionePagamentiSection = dynamic/);
assert.match(view, /FatturazioneNoteCreditoSection = dynamic/);
assert.match(view, /FatturazioneDetailDrawer = dynamic/);
assert.match(view, /FatturaPaymentModal = dynamic/);
assert.match(view, /FatturazioneLogDrawer = dynamic/);
assert.match(view, /usePreventiviRecordsQuery\(wizardOpen\)/);
assert.match(view, /enabled: needDdtList/);
assert.match(view, /enabled: logOpen/);
assert.match(view, /fatturazioneOpenItemsQueryKey/);
assert.match(view, /fatturazionePaymentsQueryKey/);

assert.match(fattureSection, /FatturazioneAdvancedFilterPanel = dynamic/);
assert.match(fattureSection, /filtriEspansi \?/);
assert.match(fattureSection, /useFatturazioneListDerived/);

assert.match(derived, /buildInvoiceListContextMaps/);

const listRoutes = getPrefetchRoutesForScope("fatturazione.list");
assert.ok(listRoutes.includes("/fatturazione"));

console.log("fatturazione-perf-policy.test.ts OK");
